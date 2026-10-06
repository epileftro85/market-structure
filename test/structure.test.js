import test from 'node:test';
import assert from 'node:assert/strict';
import { detectStructure } from '../public/js/structure.js';

// Builds candles following turning points, with `legLen` candles per leg.
// Each turning point is a candle with close = value (high = close+0.5, low = close-0.5).
function path(points, legLen = 5) {
  const closes = [points[0]];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k];
    for (let s = 1; s <= legLen; s++) closes.push(a + ((b - a) * s) / legLen);
  }
  return closes.map((c, i) => ({ time: i, open: c, high: c + 0.5, low: c - 0.5, close: c }));
}

// 100 → 120 (SH) → 110 (SL) → 130 (HH) → 118 (HL) → 140 (HH) → 115 (breaks HL: CHoCH)
//     → 125 (LH) → 105 (breaks the previous low: bearish BOS)
const POINTS = [100, 120, 110, 130, 118, 140, 115, 125, 105];

test('detects swings and labels them HH/HL/LH/LL', () => {
  const { pivots } = detectStructure(path(POINTS), { n: 2 });
  const highs = pivots.filter((p) => p.type === 'high').map((p) => p.label);
  const lows = pivots.filter((p) => p.type === 'low').map((p) => p.label);
  assert.deepEqual(highs, [null, 'HH', 'HH', 'LH']); // 120, 130, 140, 125
  assert.deepEqual(lows, [null, 'HL', 'LL']);        // 110, 118?, 115
});

test('BOS in the trend direction and CHoCH when it breaks', () => {
  const { breaks, trend } = detectStructure(path(POINTS), { n: 2 });
  assert.deepEqual(
    breaks.map((b) => `${b.kind}:${b.dir}`),
    ['BOS:bull', 'BOS:bull', 'CHoCH:bear', 'BOS:bear'],
  );
  assert.equal(trend, 'bear');
});

test('the CHoCH breaks the level of the last swing low (protected HL)', () => {
  const bars = path(POINTS);
  const { breaks } = detectStructure(bars, { n: 2 });
  const choch = breaks.find((b) => b.kind === 'CHoCH');
  assert.equal(choch.level, 117.5); // low of the HL candle (118 - 0.5)
  assert.ok(bars[choch.index].close < choch.level);
  assert.ok(choch.index > choch.fromIndex);
});

test('a swing is not confirmed until n candles later', () => {
  const { pivots } = detectStructure(path(POINTS), { n: 3 });
  for (const p of pivots) assert.equal(p.confirmedIndex - p.index, 3);
});

test('wick mode: the wick is enough, the close is not', () => {
  // Peak at 120, pullback, and a candle that pierces 120.5 with its wick but closes below.
  const base = path([100, 120, 110], 5);
  const probe = { time: 99, open: 112, high: 121, low: 111, close: 113 };
  const bars = [...base, probe].map((b, i) => ({ ...b, time: i }));
  const byClose = detectStructure(bars, { n: 2, breakBy: 'close' });
  const byWick = detectStructure(bars, { n: 2, breakBy: 'wick' });
  assert.equal(byClose.breaks.length, 0);
  assert.equal(byWick.breaks.length, 1);
  assert.equal(byWick.breaks[0].kind, 'BOS');
});

test('degenerate inputs do not break', () => {
  assert.deepEqual(detectStructure([]).pivots, []);
  assert.deepEqual(detectStructure(path([100, 101], 2), { n: 5 }).breaks, []);
});
