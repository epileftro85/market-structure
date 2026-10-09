// Additional indicators. PURE module (bars in, data out), tested with `npm test`.
//
// Bar format: { time, open, high, low, close, volume? }
// Every function returns indices as well as times, to make drawing and testing easy.

/** ATR (simple average of the True Range, with a growing window at the start). */
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

/** EMA seeded with the SMA of the first `period` bars. Returns [{time, value}]. */
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
 * VWAP that resets every day (`time` is already in exchange time, so day = floor(time/86400)).
 * Without volume (e.g. forex with MIDPOINT) it returns [] instead of making up a value.
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
 * Fair Value Gaps: 3-bar gap that price did not cover.
 *  bullish: low[i] > high[i-2]  → zone [high[i-2], low[i]]
 *  bearish: high[i] < low[i-2]  → zone [high[i], low[i-2]]
 * It counts as "filled" when a later bar crosses the whole zone.
 * @param {{minAtr?:number, atrPeriod?:number}} [opts] minAtr: minimum gap size in multiples of ATR
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
 * Order Blocks from structure breaks (BOS/CHoCH).
 *  bullish break: take the low between the broken swing and the break; the OB is the last
 *                 bearish candle at (or up to 2 candles before) that low.
 *  bearish break: symmetric, with the high and the last bullish candle.
 * The zone is that candle's full range. It is "mitigated" when a later candle CLOSES on the other side.
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
 * Equal highs/lows (EQH/EQL): two consecutive swings of the same type closer than
 * `tol` (default 0.1 × ATR). Stops pile up there; it is "liquidity".
 * Each level says how it ended: `sweptIndex` (the wick went through and the close came back) or
 * `brokenIndex` (closed beyond). If both are null, it is still alive.
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
 * Liquidity sweeps: the wick goes above a swing high (or below a swing low) but the candle
 * CLOSES back inside. Each swing yields at most one sweep (the first time it is exceeded).
 * If it closes beyond instead, it is a break (BOS/CHoCH) and is not marked here.
 *
 * Two nuances to avoid misreading:
 *  - The candle that FORMS a swing nearly equal to the previous one (same tolerance as EQH/EQL) does not
 *    count as a sweep: that is an EQH forming, not a liquidity grab.
 *  - If one candle sweeps several swings at once, it is marked only once (with the most extreme level).
 */
export function detectSweeps(bars, pivots, opts = {}) {
  const a = atr(bars, opts.atrPeriod ?? 14);
  const tolAtr = opts.tolAtr ?? 0.1;
  const pivotAt = new Map(pivots.map((q) => [`${q.type}:${q.index}`, q]));
  const found = new Map(); // `${dir}:${index}` -> sweep (keeps the most extreme)

  for (const p of pivots) {
    const isHigh = p.type === 'high';
    for (let j = p.confirmedIndex + 1; j < bars.length; j++) {
      const pierced = isHigh ? bars[j].high > p.price : bars[j].low < p.price;
      if (!pierced) continue;
      const q = pivotAt.get(`${p.type}:${j}`); // is this candle itself a swing of the same type?
      const tol = opts.tol ?? tolAtr * a[j];
      if (q && q.index > p.index && Math.abs(q.price - p.price) <= tol) continue; // EQH/EQL forming
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

/**
 * Heikin Ashi candles (display only: structure and indicators keep using the real candles).
 *  close = (open + high + low + close) / 4
 *  open  = (previous HA open + previous HA close) / 2; the first one is (open + close) / 2
 *  high  = max(high, HA open, HA close); low = min(low, HA open, HA close)
 * Returns new bars with the same `time` (other fields such as volume are kept).
 */
export function heikinAshi(bars) {
  const out = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const close = (b.open + b.high + b.low + b.close) / 4;
    const open = i === 0 ? (b.open + b.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({ ...b, open, close, high: Math.max(b.high, open, close), low: Math.min(b.low, open, close) });
  }
  return out;
}
