import test from 'node:test';
import assert from 'node:assert/strict';
import { detectStructure } from '../public/js/structure.js';
import { atr, ema, vwapDaily, detectFVG, detectOrderBlocks, detectEqualLevels, detectSweeps } from '../public/js/indicators.js';

const mk = (rows) => rows.map(([open, high, low, close], i) => ({ time: i * 60, open, high, low, close, volume: 100 }));

// Igual que en structure.test.js: zigzag por puntos de giro
function path(points, legLen = 5) {
  const closes = [points[0]];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k];
    for (let s = 1; s <= legLen; s++) closes.push(a + ((b - a) * s) / legLen);
  }
  return closes.map((c, i) => ({ time: i, open: c, high: c + 0.5, low: c - 0.5, close: c, volume: 10 }));
}

test('ATR de velas constantes es el rango de la vela', () => {
  const bars = mk(Array.from({ length: 20 }, () => [10, 12, 10, 11]));
  const a = atr(bars, 14);
  assert.ok(Math.abs(a[19] - 2) < 1e-9);
});

test('EMA: se siembra con la SMA y sigue una serie constante', () => {
  const bars = mk(Array.from({ length: 10 }, () => [5, 5, 5, 5]));
  const e = ema(bars, 4);
  assert.equal(e.length, 7);
  assert.ok(e.every((p) => Math.abs(p.value - 5) < 1e-9));
  assert.deepEqual(ema(bars.slice(0, 3), 4), []);
});

test('VWAP se reinicia cada día y no inventa valores sin volumen', () => {
  const day = 86400;
  const bars = [
    { time: 0, open: 10, high: 10, low: 10, close: 10, volume: 100 },
    { time: 60, open: 20, high: 20, low: 20, close: 20, volume: 100 },
    { time: day, open: 50, high: 50, low: 50, close: 50, volume: 10 },
  ];
  const v = vwapDaily(bars);
  assert.equal(v[1].value, 15);
  assert.equal(v[2].value, 50); // nuevo día
  assert.deepEqual(vwapDaily(bars.map((b) => ({ ...b, volume: 0 }))), []);
});

test('FVG alcista: detecta el hueco y su llenado', () => {
  const bars = mk([
    [9, 10, 8, 9.5],
    [10, 15, 9.5, 14.5],   // vela impulsiva
    [14.5, 16, 12, 15.5],  // low 12 > high de 2 velas antes (10) → hueco [10, 12]
    [15.5, 17, 14, 16],
    [16, 16.5, 11, 11.5],  // entra en el hueco, no lo llena
    [11.5, 12, 9.5, 10],   // low 9.5 <= 10 → llenado
  ]);
  const all = detectFVG(bars, { minAtr: 0 });
  assert.equal(all.length, 2); // además hay un hueco bajista [12, 14] entre las velas 3 y 5
  const f = all.filter((x) => x.dir === 'bull');
  assert.equal(f.length, 1);
  assert.deepEqual([f[0].dir, f[0].bottom, f[0].top, f[0].index], ['bull', 10, 12, 1]);
  assert.equal(f[0].mitigatedIndex, 5);
});

test('FVG bajista y filtro por tamaño (ATR)', () => {
  const bars = mk([
    [20, 22, 18, 19],
    [19, 19.5, 12, 12.5],
    [12.5, 14, 11, 13], // high 14 < low de hace 2 velas (18) → hueco [14, 18]
    [13, 13.5, 12, 12.5],
  ]);
  const f = detectFVG(bars, { minAtr: 0 });
  assert.deepEqual([f[0].dir, f[0].bottom, f[0].top], ['bear', 14, 18]);
  assert.equal(f[0].mitigatedIndex, null);
  assert.equal(detectFVG(bars, { minAtr: 50 }).length, 0); // hueco "pequeño" respecto al ATR
});

const POINTS = [100, 120, 110, 130, 118, 140, 115, 125, 105];

test('Order Block: zona de la vela en el mínimo previo a la ruptura alcista y su mitigación', () => {
  const bars = path(POINTS);
  const { breaks } = detectStructure(bars, { n: 2 });
  const obs = detectOrderBlocks(bars, breaks);
  const first = obs.find((o) => o.dir === 'bull');
  // el mínimo entre el swing roto (120) y la ruptura es la vela en 110 → rango [109.5, 110.5]
  assert.deepEqual([first.bottom, first.top], [109.5, 110.5]);
  assert.equal(first.breakKind, 'BOS');
  // el cierre posterior en 105 perfora la zona → mitigado
  assert.ok(first.mitigatedIndex !== null && bars[first.mitigatedIndex].close < first.bottom);
  assert.ok(obs.some((o) => o.dir === 'bear'));
});

test('EQH: dos máximos casi iguales y el barrido posterior', () => {
  // dos picos en 120 (high 120.5), retroceso, y una vela que perfora con mecha y cierra abajo
  const base = path([100, 120, 110, 120, 105], 5);
  const probe = { time: 99, open: 110, high: 121.5, low: 108, close: 112, volume: 10 };
  const bars = [...base, probe].map((b, i) => ({ ...b, time: i }));
  const { pivots } = detectStructure(bars, { n: 2 });
  const eq = detectEqualLevels(bars, pivots, { tol: 0.2 });
  const eqh = eq.find((e) => e.kind === 'EQH');
  assert.ok(eqh, 'debe haber un EQH');
  assert.equal(eqh.level, 120.5);
  assert.equal(eqh.sweptIndex, bars.length - 1);
  assert.equal(eqh.brokenIndex, null);
  // con una tolerancia minúscula y picos distintos no hay EQH
  const bars2 = path([100, 120, 110, 123, 105], 5);
  assert.equal(detectEqualLevels(bars2, detectStructure(bars2, { n: 2 }).pivots, { tol: 0.2 }).filter((e) => e.kind === 'EQH').length, 0);
});

test('Sweep: la mecha pasa el swing pero el cierre vuelve; si cierra más allá no es sweep', () => {
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

test('Sweep: la formación de un EQH (2.º máximo apenas más alto) no cuenta como barrido', () => {
  const bars = path([100, 120, 110, 120.1, 105]); // máximos 120.5 y 120.6
  const { pivots } = detectStructure(bars, { n: 2 });
  assert.equal(detectEqualLevels(bars, pivots, { tol: 0.35 }).filter((e) => e.kind === 'EQH').length, 1);
  assert.equal(detectSweeps(bars, pivots, { tol: 0.35 }).length, 0);
  // un máximo claramente más alto cuya vela cierra por encima del anterior es ruptura, no barrido
  const bars2 = path([100, 120, 110, 122, 105]);
  const sw = detectSweeps(bars2, detectStructure(bars2, { n: 2 }).pivots, { tol: 0.35 });
  assert.equal(sw.length, 0); // cierra en 122 > 120.5
});

test('Sweep: una vela que barre dos niveles se marca una sola vez, con el más extremo', () => {
  const base = path([100, 120, 110, 120, 105], 5); // EQH en 120.5 (dos swings iguales)
  const probe = { time: 0, open: 108, high: 121.5, low: 107, close: 109, volume: 10 };
  const bars = [...base, probe].map((b, i) => ({ ...b, time: i }));
  const { pivots } = detectStructure(bars, { n: 2 });
  const sw = detectSweeps(bars, pivots, { tol: 0.35 });
  assert.equal(sw.length, 1);
  assert.equal(sw[0].index, bars.length - 1);
  assert.equal(sw[0].level, 120.5);
});
