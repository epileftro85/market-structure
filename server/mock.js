// Proveedor simulado: permite probar toda la interfaz sin IB Gateway.
// Genera velas con tendencias/retrocesos para que haya estructura que marcar.
import { TIMEFRAMES } from './config.js';
import { matchForexPairs } from './forex.js';

const SYMBOLS = [
  { conId: 265598, symbol: 'AAPL', secType: 'STK', exchange: 'NASDAQ', currency: 'USD', name: 'APPLE INC' },
  { conId: 272093, symbol: 'MSFT', secType: 'STK', exchange: 'NASDAQ', currency: 'USD', name: 'MICROSOFT CORP' },
  { conId: 76792991, symbol: 'TSLA', secType: 'STK', exchange: 'NASDAQ', currency: 'USD', name: 'TESLA INC' },
  { conId: 756733, symbol: 'SPY', secType: 'STK', exchange: 'ARCA', currency: 'USD', name: 'SPDR S&P 500 ETF TRUST' },
  { conId: 320227571, symbol: 'QQQ', secType: 'STK', exchange: 'NASDAQ', currency: 'USD', name: 'INVESCO QQQ TRUST SERIES 1' },
  { conId: 4815747, symbol: 'NVDA', secType: 'STK', exchange: 'NASDAQ', currency: 'USD', name: 'NVIDIA CORP' },
  { conId: 416904, symbol: 'SPX', secType: 'IND', exchange: 'CBOE', currency: 'USD', name: 'S&P 500 INDEX' },
];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Offset de Nueva York (ms) para un instante dado
function nyOffsetMs(utcMs) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
  return asUtc - utcMs;
}
function nyToEpoch(y, m, d, hh, mm) {
  const guess = Date.UTC(y, m, d, hh, mm);
  return Math.floor((guess - nyOffsetMs(guess - nyOffsetMs(guess))) / 1000);
}

function sessionStarts(tf) {
  if (tf === '4H') return [[9, 30], [13, 30]];
  const step = tf === '15m' ? 15 : 10;
  const out = [];
  for (let m = 9 * 60 + 30; m < 16 * 60; m += step) out.push([Math.floor(m / 60), m % 60]);
  return out;
}

function timestamps(tf, count) {
  const out = [];
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const nowSec = Math.floor(Date.now() / 1000);
  while (out.length < count) {
    const dow = day.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      if (tf === '1D') out.push(Math.floor(day.getTime() / 1000));
      else {
        const slots = sessionStarts(tf).map(([h, mi]) => nyToEpoch(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, mi));
        for (const t of slots.reverse()) if (t <= nowSec) out.push(t);
      }
    }
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return out.slice(0, count).reverse();
}

const COUNTS = { '1D': 500, '4H': 250, '15m': 400, '10m': 400 };
const VOL = { '1D': 0.012, '4H': 0.006, '15m': 0.0021, '10m': 0.0017 };

function generateBars(conId, tf, isFx) {
  const tfHash = [...tf].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const rand = rng(conId * 31 + tfHash);
  const times = timestamps(tf, COUNTS[tf]);
  const base = isFx ? 1.02 + (conId % 40) / 100 : 40 + (conId % 400);
  const dp = isFx ? 5 : 2;
  let price = base;
  let drift = 0;
  let left = 0;
  const bars = [];
  for (const t of times) {
    if (left-- <= 0) { // cambia el "régimen" cada cierto número de velas
      drift = (rand() - 0.5) * 2.4 * VOL[tf];
      left = 8 + Math.floor(rand() * 22);
    }
    const open = price;
    const body = (rand() - 0.5) * 2 * VOL[tf] * price + drift * price;
    const close = Math.max(isFx ? 0.5 : 1, open + body);
    const wick = () => rand() * VOL[tf] * 0.8 * price;
    const high = Math.max(open, close) + wick();
    const low = Math.min(open, close) - wick();
    bars.push({ t, o: +open.toFixed(dp), h: +high.toFixed(dp), l: +low.toFixed(dp), c: +close.toFixed(dp), v: isFx ? 0 : Math.floor(rand() * 1e6) });
    price = close;
  }
  return bars;
}

export class MockClient {
  connect() {}
  shutdown() {}
  status() { return { connected: true, mock: true, host: 'mock', port: 0, lastError: null }; }
  async searchSymbols(q) {
    const s = q.trim().toUpperCase();
    const stocks = SYMBOLS.filter((x) => x.symbol.startsWith(s) || x.name.includes(s)).map((x) => ({ ...x, hasFutures: false }));
    const fx = matchForexPairs(q).map((m) => ({
      conId: 12000000 + [...m.pair].reduce((a, ch) => a + ch.charCodeAt(0) * 7, 0),
      symbol: m.base, secType: 'CASH', exchange: 'IDEALPRO', currency: m.quote, name: `Forex ${m.pair}`, hasFutures: false,
    }));
    return [...stocks, ...fx];
  }
  async getBars(descriptor, tf) {
    if (!TIMEFRAMES[tf]) throw new Error('timeframe inválido');
    await new Promise((r) => setTimeout(r, 120)); // simula latencia
    return { tf, dateOnly: tf === '1D', bars: generateBars(descriptor.conId, tf, descriptor.secType === 'CASH'), cached: false };
  }
}
