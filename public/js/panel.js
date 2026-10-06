import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from '/vendor/lightweight-charts.standalone.production.mjs';
import { fetchBars } from './api.js';
import { detectStructure } from './structure.js';
import { detectFVG, detectOrderBlocks, detectEqualLevels, detectSweeps, ema, vwapDaily } from './indicators.js';
import { StructurePrimitive } from './structurePrimitive.js';
import { LANG, t } from './i18n.js';

/** La estructura externa usa un `n` este número de veces mayor que la interna. */
export const EXT_FACTOR = 3;
/** Cuántas zonas/niveles recientes se dibujan como máximo (para no saturar el gráfico). */
const MAX = { fvg: 10, ob: 6, eq: 8, sweep: 12 };
const HTF_COLORS = { '1D': '#c084fc', '4H': '#22d3ee', '15m': '#a3e635' };
const LINE_COLORS = { ema50: '#93c5fd', ema200: '#e2e8f0', vwap: '#fbbf24' };

const THEME = {
  bg: '#0f131a', text: '#9aa4b2', grid: '#1b222d', border: '#232c3a',
  up: '#26a69a', down: '#ef5350',
};

/** Un panel = una temporalidad: cabecera + gráfico + estructura. */
export class Panel {
  /**
   * @param {string} tf  '1D' | '4H' | '15m' | '10m'
   * @param {HTMLElement} parent
   * @param {{onSelect:Function, onMaximize:Function, onNChange:Function, onCrosshair:Function}} hooks
   */
  constructor(tf, parent, hooks) {
    this.tf = tf;
    this.hooks = hooks;
    this.bars = [];
    this.n = 3;
    this.breakBy = 'close';
    this.show = { swings: true, structure: true };
    this.visible = true;
    this.loadedKey = null;
    this.loadedAt = 0;
    this.abort = null;
    this.result = null;
    this.ext = null;
    this.zones = [];
    this.eq = [];
    this.sweeps = [];
    this.htfLines = [];
    this.ind = new Set();
    this.needsFit = false;

    const el = (this.el = document.createElement('section'));
    el.className = 'panel';
    el.dataset.tf = tf;
    el.innerHTML = `
      <header class="panel-head">
        <button class="tf-btn" title="${t('panel.tfBtn')}"></button>
        <span class="p-symbol"></span>
        <span class="p-trend"></span>
        <span class="p-note"></span>
        <span class="grow"></span>
        <label class="n-ctl" title="${t('panel.nTitle')}">
          <span>n</span>
          <button class="step" data-d="-1" aria-label="${t('panel.less')}">−</button>
          <output class="n-val"></output>
          <button class="step" data-d="1" aria-label="${t('panel.more')}">+</button>
        </label>
        <button class="help-q" data-help="swings" title="${t('panel.nHelp')}">?</button>
      </header>
      <div class="chart"></div>
      <div class="panel-msg" hidden></div>`;
    parent.appendChild(el);

    this.tfBtn = el.querySelector('.tf-btn');
    this.symEl = el.querySelector('.p-symbol');
    this.trendEl = el.querySelector('.p-trend');
    this.noteEl = el.querySelector('.p-note');
    this.nVal = el.querySelector('.n-val');
    this.msgEl = el.querySelector('.panel-msg');
    this.tfBtn.textContent = tf;

    this.tfBtn.addEventListener('click', () => hooks.onSelect(tf));
    this.tfBtn.addEventListener('dblclick', () => hooks.onMaximize(tf));
    el.querySelectorAll('.step').forEach((b) =>
      b.addEventListener('click', () => hooks.onNChange(tf, this.n + Number(b.dataset.d))),
    );

    this.chart = createChart(el.querySelector('.chart'), {
      autoSize: true,
      layout: { background: { color: THEME.bg }, textColor: THEME.text, fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: THEME.grid }, horzLines: { color: THEME.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: THEME.border, scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: { borderColor: THEME.border, timeVisible: tf !== '1D', secondsVisible: false, rightOffset: 6 },
      localization: { locale: LANG },
    });
    this.series = this.chart.addSeries(CandlestickSeries, {
      upColor: THEME.up, downColor: THEME.down,
      wickUpColor: THEME.up, wickDownColor: THEME.down,
      borderVisible: false,
    });
    // Series opcionales (ocultas hasta que se activan en el menú de indicadores)
    const line = (color) => this.chart.addSeries(LineSeries, {
      color, lineWidth: 1.5, visible: false, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
    });
    this.ema50 = line(LINE_COLORS.ema50);
    this.ema200 = line(LINE_COLORS.ema200);
    this.vwap = line(LINE_COLORS.vwap);
    this.vol = this.chart.addSeries(HistogramSeries, {
      visible: false, priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false,
    });
    this.chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });

