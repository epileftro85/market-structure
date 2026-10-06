// Indicadores adicionales. Módulo PURO (velas entran, datos salen), probado con `npm test`.
//
// Formato de velas: { time, open, high, low, close, volume? }
// Todas las funciones devuelven índices además de tiempos, para poder dibujar y probar fácil.

/** ATR (promedio simple del True Range, con ventana creciente al inicio). */
export function atr(bars, period = 14) {
  const out = new Array(bars.length).fill(0);
  const tr = bars.map((b, i) =>
    i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)),
  );
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += tr[i];
    if (i >= period) sum -= tr[i - period];
    out[i] = sum / Math.min(i + 1, period);
  }
  return out;
}

/** EMA sembrada con la SMA de las primeras `period` velas. Devuelve [{time, value}]. */
export function ema(bars, period) {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += bars[i].close;
  prev /= period;
  const out = [{ time: bars[period - 1].time, value: prev }];
  for (let i = period; i < bars.length; i++) {
    prev = bars[i].close * k + prev * (1 - k);
    out.push({ time: bars[i].time, value: prev });
  }
  return out;
}

/**
 * VWAP que se reinicia cada día (el `time` ya viene en hora de la bolsa, así que el día = floor(time/86400)).
 * Sin volumen (p. ej. forex con MIDPOINT) devuelve [] en vez de inventar un valor.
 */
export function vwapDaily(bars) {
  const out = [];
  let day = null, pv = 0, vol = 0;
  for (const b of bars) {
    const d = Math.floor(b.time / 86400);
    if (d !== day) { day = d; pv = 0; vol = 0; }
    const v = b.volume || 0;
    pv += ((b.high + b.low + b.close) / 3) * v;
    vol += v;
    if (vol > 0) out.push({ time: b.time, value: pv / vol });
  }
  return out;
}

/**
 * Fair Value Gaps: hueco de 3 velas que el precio no cubrió.
 *  alcista: low[i] > high[i-2]  → zona [high[i-2], low[i]]
 *  bajista: high[i] < low[i-2]  → zona [high[i], low[i-2]]
 * Se considera "llenado" cuando una vela posterior cruza por completo la zona.
 * @param {{minAtr?:number, atrPeriod?:number}} [opts] minAtr: tamaño mínimo del hueco en múltiplos de ATR
 */
export function detectFVG(bars, opts = {}) {
  const minAtr = opts.minAtr ?? 0.25;
  const a = atr(bars, opts.atrPeriod ?? 14);
  const out = [];
  for (let i = 2; i < bars.length; i++) {
    const A = bars[i - 2], C = bars[i];
    let zone = null;
    if (C.low > A.high && C.low - A.high >= minAtr * a[i]) zone = { dir: 'bull', bottom: A.high, top: C.low };
    else if (C.high < A.low && A.low - C.high >= minAtr * a[i]) zone = { dir: 'bear', bottom: C.high, top: A.low };
    if (!zone) continue;
    let mitigatedIndex = null;
    for (let j = i + 1; j < bars.length; j++) {
      if (zone.dir === 'bull' ? bars[j].low <= zone.bottom : bars[j].high >= zone.top) { mitigatedIndex = j; break; }
    }
    out.push({ ...zone, kind: 'fvg', index: i - 1, time: bars[i - 1].time, mitigatedIndex });
  }
  return out;
}

/**
 * Order Blocks a partir de las rupturas de estructura (BOS/CHoCH).
 *  ruptura alcista: entre el swing roto y la ruptura se toma el mínimo; el OB es la última
 *                   vela bajista en (o hasta 2 velas antes de) ese mínimo.
 *  ruptura bajista: simétrico con el máximo y la última vela alcista.
 * La zona es el rango completo de esa vela. Queda "mitigado" cuando una vela posterior CIERRA al otro lado.
 */
