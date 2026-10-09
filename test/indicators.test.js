import test from 'node:test';
import assert from 'node:assert/strict';
import { detectStructure } from '../public/js/structure.js';
import { atr, ema, vwapDaily, detectFVG, detectOrderBlocks, detectEqualLevels, detectSweeps, heikinAshi } from '../public/js/indicators.js';

const mk = (rows) => rows.map(([open, high, low, close], i) => ({ time: i * 60, open, high, low, close, volume: 100 }));

// Same as in structure.test.js: zigzag through turning points
function path(points, legLen = 5) {
  const closes = [points[0]];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k];
    for (let s = 1; s <= legLen; s++) closes.push(a + ((b - a) * s) / legLen);
  }
  return closes.map((c, i) => ({ time: i, open: c, high: c + 0.5, low: c - 0.5, close: c, volume: 10 }));
}

test('ATR of constant candles is the candle range', () => {
  const bars = mk(Array.from({ length: 20 }, () => [10, 12, 10, 11]));
  const a = atr(bars, 14);
  assert.ok(Math.abs(a[19] - 2) < 1e-9);
});

test('EMA: seeded with the SMA and follows a constant series', () => {
  const bars = mk(Array.from({ length: 10 }, () => [5, 5, 5, 5]));
  const e = ema(bars, 4);
  assert.equal(e.length, 7);
  assert.ok(e.every((p) => Math.abs(p.value - 5) < 1e-9));
  assert.deepEqual(ema(bars.slice(0, 3), 4), []);
});

test('Heikin Ashi: averaged candles, same times, input untouched', () => {
  const bars = mk([[10, 14, 9, 12], [12, 15, 11, 13], [13, 13.5, 8, 9]]);
  const copy = structuredClone(bars);
  const ha = heikinAshi(bars);
  assert.deepEqual(bars, copy);
  assert.deepEqual(ha.map((b) => b.time), bars.map((b) => b.time));
  // 1st: open = (10+12)/2 = 11, close = (10+14+9+12)/4 = 11.25
  assert.equal(ha[0].open, 11);
  assert.equal(ha[0].close, 11.25);
  assert.equal(ha[0].high, 14);
  assert.equal(ha[0].low, 9);
  // 2nd: open = (11+11.25)/2 = 11.125, close = (12+15+11+13)/4 = 12.75
  assert.equal(ha[1].open, 11.125);
  assert.equal(ha[1].close, 12.75);
  // 3rd: open = (11.125+12.75)/2 = 11.9375, close = (13+13.5+8+9)/4 = 10.875; high includes the HA open
  assert.equal(ha[2].open, 11.9375);
  assert.equal(ha[2].close, 10.875);
  assert.equal(ha[2].high, 13.5);
  assert.equal(ha[2].low, 8);
  assert.equal(ha[2].volume, 100);
  assert.deepEqual(heikinAshi([]), []);
});

test('VWAP resets each day and does not invent values without volume', () => {
  const day = 86400;
  const bars = [
    { time: 0, open: 10, high: 10, low: 10, close: 10, volume: 100 },
    { time: 60, open: 20, high: 20, low: 20, close: 20, volume: 100 },
    { time: day, open: 50, high: 50, low: 50, close: 50, volume: 10 },
  ];
  const v = vwapDaily(bars);
  assert.equal(v[1].value, 15);
  assert.equal(v[2].value, 50); // new day
  assert.deepEqual(vwapDaily(bars.map((b) => ({ ...b, volume: 0 }))), []);
});

test('bullish FVG: detects the gap and its fill', () => {
  const bars = mk([
    [9, 10, 8, 9.5],
    [10, 15, 9.5, 14.5],   // impulse candle
    [14.5, 16, 12, 15.5],  // low 12 > high of 2 candles earlier (10) → gap [10, 12]
    [15.5, 17, 14, 16],
    [16, 16.5, 11, 11.5],  // enters the gap, does not fill it
    [11.5, 12, 9.5, 10],   // low 9.5 <= 10 → filled
  ]);
  const all = detectFVG(bars, { minAtr: 0 });
  assert.equal(all.length, 2); // there is also a bearish gap [12, 14] between candles 3 and 5
  const f = all.filter((x) => x.dir === 'bull');
  assert.equal(f.length, 1);
  assert.deepEqual([f[0].dir, f[0].bottom, f[0].top, f[0].index], ['bull', 10, 12, 1]);
  assert.equal(f[0].mitigatedIndex, 5);
});

test('bearish FVG and size filter (ATR)', () => {
  const bars = mk([
    [20, 22, 18, 19],
    [19, 19.5, 12, 12.5],
    [12.5, 14, 11, 13], // high 14 < low of 2 candles earlier (18) → gap [14, 18]
    [13, 13.5, 12, 12.5],
  ]);
  const f = detectFVG(bars, { minAtr: 0 });
  assert.deepEqual([f[0].dir, f[0].bottom, f[0].top], ['bear', 14, 18]);
  assert.equal(f[0].mitigatedIndex, null);
  assert.equal(detectFVG(bars, { minAtr: 50 }).length, 0); // gap "small" relative to ATR
});

