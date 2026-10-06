import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AlpacaClient, alpacaTimeframe, durationDays, filterRTH, aggregateSession4H, nyClock, symbolId,
} from '../server/alpaca.js';
import { createProvider } from '../server/providers.js';

const sec = (iso) => Date.parse(iso) / 1000;
const bar = (iso, o, h, l, c, v = 100) => ({ t: sec(iso), o, h, l, c, v });

function makeConfig(over = {}) {
  return {
    useRTH: true, requestTimeoutMs: 5000,
    alpaca: { keyId: 'k', secretKey: 's', paper: true, feed: 'iex', ...over },
  };
}

// Fake fetch: records every call and answers by path
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const u = new URL(url);
    const handler = routes[u.pathname];
    if (!handler) return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) };
    const out = handler(u);
    return { ok: (out.status ?? 200) < 400, status: out.status ?? 200, statusText: '', json: async () => out.body };
  };
  fn.calls = calls;
  return fn;
}

test('maps timeframes and durations', () => {
  assert.equal(alpacaTimeframe('1D', true), '1Day');
  assert.equal(alpacaTimeframe('4H', true), '30Min');
  assert.equal(alpacaTimeframe('4H', false), '4Hour');
  assert.equal(alpacaTimeframe('15m', true), '15Min');
  assert.equal(alpacaTimeframe('10m', true), '10Min');
  assert.equal(durationDays('2 W'), 14);
  assert.equal(durationDays('2 Y'), 732);
});

test('nyClock handles daylight saving time', () => {
  assert.deepEqual(nyClock(sec('2026-03-02T14:30:00Z')), { day: '2026-03-02', minute: 570 }); // EST
  assert.deepEqual(nyClock(sec('2026-07-01T13:30:00Z')), { day: '2026-07-01', minute: 570 }); // EDT
});

test('filterRTH keeps only 9:30–16:00 New York', () => {
  const bars = [
    bar('2026-03-02T14:00:00Z', 1, 1, 1, 1), // 9:00 pre-market
    bar('2026-03-02T14:30:00Z', 1, 1, 1, 1), // 9:30
    bar('2026-03-02T20:45:00Z', 1, 1, 1, 1), // 15:45
    bar('2026-03-02T21:00:00Z', 1, 1, 1, 1), // 16:00 after-hours
  ];
  assert.deepEqual(filterRTH(bars).map((b) => nyClock(b.t).minute), [570, 945]);
});

test('aggregateSession4H builds 9:30 and 13:30 candles per day', () => {
  const bars = [
    bar('2026-03-02T14:30:00Z', 10, 12, 9, 11, 5),
    bar('2026-03-02T18:00:00Z', 11, 15, 10, 14, 5), // 13:00, still first candle
    bar('2026-03-02T18:30:00Z', 14, 14, 8, 9, 7),  // 13:30, second candle
    bar('2026-03-02T20:30:00Z', 9, 10, 7, 8, 1),
    bar('2026-03-03T14:30:00Z', 8, 9, 8, 9, 2),    // next day
  ];
  const out = aggregateSession4H(bars);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0], { t: sec('2026-03-02T14:30:00Z'), o: 10, h: 15, l: 9, c: 14, v: 10 });
  assert.deepEqual(out[1], { t: sec('2026-03-02T18:30:00Z'), o: 14, h: 14, l: 7, c: 8, v: 8 });
  assert.equal(out[2].t, sec('2026-03-03T14:30:00Z'));
});

test('symbolId is stable, numeric and fits the conId validation', () => {
  assert.equal(symbolId('AAPL'), symbolId('AAPL'));
  assert.notEqual(symbolId('AAPL'), symbolId('MSFT'));
  assert.match(String(symbolId('BRK.B')), /^\d{1,12}$/);
});

test('without keys: not connected, clear message, no network calls', async () => {
  const fetch = fakeFetch({});
  const c = new AlpacaClient({ config: makeConfig({ keyId: '', secretKey: '' }), fetch });
  await c.connect();
  const s = c.status();
  assert.equal(s.connected, false);
  assert.equal(s.provider, 'Alpaca');
  assert.match(s.lastError, /ALPACA_API_KEY_ID/);
  assert.equal(fetch.calls.length, 0);
  await assert.rejects(c.searchSymbols('AAPL'), (e) => e.code === 'NOT_CONNECTED');
});

test('bad keys: 401 is reported in status', async () => {
  const fetch = fakeFetch({ '/v2/clock': () => ({ status: 401, body: { message: 'unauthorized.' } }) });
  const c = new AlpacaClient({ config: makeConfig(), fetch });
  await c.connect();
  c.shutdown();
  assert.equal(c.status().connected, false);
  assert.match(c.status().lastError, /401/);
});

