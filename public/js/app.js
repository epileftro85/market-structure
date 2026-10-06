import { Panel, EXT_FACTOR } from './panel.js';
import { searchSymbols, getStatus, displayName } from './api.js';
import { readFavs, isFav, toggleFav, removeFav } from './favorites.js';
import { LANG, t, setLang, translateDom } from './i18n.js';
import { HELP as HELP_ES, GROUPS, GROUP_TITLES, DIAGRAMS, helpKeyFor } from './help.js';
import { HELP as HELP_EN } from './help.en.js';
import { EXAMPLES as EXAMPLES_ES } from './examples.js';
import { EXAMPLES as EXAMPLES_EN } from './examples.en.js';

// Contenido de la guía en el idioma activo (ver i18n.js)
const HELP = LANG === 'en' ? HELP_EN : HELP_ES;
const EXAMPLES = LANG === 'en' ? EXAMPLES_EN : EXAMPLES_ES;

const TFS = ['1D', '4H', '15m', '10m'];
const LAYOUTS = [4, 2, 1];
const $ = (id) => document.getElementById(id);

translateDom();
$('langSel').value = LANG;
$('langSel').addEventListener('change', (e) => setLang(e.target.value));

// ---------------------------------------------------------------------------
// Estado de ESTA pestaña. Vive en la URL: duplicar la pestaña copia la vista
// completa y cada pestaña puede después cambiar de símbolo por su cuenta.
// ---------------------------------------------------------------------------
const IND_KEYS = ['fvg', 'ob', 'eq', 'sweep', 'ext', 'htf', 'ema50', 'ema200', 'vwap', 'vol'];
const IND_COOKIE = 'ms_ind';

function readIndCookie() {
  try {
    const row = document.cookie.split('; ').find((r) => r.startsWith(IND_COOKIE + '='));
    return row ? decodeURIComponent(row.slice(IND_COOKIE.length + 1)).split(',') : [];
  } catch { return []; }
}
const parseInd = (list) => new Set(list.filter((k) => IND_KEYS.includes(k)));

const state = readUrl();

function readUrl() {
  const q = new URLSearchParams(location.search);
  const clamp = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
  const contract = q.get('conId')
    ? {
        conId: Number(q.get('conId')), symbol: q.get('symbol') || '', secType: q.get('sec') || 'STK',
        exchange: q.get('ex') || '', currency: q.get('cur') || 'USD', name: q.get('name') || '',
      }
    : null;
  const layout = Number(q.get('layout'));
  const sel = (q.get('sel') || '').split(',').filter((t) => TFS.includes(t));
  const nList = (q.get('n') || '').split(',').map((x) => parseInt(x, 10));
  return {
    contract,
    layout: LAYOUTS.includes(layout) ? layout : 4,
    sel: sel.length ? sel.slice(0, 2) : ['15m', '4H'], // las 2 más recientes que eligió el usuario
    n: TFS.map((_, i) => clamp(nList[i], 1, 20, 3)),
    brk: q.get('brk') === 'wick' ? 'wick' : 'close',
    sw: q.get('sw') !== '0',
    st: q.get('st') !== '0',
    // Indicadores: la URL manda (para que "duplicar pestaña" copie la vista); si no, el último uso (cookie)
    ind: parseInd(q.has('ind') ? (q.get('ind') || '').split(',') : readIndCookie()),
  };
}

function urlFor(s, contractOverride) {
  const q = new URLSearchParams();
  const c = contractOverride ?? s.contract;
  if (c) {
    q.set('symbol', c.symbol); q.set('conId', c.conId); q.set('sec', c.secType);
    q.set('ex', c.exchange || ''); q.set('cur', c.currency || ''); if (c.name) q.set('name', c.name.slice(0, 40));
  }
  q.set('layout', s.layout);
  q.set('sel', s.sel.join(','));
  q.set('n', s.n.join(','));
  q.set('brk', s.brk);
  if (!s.sw) q.set('sw', '0');
  if (!s.st) q.set('st', '0');
  q.set('ind', [...s.ind].join(','));
  return `${location.pathname}?${q}`;
}