const POINTS = [100, 120, 110, 130, 118, 140, 115, 125, 105];

test('Order Block: zone of the candle at the low before the bullish break, and its mitigation', () => {
  const bars = path(POINTS);
  const { breaks } = detectStructure(bars, { n: 2 });
  const obs = detectOrderBlocks(bars, breaks);
  const first = obs.find((o) => o.dir === 'bull');
  // the low between the broken swing (120) and the break is the candle at 110 → range [109.5, 110.5]
  assert.deepEqual([first.bottom, first.top], [109.5, 110.5]);
  assert.equal(first.breakKind, 'BOS');
  // the later close at 105 pierces the zone → mitigated
  assert.ok(first.mitigatedIndex !== null && bars[first.mitigatedIndex].close < first.bottom);
  assert.ok(obs.some((o) => o.dir === 'bear'));
});

test('EQH: two nearly equal highs and the later sweep', () => {
  // two peaks at 120 (high 120.5), pullback, and a candle that pierces with its wick and closes below
  const base = path([100, 120, 110, 120, 105], 5);
  const probe = { time: 99, open: 110, high: 121.5, low: 108, close: 112, volume: 10 };
  const bars = [...base, probe].map((b, i) => ({ ...b, time: i }));
  const { pivots } = detectStructure(bars, { n: 2 });
  const eq = detectEqualLevels(bars, pivots, { tol: 0.2 });
  const eqh = eq.find((e) => e.kind === 'EQH');
  assert.ok(eqh, 'there must be an EQH');
  assert.equal(eqh.level, 120.5);
  assert.equal(eqh.sweptIndex, bars.length - 1);
  assert.equal(eqh.brokenIndex, null);
  // with a tiny tolerance and different peaks there is no EQH
  const bars2 = path([100, 120, 110, 123, 105], 5);
  assert.equal(detectEqualLevels(bars2, detectStructure(bars2, { n: 2 }).pivots, { tol: 0.2 }).filter((e) => e.kind === 'EQH').length, 0);
});

test('Sweep: the wick passes the swing but the close comes back; if it closes beyond, it is not a sweep', () => {
  const base = path([100, 120, 110], 5);
  const sweepBar = { time: 0, open: 112, high: 121, low: 111, close: 113, volume: 10 };
  const breakBar = { time: 0, open: 112, high: 123, low: 111, close: 122, volume: 10 };
  const withSweep = [...base, sweepBar].map((b, i) => ({ ...b, time: i }));
  const withBreak = [...base, breakBar].map((b, i) => ({ ...b, time: i }));
  const s1 = detectSweeps(withSweep, detectStructure(withSweep, { n: 2 }).pivots);
  const s2 = detectSweeps(withBreak, detectStructure(withBreak, { n: 2 }).pivots);
  assert.equal(s1.length, 1);
  assert.deepEqual([s1[0].dir, s1[0].level, s1[0].index], ['high', 120.5, withSweep.length - 1]);
  assert.equal(s2.length, 0);
});

test('Sweep: forming an EQH (2nd high barely higher) does not count as a sweep', () => {
  const bars = path([100, 120, 110, 120.1, 105]); // highs 120.5 and 120.6
  const { pivots } = detectStructure(bars, { n: 2 });
  assert.equal(detectEqualLevels(bars, pivots, { tol: 0.35 }).filter((e) => e.kind === 'EQH').length, 1);
  assert.equal(detectSweeps(bars, pivots, { tol: 0.35 }).length, 0);
  // a clearly higher high whose candle closes above the previous one is a break, not a sweep
  const bars2 = path([100, 120, 110, 122, 105]);
  const sw = detectSweeps(bars2, detectStructure(bars2, { n: 2 }).pivots, { tol: 0.35 });
  assert.equal(sw.length, 0); // closes at 122 > 120.5
});

test('Sweep: a candle that sweeps two levels is marked only once, with the most extreme', () => {
  const base = path([100, 120, 110, 120, 105], 5); // EQH at 120.5 (two equal swings)
  const probe = { time: 0, open: 108, high: 121.5, low: 107, close: 109, volume: 10 };
  const bars = [...base, probe].map((b, i) => ({ ...b, time: i }));
  const { pivots } = detectStructure(bars, { n: 2 });
  const sw = detectSweeps(bars, pivots, { tol: 0.35 });
  assert.equal(sw.length, 1);
  assert.equal(sw[0].index, bars.length - 1);
  assert.equal(sw[0].level, 120.5);
});
