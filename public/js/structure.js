// Market structure detection. PURE module: bars in, marks out.
// It depends on neither the browser nor Node, so it is tested with `npm test`.
//
// Definitions (the same ones used by popular "Smart Money Concepts" style indicators):
//
//  • Swing high  : candle whose high is greater than the previous `n` candles' and
//                  greater than or equal to the next `n` candles'.
//  • Swing low   : the same, inverted.
//  • A swing is only CONFIRMED `n` candles after it forms. That is why the most
//    recent marks can appear "late": it is inherent to any swing indicator.
//  • Labels      : each swing is compared with the previous one of the same type
//                  high:  HH (higher) / LH (lower)
//                  low :  HL (higher) / LL (lower)
//  • Break       : when price goes above the last swing high (or below the last
//                  swing low) not yet broken.
//        - If it goes WITH the current trend     → BOS   (Break of Structure)
//        - If it goes AGAINST the current trend  → CHoCH (Change of Character)
//        - The chart's first break sets the trend and is marked as BOS.
//  • `breakBy`   : 'close' (close beyond the level) or 'wick' (the wick is enough).
//
// Input bar format: { time, open, high, low, close }

/**
 * @param {Array<{time:number, open:number, high:number, low:number, close:number}>} bars
 * @param {{n?:number, breakBy?:'close'|'wick'}} [opts]
 */
export function detectStructure(bars, opts = {}) {
  const n = Math.max(1, Math.floor(opts.n ?? 3));
  const breakBy = opts.breakBy === 'wick' ? 'wick' : 'close';

  const pivots = [];
  const breaks = [];
  let trend = null; // 'bull' | 'bear' | null

  let lastHighPivot = null; // last confirmed pivot high (to label HH/LH)
  let lastLowPivot = null;  // last confirmed pivot low (to label HL/LL)
  let activeHigh = null;    // swing high level not yet broken
  let activeLow = null;     // swing low level not yet broken

  for (let i = 0; i < bars.length; i++) {
    // 1) Is a pivot confirmed now? The candidate is candle i-n.
    const p = i - n;
    if (p >= n) {
      if (isSwingHigh(bars, p, n)) {
        const piv = {
          type: 'high', index: p, time: bars[p].time, price: bars[p].high, confirmedIndex: i,
          label: lastHighPivot ? (bars[p].high > lastHighPivot.price ? 'HH' : 'LH') : null,
        };
        pivots.push(piv);
        lastHighPivot = piv;
        activeHigh = { price: piv.price, index: p, time: piv.time };
      }
      if (isSwingLow(bars, p, n)) {
        const piv = {
          type: 'low', index: p, time: bars[p].time, price: bars[p].low, confirmedIndex: i,
          label: lastLowPivot ? (bars[p].low > lastLowPivot.price ? 'HL' : 'LL') : null,
        };
        pivots.push(piv);
        lastLowPivot = piv;
        activeLow = { price: piv.price, index: p, time: piv.time };
      }
    }

    // 2) Does the current candle break any active level?
    const bar = bars[i];
    const upSide = breakBy === 'wick' ? bar.high : bar.close;
    const downSide = breakBy === 'wick' ? bar.low : bar.close;

    let broke = false;
    if (activeHigh && upSide > activeHigh.price) {
      breaks.push({
        kind: trend === 'bear' ? 'CHoCH' : 'BOS', dir: 'bull',
        level: activeHigh.price, fromIndex: activeHigh.index, fromTime: activeHigh.time,
        index: i, time: bar.time,
      });
      trend = 'bull';
      activeHigh = null;
      broke = true;
    }
    if (!broke && activeLow && downSide < activeLow.price) {
      breaks.push({
        kind: trend === 'bull' ? 'CHoCH' : 'BOS', dir: 'bear',
        level: activeLow.price, fromIndex: activeLow.index, fromTime: activeLow.time,
        index: i, time: bar.time,
      });
      trend = 'bear';
      activeLow = null;
    }
  }

  return { pivots, breaks, trend, active: { high: activeHigh, low: activeLow }, params: { n, breakBy } };
}

function isSwingHigh(bars, p, n) {
  const h = bars[p].high;
  for (let j = 1; j <= n; j++) {
    if (bars[p - j].high >= h) return false; // left: strictly greater
    if (bars[p + j].high > h) return false;  // right: greater or equal
  }
  return true;
}

function isSwingLow(bars, p, n) {
  const l = bars[p].low;
  for (let j = 1; j <= n; j++) {
    if (bars[p - j].low <= l) return false;
    if (bars[p + j].low < l) return false;
  }
  return true;
}