test('search: exact match first, then prefix, then name; paper endpoint and key headers', async () => {
  const fetch = fakeFetch({
    '/v2/clock': () => ({ body: { is_open: false } }),
    '/v2/assets': () => ({
      body: [
        { symbol: 'AAPLW', name: 'Something', exchange: 'NASDAQ' },
        { symbol: 'AAPL', name: 'Apple Inc. Common Stock', exchange: 'NASDAQ' },
        { symbol: 'XYZ', name: 'Pineapple Corp', exchange: 'NYSE' },
        { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' },
      ],
    }),
  });
  const c = new AlpacaClient({ config: makeConfig(), fetch });
  await c.connect();
  const r = await c.searchSymbols('aapl');
  assert.deepEqual(r.map((x) => x.symbol), ['AAPL', 'AAPLW']);
  assert.deepEqual(r[0], {
    conId: symbolId('AAPL'), symbol: 'AAPL', secType: 'STK', exchange: 'NASDAQ', currency: 'USD', name: 'Apple Inc. Common Stock', hasFutures: false,
  });
  assert.deepEqual((await c.searchSymbols('apple')).map((x) => x.symbol), ['AAPL', 'XYZ']);
  // the asset list is fetched once and cached
  assert.equal(fetch.calls.filter((x) => x.url.pathname === '/v2/assets').length, 1);
  assert.equal(fetch.calls[0].url.host, 'paper-api.alpaca.markets');
  assert.equal(fetch.calls[0].init.headers['APCA-API-KEY-ID'], 'k');
});

test('live keys use the live trading endpoint', async () => {
  const fetch = fakeFetch({ '/v2/clock': () => ({ body: {} }) });
  const c = new AlpacaClient({ config: makeConfig({ paper: false }), fetch });
  await c.connect();
  assert.equal(fetch.calls[0].url.host, 'api.alpaca.markets');
  assert.equal(c.status().target, 'live · iex');
});

test('getBars: paginates, filters RTH and builds session 4H candles', async () => {
  const pages = {
    first: { bars: { AAPL: [{ t: '2026-03-02T14:00:00Z', o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }, { t: '2026-03-02T14:30:00Z', o: 10, h: 12, l: 9, c: 11, v: 5 }] }, next_page_token: 'p2' },
    p2: { bars: { AAPL: [{ t: '2026-03-02T18:30:00Z', o: 11, h: 13, l: 10, c: 12, v: 4 }] }, next_page_token: null },
  };
  const fetch = fakeFetch({
    '/v2/clock': () => ({ body: {} }),
    '/v2/stocks/bars': (u) => ({ body: pages[u.searchParams.get('page_token') || 'first'] }),
  });
  const c = new AlpacaClient({ config: makeConfig(), fetch });
  await c.connect();
  const out = await c.getBars({ conId: symbolId('AAPL'), symbol: 'AAPL', secType: 'STK' }, '4H');
  assert.equal(out.tf, '4H');
  assert.equal(out.dateOnly, false);
  assert.deepEqual(out.bars.map((b) => b.t), [sec('2026-03-02T14:30:00Z'), sec('2026-03-02T18:30:00Z')]);
  const req = fetch.calls.find((x) => x.url.pathname === '/v2/stocks/bars').url;
  assert.equal(req.host, 'data.alpaca.markets');
  assert.equal(req.searchParams.get('timeframe'), '30Min');
  assert.equal(req.searchParams.get('feed'), 'iex');
  assert.equal(req.searchParams.get('symbols'), 'AAPL');
  // second call is served from cache
  const again = await c.getBars({ conId: 1, symbol: 'AAPL', secType: 'STK' }, '4H');
  assert.equal(again.cached, true);
});

test('getBars rejects forex and indices with UNSUPPORTED', async () => {
  const c = new AlpacaClient({ config: makeConfig(), fetch: fakeFetch({ '/v2/clock': () => ({ body: {} }) }) });
  await c.connect();
  await assert.rejects(c.getBars({ symbol: 'EUR', secType: 'CASH', currency: 'USD' }, '1D'), (e) => e.code === 'UNSUPPORTED' && /forex/.test(e.message));
  await assert.rejects(c.getBars({ symbol: 'SPX', secType: 'IND' }, '1D'), (e) => e.code === 'UNSUPPORTED');
});

test('read-only: every request is a GET to data, assets or clock', async () => {
  const fetch = fakeFetch({
    '/v2/clock': () => ({ body: {} }),
    '/v2/assets': () => ({ body: [{ symbol: 'AAPL', name: 'Apple' }] }),
    '/v2/stocks/bars': () => ({ body: { bars: { AAPL: [] } } }),
  });
  const c = new AlpacaClient({ config: makeConfig(), fetch });
  await c.connect();
  await c.searchSymbols('AAPL');
  for (const tf of ['1D', '4H', '15m', '10m']) await c.getBars({ symbol: 'AAPL', secType: 'STK' }, tf);
  for (const { url, init } of fetch.calls) {
    assert.equal(init.method, 'GET');
    assert.ok(['/v2/clock', '/v2/assets', '/v2/stocks/bars'].includes(url.pathname), url.pathname);
  }
});

test('createProvider returns each strategy and rejects unknown names', () => {
  for (const [name, provider] of [['ibkr', 'IBKR'], ['alpaca', 'Alpaca'], ['mock', 'Mock']]) {
    const p = createProvider(name);
    for (const m of ['connect', 'shutdown', 'status', 'searchSymbols', 'getBars']) assert.equal(typeof p[m], 'function', `${name}.${m}`);
    assert.equal(p.status().provider, provider);
    p.shutdown();
  }
  assert.throws(() => createProvider('robinhood'), /Unknown data provider/);
});