    this.prim = new StructurePrimitive();
    this.series.attachPrimitive(this.prim);
    this.chart.subscribeCrosshairMove((p) => hooks.onCrosshair(this, p));
    this.setN(this.n);
  }

  // ---------- estado visual ----------
  setVisible(v) {
    this.visible = v;
    this.el.hidden = !v;
    // Si los datos llegaron mientras estaba oculto, el gráfico no tenía tamaño: ajusta ahora
    if (v && this.needsFit) requestAnimationFrame(() => this.fitDefault());
  }

  fitDefault() {
    const len = this.bars.length;
    if (!len) return;
    this.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, len - 120), to: len + 6 });
    this.needsFit = false;
  }

  /** Activa/desactiva indicadores (Set de claves: fvg, ob, eq, sweep, ext, htf, ema50, ema200, vwap, vol). */
  setInd(set) {
    this.ind = new Set(set);
    this.recompute();
  }

  /** Niveles de temporalidades mayores: [{tf, high, low, brk}] */
  setHtf(info) {
    this.htfLines = info.map((h) => ({
      color: HTF_COLORS[h.tf] ?? '#ffffff',
      lines: [
        h.high !== undefined && { price: h.high, label: `${h.tf} swing high`, dash: false },
        h.low !== undefined && { price: h.low, label: `${h.tf} swing low`, dash: false },
        h.brk && { price: h.brk.level, label: `${h.tf} ${h.brk.kind} ${h.brk.dir === 'bull' ? '▲' : '▼'}`, dash: true },
      ].filter(Boolean),
    }));
    this.pushPrim();
  }

  pushPrim() {
    this.prim.update(
      {
        structure: this.result, ext: this.ext, zones: this.zones, eq: this.eq, sweeps: this.sweeps,
        htf: this.ind.has('htf') ? this.htfLines : [],
      },
      this.show,
    );
  }

  setActive(active) {
    this.el.classList.toggle('active', active);
  }

  setN(n) {
    this.n = n;
    this.nVal.textContent = n;
    this.recompute();
  }

  setOptions({ breakBy, swings, structure }) {
    if (breakBy) this.breakBy = breakBy;
    if (swings !== undefined) this.show.swings = swings;
    if (structure !== undefined) this.show.structure = structure;
    this.recompute();
  }

  setSymbolLabel(text) {
    this.symEl.textContent = text;
  }

  setMessage(text, { error = false, retry = null } = {}) {
    if (!text) { this.msgEl.hidden = true; return; }
    this.msgEl.hidden = false;
    this.msgEl.className = 'panel-msg' + (error ? ' error' : '');
    this.msgEl.textContent = text;
    if (retry) {
      const b = document.createElement('button');
      b.textContent = t('panel.retry');
      b.addEventListener('click', retry);
      this.msgEl.append(document.createElement('br'), b);
    }
  }

  // ---------- datos ----------
  clearData() {
    this.bars = [];
    this.series.setData([]);
    for (const x of [this.ema50, this.ema200, this.vwap, this.vol]) x.setData([]);
    this.result = this.ext = null;
    this.zones = []; this.eq = []; this.sweeps = [];
    this.noteEl.textContent = '';
    this.prim.update(null);
    this.trendEl.textContent = '';
    this.loadedKey = null;
  }

  /** Forex necesita 5 decimales (3 en pares con JPY); el resto, 2. */
  setPriceFormat(contract) {
    const fx = contract.secType === 'CASH';
    const jpy = fx && (contract.symbol === 'JPY' || contract.currency === 'JPY');
    const precision = fx ? (jpy ? 3 : 5) : 2;
    this.series.applyOptions({ priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision } });
  }

  /** Carga (o refresca) las velas. `force` ignora el tiempo mínimo entre refrescos. */
  async load(contract, { force = false } = {}) {
    this.setPriceFormat(contract);
    const key = contract.conId;
    const isNew = this.loadedKey !== key;
    if (!force && !isNew && Date.now() - this.loadedAt < 15000) return;

    this.abort?.abort();
    const ctrl = (this.abort = new AbortController());
    if (isNew) {
      this.clearData();
      this.setMessage(t('panel.loading'));
    }
    try {
      const bars = await fetchBars(contract, this.tf, ctrl.signal);
      if (ctrl.signal.aborted) return;
      this.applyBars(bars, isNew);
      this.loadedKey = key;
      this.loadedAt = Date.now();
      this.setMessage(bars.length ? '' : t('panel.noBars'), { error: !bars.length });
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (isNew || !this.bars.length) this.setMessage(e.message, { error: true, retry: () => this.load(contract, { force: true }) });
      else this.trendEl.title = t('panel.refreshFailed', { msg: e.message });
    }
  }

  applyBars(bars, isNew) {
    const lastOld = this.bars.length ? this.bars[this.bars.length - 1].time : null;
    const canPatch = !isNew && lastOld !== null && bars.some((b) => b.time === lastOld);
    this.bars = bars;
    if (canPatch) {
      // Refresco incremental: no mueve el zoom ni la posición del usuario
      for (const b of bars) if (b.time >= lastOld) this.series.update(b);
    } else {
      this.series.setData(bars);
      if (this.visible) this.fitDefault(); else this.needsFit = true;
    }
    this.recompute();
  }

  recompute() {
    if (!this.bars.length) return;
    const { bars, n, breakBy, ind } = this;
    this.result = detectStructure(bars, { n, breakBy });
    this.ext = ind.has('ext') ? detectStructure(bars, { n: n * EXT_FACTOR, breakBy }) : null;

    this.zones = [];
    if (ind.has('fvg')) this.zones.push(...detectFVG(bars).filter((z) => z.mitigatedIndex === null).slice(-MAX.fvg));
    if (ind.has('ob')) this.zones.push(...detectOrderBlocks(bars, this.result.breaks).filter((z) => z.mitigatedIndex === null).slice(-MAX.ob));
    this.eq = ind.has('eq') ? detectEqualLevels(bars, this.result.pivots).slice(-MAX.eq) : [];
    this.sweeps = ind.has('sweep') ? detectSweeps(bars, this.result.pivots).slice(-MAX.sweep) : [];

    this.updateSeries();
    this.pushPrim();

    const last = this.result.breaks[this.result.breaks.length - 1];
    if (!this.result.trend) {
      this.trendEl.textContent = t('panel.noTrend');
      this.trendEl.className = 'p-trend';
    } else {
      const up = this.result.trend === 'bull';
      this.trendEl.textContent = `${t(up ? 'panel.bull' : 'panel.bear')} · ${t('panel.last', { kind: last.kind })}`;
      this.trendEl.className = 'p-trend ' + (up ? 'up' : 'down');
    }
    this.trendEl.title = '';
    this.hooks.onUpdate?.(this);
  }

  /** EMA / VWAP / volumen: solo se calculan si están activos. */
  updateSeries() {
    const { bars, ind } = this;
    const on = (k) => ind.has(k);
    const pts = (arr) => arr.map((p) => ({ time: p.time, value: p.value }));
    this.ema50.applyOptions({ visible: on('ema50') });
    this.ema50.setData(on('ema50') ? pts(ema(bars, 50)) : []);
    this.ema200.applyOptions({ visible: on('ema200') });
    this.ema200.setData(on('ema200') ? pts(ema(bars, 200)) : []);
    this.vwap.applyOptions({ visible: on('vwap') });
    this.vwap.setData(on('vwap') && this.tf !== '1D' ? pts(vwapDaily(bars)) : []);
    this.vol.applyOptions({ visible: on('vol') });
    this.vol.setData(
      on('vol')
        ? bars.map((b) => ({ time: b.time, value: b.volume || 0, color: b.close >= b.open ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)' }))
        : [],
    );
    const hasVolume = bars.some((b) => b.volume > 0);
    const notes = [];
    if ((on('vol') || on('vwap')) && !hasVolume) notes.push(t('panel.noVolume'));
    else if (on('vwap') && this.tf === '1D') notes.push(t('panel.vwap1D'));
    if (on('ema200') && bars.length < 200) notes.push(t('panel.ema200', { n: bars.length }));
    this.noteEl.textContent = notes.join(' · ');
  }

  // ---------- cursor sincronizado ----------
  barAtOrBefore(time) {
    const b = this.bars;
    let lo = 0, hi = b.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (b[mid].time <= time) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans >= 0 ? b[ans] : null;
  }
}