export function detectOrderBlocks(bars, breaks) {
  const out = [];
  const seen = new Set();
  for (const br of breaks) {
    const bull = br.dir === 'bull';
    let ext = br.fromIndex;
    for (let k = br.fromIndex; k <= br.index; k++) {
      if (bull ? bars[k].low < bars[ext].low : bars[k].high > bars[ext].high) ext = k;
    }
    let idx = ext;
    for (let k = ext; k >= Math.max(br.fromIndex, ext - 2); k--) {
      if (bull ? bars[k].close < bars[k].open : bars[k].close > bars[k].open) { idx = k; break; }
    }
    const key = `${br.dir}:${idx}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const b = bars[idx];
    let mitigatedIndex = null;
    for (let j = br.index + 1; j < bars.length; j++) {
      if (bull ? bars[j].close < b.low : bars[j].close > b.high) { mitigatedIndex = j; break; }
    }
    out.push({
      kind: 'ob', dir: br.dir, top: b.high, bottom: b.low, index: idx, time: b.time,
      breakIndex: br.index, breakKind: br.kind, mitigatedIndex,
    });
  }
  return out;
}

/**
 * Máximos/mínimos casi iguales (EQH/EQL): dos swings consecutivos del mismo tipo a una distancia
 * menor que `tol` (por defecto 0.1 × ATR). Ahí se acumulan stops, es "liquidez".
 * Cada nivel dice cómo terminó: `sweptIndex` (la mecha lo pasó y el cierre volvió) o
 * `brokenIndex` (cerró más allá). Si ambos son null, sigue vivo.
 */
export function detectEqualLevels(bars, pivots, opts = {}) {
  const a = atr(bars, opts.atrPeriod ?? 14);
  const tolAtr = opts.tolAtr ?? 0.1;
  const out = [];
  for (const type of ['high', 'low']) {
    const list = pivots.filter((p) => p.type === type);
    for (let k = 1; k < list.length; k++) {
      const p0 = list[k - 1], p1 = list[k];
      const tol = opts.tol ?? tolAtr * a[p1.confirmedIndex];
      if (Math.abs(p0.price - p1.price) > tol) continue;
      const isHigh = type === 'high';
      const level = isHigh ? Math.max(p0.price, p1.price) : Math.min(p0.price, p1.price);
      let sweptIndex = null, brokenIndex = null;
      for (let j = p1.confirmedIndex + 1; j < bars.length; j++) {
        const pierced = isHigh ? bars[j].high > level : bars[j].low < level;
        if (!pierced) continue;
        const closedBeyond = isHigh ? bars[j].close > level : bars[j].close < level;
        if (closedBeyond) brokenIndex = j; else sweptIndex = j;
        break;
      }
      out.push({
        kind: isHigh ? 'EQH' : 'EQL', level,
        fromIndex: p0.index, fromTime: p0.time, toIndex: p1.index, toTime: p1.time,
        sweptIndex, brokenIndex,
        endTime: (sweptIndex ?? brokenIndex) !== null ? bars[sweptIndex ?? brokenIndex].time : null,
      });
    }
  }
  return out.sort((x, y) => x.toIndex - y.toIndex);
}

/**
 * Barridos de liquidez: la mecha supera un swing high (o pierde un swing low) pero la vela
 * CIERRA de vuelta dentro. Cada swing da como mucho un barrido (la primera vez que se supera).
 * Si en cambio cierra más allá, es una ruptura (BOS/CHoCH) y no se marca aquí.
 *
 * Dos matices para no confundir la lectura:
 *  - La vela que FORMA un swing casi igual al anterior (misma tolerancia que EQH/EQL) no cuenta
 *    como barrido: eso es la formación de un EQH, no una toma de liquidez.
 *  - Si una misma vela barre varios swings a la vez, se marca una sola vez (con el nivel más extremo).
 */
export function detectSweeps(bars, pivots, opts = {}) {
  const a = atr(bars, opts.atrPeriod ?? 14);
  const tolAtr = opts.tolAtr ?? 0.1;
  const pivotAt = new Map(pivots.map((q) => [`${q.type}:${q.index}`, q]));
  const found = new Map(); // `${dir}:${index}` -> barrido (se queda el más extremo)

  for (const p of pivots) {
    const isHigh = p.type === 'high';
    for (let j = p.confirmedIndex + 1; j < bars.length; j++) {
      const pierced = isHigh ? bars[j].high > p.price : bars[j].low < p.price;
      if (!pierced) continue;
      const q = pivotAt.get(`${p.type}:${j}`); // ¿esta vela es ella misma un swing del mismo tipo?
      const tol = opts.tol ?? tolAtr * a[j];
      if (q && q.index > p.index && Math.abs(q.price - p.price) <= tol) continue; // formación de EQH/EQL
      const closedBeyond = isHigh ? bars[j].close > p.price : bars[j].close < p.price;
      if (!closedBeyond) {
        const sw = { dir: isHigh ? 'high' : 'low', level: p.price, pivotIndex: p.index, pivotTime: p.time, index: j, time: bars[j].time };
        const key = `${sw.dir}:${j}`;
        const prev = found.get(key);
        if (!prev || (isHigh ? sw.level > prev.level : sw.level < prev.level)) found.set(key, sw);
      }
      break;
    }
  }
  return [...found.values()].sort((x, y) => x.index - y.index);
}
