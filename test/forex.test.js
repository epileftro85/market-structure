import test from 'node:test';
import assert from 'node:assert/strict';
import { matchForexPairs, looksLikePair } from '../server/forex.js';

const pairs = (q) => matchForexPairs(q).map((m) => m.pair);

test('encuentra EUR.USD y GBP.USD con cualquier notación', () => {
  for (const q of ['EUR.USD', 'eur/usd', 'EURUSD', 'eur usd', 'EUR-USD']) assert.deepEqual(pairs(q), ['EUR.USD'], q);
  assert.deepEqual(pairs('GBP.USD'), ['GBP.USD']);
});

test('búsquedas parciales', () => {
  assert.ok(pairs('EUR').includes('EUR.USD') && pairs('EUR').includes('EUR.GBP'));
  assert.ok(pairs('gbp').includes('GBP.USD'));
  assert.ok(pairs('eu').every((p) => p.startsWith('EU')));
  assert.deepEqual(pairs('e'), []);
  assert.deepEqual(pairs('AAPL'), []);
});

test('detecta cuándo la consulta es un par', () => {
  for (const q of ['EUR.USD', 'EURUSD', 'eur/usd', 'GBP USD']) assert.ok(looksLikePair(q), q);
  for (const q of ['AAPL', 'EUR', 'MSFT', 'SPY']) assert.ok(!looksLikePair(q), q);
});