function persist() {
  history.replaceState(null, '', urlFor(state));
  document.cookie = `${IND_COOKIE}=${encodeURIComponent([...state.ind].join(','))}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  document.title = state.contract ? t('app.titleWith', { symbol: displayName(state.contract) }) : t('app.title');
}

function openInNewTab(contract) {
  window.open(urlFor(state, contract), '_blank', 'noopener');
}

// ---------------------------------------------------------------------------
// Paneles y layout
// ---------------------------------------------------------------------------
const grid = $('grid');
let syncing = false;

const panels = TFS.map(
  (tf, i) => {
    const p = new Panel(tf, grid, {
      onSelect: select,
      onMaximize: (t) => { select(t); setLayout(1); },
      onNChange: (t, n) => {
        const idx = TFS.indexOf(t);
        state.n[idx] = Math.min(20, Math.max(1, n));
        panels[idx].setN(state.n[idx]);
        persist();
      },
      onCrosshair: syncCrosshair,
      onUpdate: refreshHtf,
    });
    p.setN(state.n[i]);
    p.setInd(state.ind);
    return p;
  },
);

/** Qué temporalidades se ven según el layout. En 4 se ven todas. */
function shownTfs() {
  if (state.layout === 4) return TFS;
  return TFS.filter((t) => state.sel.slice(0, state.layout).includes(t));
}

function select(tf) {
  state.sel = [tf, ...state.sel.filter((t) => t !== tf)].slice(0, 2);
  applyLayout();
}

function setLayout(n) {
  state.layout = n;
  applyLayout();
}

function applyLayout() {
  const shown = shownTfs();
  grid.dataset.layout = state.layout;
  panels.forEach((p) => {
    p.setVisible(shown.includes(p.tf));
    p.setActive(state.sel[0] === p.tf);
  });
  $('layoutBtn').textContent = t('layout.label', { n: state.layout });
  renderChips(shown);
  persist();
  loadVisible();
}

function renderChips(shown) {
  const box = $('tfChips');
  box.replaceChildren();
  for (const tf of TFS) {
    const b = document.createElement('button');
    b.className = 'chip' + (shown.includes(tf) ? ' on' : '');
    b.textContent = tf;
    b.title = t('tf.show', { tf });
    b.addEventListener('click', () => select(tf));
    box.appendChild(b);
  }
}

$('layoutBtn').addEventListener('click', () => {
  setLayout(LAYOUTS[(LAYOUTS.indexOf(state.layout) + 1) % LAYOUTS.length]);
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'l' || e.key === 'L') $('layoutBtn').click();
});

// Cursor sincronizado: misma hora en todos los gráficos visibles
function syncCrosshair(source, param) {
  if (syncing) return;
  syncing = true;
  try {
    for (const p of panels) {
      if (p === source || !p.visible) continue;
      const bar = param.time !== undefined ? p.barAtOrBefore(param.time) : null;
      if (bar) p.chart.setCrosshairPosition(bar.close, bar.time, p.series);
      else p.chart.clearCrosshairPosition();
    }
  } finally {
    syncing = false;
  }
}

// ---------------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------------
/** Paneles que hay que mantener cargados: los visibles y, con "niveles de TF mayor", las TF por encima. */
function neededTfs() {
  const shown = shownTfs();
  if (!state.ind.has('htf')) return shown;
  const lowest = Math.max(...shown.map((t) => TFS.indexOf(t)));
  return TFS.filter((t, i) => shown.includes(t) || i < lowest);
}

function loadVisible({ force = false } = {}) {
  if (!state.contract) return;
  const need = neededTfs();
  for (const p of panels) if (need.includes(p.tf)) p.load(state.contract, { force });
}

/** Cada panel dibuja los swings/rupturas vigentes de las temporalidades mayores que él. */
function refreshHtf() {
  panels.forEach((p, k) => {
    const info = panels
      .slice(0, k)
      .filter((h) => h.result)
      .map((h) => ({
        tf: h.tf, high: h.result.active.high?.price, low: h.result.active.low?.price,
        brk: h.result.breaks[h.result.breaks.length - 1],
      }));
    p.setHtf(info);
  });
}

function setContract(c) {
  state.contract = c;
  const label = displayName(c);
  panels.forEach((p) => { p.clearData(); p.setSymbolLabel(label); p.setMessage(''); });
  renderCurrent();
  persist();
  loadVisible({ force: true });
}

function renderCurrent() {
  const c = state.contract;
  $('curSymbol').textContent = c ? displayName(c) : '—';
  $('curName').textContent = c ? [c.name, c.exchange].filter(Boolean).join(' · ') : '';
  $('favBtn').disabled = !c;
  const fav = isFav(c);
  $('favBtn').textContent = fav ? '★' : '☆';
  $('favBtn').classList.toggle('on', fav);
  renderFavBar();
}

// ---------------------------------------------------------------------------
// Opciones
// ---------------------------------------------------------------------------
$('swChk').checked = state.sw;
$('stChk').checked = state.st;
$('brkSel').value = state.brk;
panels.forEach((p) => p.setOptions({ breakBy: state.brk, swings: state.sw, structure: state.st }));

$('swChk').addEventListener('change', (e) => { state.sw = e.target.checked; panels.forEach((p) => p.setOptions({ swings: state.sw })); persist(); syncControls(); });
$('stChk').addEventListener('change', (e) => { state.st = e.target.checked; panels.forEach((p) => p.setOptions({ structure: state.st })); persist(); syncControls(); });
$('brkSel').addEventListener('change', (e) => { state.brk = e.target.value; panels.forEach((p) => p.setOptions({ breakBy: state.brk })); persist(); });
$('refreshBtn').addEventListener('click', () => loadVisible({ force: true }));
$('dupBtn').addEventListener('click', () => window.open(location.href, '_blank', 'noopener'));

let autoTimer = null;
function setAuto(on) {
  clearInterval(autoTimer);
  if (on) autoTimer = setInterval(() => { if (!document.hidden) loadVisible({ force: true }); }, 60000);
}
$('autoChk').addEventListener('change', (e) => setAuto(e.target.checked));
setAuto(true);

// ---------------------------------------------------------------------------
// Menú de indicadores (todos opcionales y apagados por defecto)
// ---------------------------------------------------------------------------
const IND_GROUPS = [
  { title: t('ind.g.zones'), items: [
    ['fvg', 'FVG', t('ind.fvg.tip'), '#2ebd85'],
    ['ob', 'Order Blocks', t('ind.ob.tip'), '#2ebd85'],
  ] },
  { title: t('ind.g.liquidity'), items: [
    ['eq', 'EQH / EQL', t('ind.eq.tip'), '#94a3b8'],
    ['sweep', 'Sweeps', t('ind.sweep.tip'), '#f472b6'],
  ] },
  { title: t('ind.g.structure'), items: [
    ['ext', t('ind.ext.label', { f: EXT_FACTOR }), t('ind.ext.tip', { f: EXT_FACTOR }), '#f5a524'],
    ['htf', t('ind.htf.label'), t('ind.htf.tip'), '#c084fc'],
  ] },
  { title: t('ind.g.context'), items: [
    ['ema50', 'EMA 50', null, '#93c5fd'],
    ['ema200', 'EMA 200', null, '#e2e8f0'],
    ['vwap', t('ind.vwap.label'), t('ind.vwap.tip'), '#fbbf24'],
    ['vol', t('ind.vol.label'), t('ind.vol.tip'), '#26a69a'],
  ] },
];

function renderIndMenu() {
  const menu = $('indMenu');
  menu.replaceChildren();
  for (const g of IND_GROUPS) {
    const h = document.createElement('div');
    h.className = 'menu-title';
    h.textContent = g.title;
    menu.appendChild(h);
    for (const [key, label, tip, color] of g.items) {
      const row = document.createElement('label');
      row.className = 'menu-row';
      if (tip) row.title = tip;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.ind.has(key);
      cb.dataset.ind = key;
      cb.addEventListener('change', () => toggleInd(key, cb.checked));
      const sw = document.createElement('i');
      sw.className = 'swatch';
      sw.style.background = color;
      const name = document.createElement('span');
      name.textContent = label;
      const q = document.createElement('button');
      q.type = 'button';
      q.className = 'help-q';
      q.dataset.help = helpKeyFor(key);
      q.title = t('ind.helpFor', { label });
      q.textContent = '?';
      row.append(cb, sw, name, q);
      menu.appendChild(row);
    }
  }
  const clear = document.createElement('button');
  clear.className = 'btn menu-clear';
  clear.textContent = t('ind.clear');
  clear.addEventListener('click', () => {
    state.ind.clear();
    applyInd(); // applyInd sincroniza todas las casillas sin re-dibujar: el menú sigue abierto
  });
  menu.appendChild(clear);
}

function toggleInd(key, on) {
  if (on) state.ind.add(key); else state.ind.delete(key);
  applyInd();
}

function applyInd() {
  panels.forEach((p) => p.setInd(state.ind));
  syncControls();
  renderIndBtn();
  persist();
  loadVisible(); // por si "niveles de TF mayor" necesita cargar paneles ocultos
}

$('indBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('indMenu').hidden = !$('indMenu').hidden;
});
document.addEventListener('click', (e) => { if (!e.target.closest('.menu-wrap')) $('indMenu').hidden = true; });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('help').hidden) closeHelp();
  else $('indMenu').hidden = true;
});
function renderIndBtn() {
  $('indBtn').textContent = `${t('ind.button')}${state.ind.size ? ` (${state.ind.size})` : ''} ▾`;
}
renderIndMenu();
renderIndBtn();


// ---------------------------------------------------------------------------
// Guía contextual (botones "?"): panel lateral con qué es, cómo leerlo y cómo lo calcula la app
// ---------------------------------------------------------------------------
function getToggle(k) {
  return k === '@sw' ? state.sw : k === '@st' ? state.st : state.ind.has(k);
}

function setToggle(k, on) {
  if (k === '@sw' || k === '@st') {
    const box = $(k === '@sw' ? 'swChk' : 'stChk');
    box.checked = on;
    box.dispatchEvent(new Event('change')); // reutiliza el manejador de la barra superior
  } else {
    toggleInd(k, on);
  }
}

/** Mantiene sincronizadas todas las casillas: menú, guía y barra superior. */
function syncControls() {
  document.querySelectorAll('input[data-ind]').forEach((i) => { i.checked = state.ind.has(i.dataset.ind); });
  document.querySelectorAll('input[data-toggle]').forEach((i) => { i.checked = getToggle(i.dataset.toggle); });
  $('swChk').checked = state.sw;
  $('stChk').checked = state.st;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function section(h, text) {
  const frag = document.createDocumentFragment();
  frag.appendChild(el('h4', null, h));
  if (Array.isArray(text)) {
    const ul = el('ul');
    text.forEach((t) => ul.appendChild(el('li', null, t)));
    frag.appendChild(ul);
  } else {
    frag.appendChild(el('p', null, text));
  }
  return frag;
}

function buildExample(ex) {
  const box = el('div', 'help-example');
  box.appendChild(el('h4', 'ex-h', t('ex.heading')));
  box.appendChild(el('div', 'ex-title', ex.title));
  box.appendChild(el('p', 'ex-scenario', ex.scenario));

  for (const d of ex.diagrams ?? []) {
    const fig = el('figure', 'help-diagram');
    const holder = el('div');
    holder.innerHTML = DIAGRAMS[d.key](LANG); // SVG propio y estático
    fig.append(holder, el('figcaption', null, d.caption));
    box.appendChild(fig);
  }

  if (ex.steps?.length) {
    box.appendChild(el('h5', null, t('ex.steps')));
    const ol = el('ol', 'ex-steps');
    ex.steps.forEach((t) => ol.appendChild(el('li', null, t)));
    box.appendChild(ol);
  }

  if (ex.outcomes?.length) {
    box.appendChild(el('h5', null, t('ex.outcomes')));
    for (const o of ex.outcomes) {
      const card = el('div', 'ex-card');
      card.appendChild(el('div', 'ex-card-title', o.title));
      for (const [label, text] of [[t('ex.when'), o.when], [t('ex.means'), o.means], [t('ex.check'), o.check]]) {
        const row = el('p');
        row.append(el('b', null, `${label}: `), document.createTextNode(text));
        card.appendChild(row);
      }
      box.appendChild(card);
    }
  }

  if (ex.measure?.length) {
    box.appendChild(el('h5', null, t('ex.measure')));
    const ul = el('ul');
    ex.measure.forEach((t) => ul.appendChild(el('li', null, t)));
    box.appendChild(ul);
  }

  if (ex.mistakes?.length) {
    box.appendChild(el('h5', null, t('ex.mistakes')));
    const ul = el('ul', 'ex-mistakes');
    ex.mistakes.forEach((t) => ul.appendChild(el('li', null, t)));
    box.appendChild(ul);
  }

  box.appendChild(el('p', 'ex-note', t('ex.note')));
  return box;
}

function buildHelp() {
  const root = $('help');
  const head = el('header', 'help-head');
  head.append(el('strong', null, t('guide.title')));
  const x = el('button', 'icon-btn', '×');
  x.id = 'helpClose';
  x.title = t('guide.close');
  x.addEventListener('click', closeHelp);
  head.appendChild(x);

  const scroll = el('div', 'help-scroll');
  scroll.appendChild(el('p', 'help-intro', t('guide.intro')));

  const idx = el('nav', 'help-index');
  HELP.forEach((h) => {
    const b = el('button', 'chip', h.title.split(' · ')[0].split(' (')[0]);
    b.dataset.help = h.key;
    idx.appendChild(b);
  });
  scroll.appendChild(idx);

  for (const group of GROUPS) {
    const entries = HELP.filter((h) => h.group === group);
    if (!entries.length) continue;
    scroll.appendChild(el('div', 'help-group', GROUP_TITLES[LANG][group]));
    for (const h of entries) {
      const sec = el('section', 'help-sec');
      sec.id = `help-${h.key}`;
      const title = el('h3');
      const sw = el('i', 'swatch');
      sw.style.background = h.color;
      title.append(sw, document.createTextNode(h.title));
      sec.appendChild(title);
      if (h.diagram) {
        const d = el('div', 'help-diagram');
        d.innerHTML = DIAGRAMS[h.diagram](LANG); // SVG propio y estático (sin datos externos)
        sec.appendChild(d);
      }
      if (h.toggles?.length) {
        const row = el('div', 'help-toggles');
        for (const t of h.toggles) {
          const lab = el('label', 'chk');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.toggle = t.k;
          cb.addEventListener('change', () => setToggle(t.k, cb.checked));
          lab.append(cb, document.createTextNode(` ${t.label}`));
          row.appendChild(lab);
        }
        sec.appendChild(row);
      }
      sec.append(
        section(t('guide.what'), h.what),
        section(t('guide.read'), h.read),
        section(t('guide.rules'), h.rules),
        section(t('guide.practice'), h.practice),
      );
      if (EXAMPLES[h.key]) sec.appendChild(buildExample(EXAMPLES[h.key]));
      const caveat = el('div', 'help-caveat');
      caveat.append(el('strong', null, t('guide.caveat')), document.createTextNode(h.caveat));
      sec.appendChild(caveat);
      scroll.appendChild(sec);
    }
  }
  root.replaceChildren(head, scroll);
}

function openHelp(key) {
  $('indMenu').hidden = true;
  $('help').hidden = false;
  document.body.classList.add('help-open');
  syncControls();
  const scroller = $('help').querySelector('.help-scroll');
  const sec = key ? $(`help-${key}`) : null;
  if (!sec) { scroller.scrollTo({ top: 0 }); return; }
  scroller.scrollTo({ top: sec.offsetTop - 8, behavior: 'smooth' });
  sec.classList.remove('flash');
  void sec.offsetWidth; // reinicia la animación si ya estaba resaltada
  sec.classList.add('flash');
}

function closeHelp() {
  $('help').hidden = true;
  document.body.classList.remove('help-open');
}

// Cualquier elemento con data-help abre la guía en esa entrada (menú, barra superior, cabeceras de panel)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-help]');
  if (!b) return;
  e.preventDefault();
  e.stopPropagation();
  openHelp(b.dataset.help || null);
});
buildHelp();

// ---------------------------------------------------------------------------
// Favoritos (cookie)
// ---------------------------------------------------------------------------
$('favBtn').addEventListener('click', () => {
  if (!state.contract) return;
  const added = toggleFav(state.contract);
  toast(t(added ? 'fav.added' : 'fav.removed', { symbol: displayName(state.contract) }));
  renderCurrent();
});

function renderFavBar() {
  const bar = $('favBar');
  const favs = readFavs();
  bar.replaceChildren();
  bar.hidden = favs.length === 0;
  for (const f of favs) {
    const chip = document.createElement('span');
    chip.className = 'fav' + (state.contract?.conId === f.conId ? ' on' : '');
    const main = document.createElement('button');
    main.className = 'fav-main';
    main.textContent = displayName(f);
    main.title = t('fav.chipTitle', { name: f.name || f.symbol, exchange: f.exchange });
    main.addEventListener('click', (e) => (e.metaKey || e.ctrlKey ? openInNewTab(f) : setContract(f)));
    const out = document.createElement('button');
    out.className = 'fav-x';
    out.textContent = '↗';
    out.title = t('fav.newTab');
    out.addEventListener('click', () => openInNewTab(f));
    const del = document.createElement('button');
    del.className = 'fav-x';
    del.textContent = '×';
    del.title = t('fav.remove');
    del.addEventListener('click', () => { removeFav(f.conId); renderCurrent(); });
    chip.append(main, out, del);
    bar.appendChild(chip);
  }
}
// La cookie es compartida: si otra pestaña cambió los favoritos, nos ponemos al día
window.addEventListener('focus', renderCurrent);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderCurrent(); });

// ---------------------------------------------------------------------------
// Buscador de símbolos (IB: reqMatchingSymbols)
// ---------------------------------------------------------------------------
const qInput = $('q');
const list = $('results');
let searchAbort = null;
let searchTimer = null;
let items = [];
let cursor = -1;

function closeResults() { list.hidden = true; cursor = -1; }

function renderResults(results, note) {
  items = results;
  cursor = results.length ? 0 : -1;
  list.replaceChildren();
  if (note) {
    const li = document.createElement('li');
    li.className = 'note';
    li.textContent = note;
    list.appendChild(li);
  }
  results.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = 'result' + (i === cursor ? ' cur' : '');
    const sym = document.createElement('strong');
    sym.textContent = displayName(r);
    const name = document.createElement('span');
    name.className = 'r-name';
    name.textContent = r.name;
    const meta = document.createElement('span');
    meta.className = 'r-meta';
    meta.textContent = [r.secType, r.exchange, r.currency].filter(Boolean).join(' · ');
    const star = document.createElement('button');
    star.className = 'icon-btn small' + (isFav(r) ? ' on' : '');
    star.textContent = isFav(r) ? '★' : '☆';
    star.title = t('fav.star');
    star.addEventListener('mousedown', (e) => e.preventDefault());
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      const added = toggleFav(r);
      star.textContent = added ? '★' : '☆';
      star.classList.toggle('on', added);
      renderCurrent();
    });
    li.append(sym, name, meta, star);
    li.addEventListener('mousedown', (e) => e.preventDefault()); // no pierde foco antes del clic
    li.addEventListener('click', (e) => choose(r, e.metaKey || e.ctrlKey));
    list.appendChild(li);
  });
  list.hidden = !(results.length || note);
}

function choose(r, newTab) {
  closeResults();
  qInput.value = '';
  qInput.blur();
  if (newTab) openInNewTab(r);
  else setContract(r);
}

function highlight() {
  [...list.querySelectorAll('.result')].forEach((li, i) => li.classList.toggle('cur', i === cursor));
  list.querySelector('.result.cur')?.scrollIntoView({ block: 'nearest' });
}

qInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = qInput.value.trim();
  if (!q) { closeResults(); return; }
  searchTimer = setTimeout(async () => {
    searchAbort?.abort();
    searchAbort = new AbortController();
    try {
      const results = await searchSymbols(q, searchAbort.signal);
      renderResults(results, results.length ? '' : t('search.none'));
    } catch (e) {
      if (e.name !== 'AbortError') renderResults([], e.message);
    }
  }, 250);
});

qInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(items.length - 1, cursor + 1); highlight(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(0, cursor - 1); highlight(); }
  else if (e.key === 'Enter' && items[cursor]) choose(items[cursor], e.metaKey || e.ctrlKey);
  else if (e.key === 'Escape') { closeResults(); qInput.blur(); }
});
qInput.addEventListener('blur', () => setTimeout(closeResults, 120));
qInput.addEventListener('focus', () => { if (items.length && qInput.value) list.hidden = false; });

// ---------------------------------------------------------------------------
// Estado de la conexión con IB
// ---------------------------------------------------------------------------
let wasConnected = null;
async function pollStatus() {
  const dot = $('statusDot');
  try {
    const s = await getStatus();
    dot.className = 'dot ' + (s.mock ? 'mock' : s.connected ? 'ok' : 'bad');
    dot.title = s.mock
      ? t('status.mock')
      : s.connected ? t('status.connected', s) : t('status.disconnected', s) + (s.lastError ? ' · ' + s.lastError : '');
    if (s.connected && wasConnected === false) loadVisible({ force: true }); // IB volvió: reintenta
    wasConnected = s.connected;
  } catch {
    dot.className = 'dot bad';
    dot.title = t('status.noServer');
    wasConnected = false;
  }
}
setInterval(pollStatus, 5000);

// ---------------------------------------------------------------------------
let toastTimer;
function toast(msg) {
  const box = $('toast');
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.hidden = true), 2200);
}

// Arranque
(async function init() {
  const label = state.contract ? displayName(state.contract) : '';
  panels.forEach((p) => p.setSymbolLabel(label));
  renderCurrent();
  applyLayout();
  await pollStatus();
  if (!state.contract) {
    panels.forEach((p) => p.setMessage(t('app.start')));
    qInput.focus();
  }
})();
