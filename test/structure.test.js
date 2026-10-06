import test from 'node:test';
import assert from 'node:assert/strict';
import { detectStructure } from '../public/js/structure.js';

// Construye velas siguiendo puntos de giro, con `legLen` velas por tramo.
// Cada punto de giro es una vela con close = valor (high = close+0.5, low = close-0.5).
function path(points, legLen = 5) {
  const closes = [points[0]];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k];
    for (let s = 1; s <= legLen; s++) closes.push(a + ((b - a) * s) / legLen);
  }
  return closes.map((c, i) => ({ time: i, open: c, high: c + 0.5, low: c - 0.5, close: c }));
}

// 100 → 120 (SH) → 110 (SL) → 130 (HH) → 118 (HL) → 140 (HH) → 115 (rompe HL: CHoCH)
//     → 125 (LH) → 105 (rompe el mínimo anterior: BOS bajista)
const POINTS = [100, 120, 110, 130, 118, 140, 115, 125, 105];

test('detecta swings y los etiqueta HH/HL/LH/LL', () => {
  const { pivots } = detectStructure(path(POINTS), { n: 2 });
  const highs = pivots.filter((p) => p.type === 'high').map((p) => p.label);
  const lows = pivots.filter((p) => p.type === 'low').map((p) => p.label);
  assert.deepEqual(highs, [null, 'HH', 'HH', 'LH']); // 120, 130, 140, 125
  assert.deepEqual(lows, [null, 'HL', 'LL']);        // 110, 118?, 115
});

test('BOS en la dirección de la tendencia y CHoCH al romperla', () => {
  const { breaks, trend } = detectStructure(path(POINTS), { n: 2 });
  assert.deepEqual(
    breaks.map((b) => `${b.kind}:${b.dir}`),
    ['BOS:bull', 'BOS:bull', 'CHoCH:bear', 'BOS:bear'],
  );
  assert.equal(trend, 'bear');
});

test('el CHoCH rompe el nivel del último swing low (HL protegido)', () => {
  const bars = path(POINTS);
  const { breaks } = detectStructure(bars, { n: 2 });
  const choch = breaks.find((b) => b.kind === 'CHoCH');
  assert.equal(choch.level, 117.5); // low de la vela del HL (118 - 0.5)
  assert.ok(bars[choch.index].close < choch.level);
  assert.ok(choch.index > choch.fromIndex);
});

test('un swing no se confirma hasta n velas después', () => {
  const { pivots } = detectStructure(path(POINTS), { n: 3 });
  for (const p of pivots) assert.equal(p.confirmedIndex - p.index, 3);
});

test('modo mecha: la mecha basta, el cierre no', () => {
  // Pico en 120, retroceso, y una vela que perfora 120.5 con la mecha pero cierra debajo.
  const base = path([100, 120, 110], 5);
  const probe = { time: 99, open: 112, high: 121, low: 111, close: 113 };
  const bars = [...base, probe].map((b, i) => ({ ...b, time: i }));
  const byClose = detectStructure(bars, { n: 2, breakBy: 'close' });
  const byWick = detectStructure(bars, { n: 2, breakBy: 'wick' });
  assert.equal(byClose.breaks.length, 0);
  assert.equal(byWick.breaks.length, 1);
  assert.equal(byWick.breaks[0].kind, 'BOS');
});

test('entradas degeneradas no rompen', () => {
  assert.deepEqual(detectStructure([]).pivots, []);
  assert.deepEqual(detectStructure(path([100, 101], 2), { n: 5 }).breaks, []);
});
