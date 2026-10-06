// Alpaca market data provider (US stocks and ETFs).
//
// Read-only by construction: the only HTTP method used is GET, and only against the
// market data (bars), assets (symbol list) and clock (key check) endpoints. Nothing here
// touches orders, positions or the account.
//
// Not supported: forex (Alpaca serves FX data to broker partners only) and indices.
import { config as defaultConfig, TIMEFRAMES } from './config.js';

const DATA_URL = 'https://data.alpaca.markets';
const TRADING_URL = { paper: 'https://paper-api.alpaca.markets', live: 'https://api.alpaca.markets' };

// IB-style durations in TIMEFRAMES ('2 Y', '6 M', '3 W') → days back from now
const UNIT_DAYS = { D: 1, W: 7, M: 31, Y: 366 };
export function durationDays(duration) {
  const [n, unit] = String(duration).trim().split(/\s+/);
  return Number(n) * (UNIT_DAYS[unit] ?? 1);
}

// Alpaca timeframe per app timeframe. With RTH, 4H is built from 30Min bars so the
// candles start at 9:30 and 13:30 New York, like IB's.
export function alpacaTimeframe(tf, useRTH) {
  return { '1D': '1Day', '4H': useRTH ? '30Min' : '4Hour', '15m': '15Min', '10m': '10Min' }[tf];
}

const nyFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
/** New York date ('2026-10-06') and minute of day for an epoch in seconds. */
export function nyClock(t) {
  const p = Object.fromEntries(nyFmt.formatToParts(new Date(t * 1000)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) };
}

const RTH_OPEN = 9 * 60 + 30;
const RTH_CLOSE = 16 * 60;
const RTH_SPLIT = 13 * 60 + 30; // second 4H candle of the session

/** Keeps only bars that start inside regular trading hours (9:30–16:00 New York). */
export function filterRTH(bars) {
  return bars.filter((b) => {
    const { minute } = nyClock(b.t);
    return minute >= RTH_OPEN && minute < RTH_CLOSE;
  });
}

/** Groups RTH intraday bars into two candles per session: 9:30–13:30 and 13:30–16:00. */
export function aggregateSession4H(bars) {
  const out = [];
  let key = null;
  for (const b of bars) {
    const { day, minute } = nyClock(b.t);
    const k = `${day}/${minute < RTH_SPLIT ? 0 : 1}`;
    const last = out[out.length - 1];
    if (k !== key || !last) {
      out.push({ ...b });
      key = k;
    } else {
      last.h = Math.max(last.h, b.h);
      last.l = Math.min(last.l, b.l);
      last.c = b.c;
      last.v += b.v;
    }
  }
  return out;
}

/** Stable numeric id for a symbol (the UI and favorites identify instruments by a numeric conId). */
export function symbolId(symbol) {
  let h = 0x811c9dc5;
  for (const ch of `alpaca:${symbol}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h + 1; // never 0
}

function err(message, code) {
  return Object.assign(new Error(message), { code });
}

export class AlpacaClient {
  /** `fetch` and `config` are injectable for tests. */
  constructor({ config = defaultConfig, fetch: fetchFn = globalThis.fetch } = {}) {
    this.cfg = config;
    this.fetch = fetchFn;
    this.tradingUrl = config.alpaca.paper ? TRADING_URL.paper : TRADING_URL.live;
    this.ready = false;
    this.lastError = null;
    this.cache = new Map();    // key -> { at, value }
    this.inflight = new Map(); // key -> Promise (coalescing)
    this.retryTimer = null;
  }

  _hasKeys() {
    return Boolean(this.cfg.alpaca.keyId && this.cfg.alpaca.secretKey);
  }

  /** The single place that talks to Alpaca. GET only. */
  async _get(base, path, params = {}) {
    const url = new URL(path, base);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, v);
    let res;
    try {
      res = await this.fetch(url, {
        method: 'GET',
        headers: { 'APCA-API-KEY-ID': this.cfg.alpaca.keyId, 'APCA-API-SECRET-KEY': this.cfg.alpaca.secretKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.cfg.requestTimeoutMs),
      });
    } catch (e) {
      if (e.name === 'TimeoutError') throw err('Timed out waiting for Alpaca', 'TIMEOUT');
      throw err(`Could not reach Alpaca: ${e.message}`, 'NOT_CONNECTED');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body.message || res.statusText || 'request failed';
      if (res.status === 401 || res.status === 403) {
        this.ready = false;
        this.lastError = `${res.status}: ${msg}`;
      }
      throw err(`Alpaca ${res.status}: ${msg}`, res.status);
    }
    return body;
  }

  /** Checks the keys with a harmless call (market clock). Retries every 30 s while it fails. */
  async connect() {
    clearTimeout(this.retryTimer);
    if (!this._hasKeys()) {
      this.ready = false;
      this.lastError = 'Missing ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY (see .env.example)';
      console.warn(`[alpaca] ${this.lastError}`);
      return;
    }
    try {
      await this._get(this.tradingUrl, '/v2/clock');
      this.ready = true;
      this.lastError = null;
      console.log(`[alpaca] keys OK (${this.cfg.alpaca.paper ? 'paper' : 'live'}, feed ${this.cfg.alpaca.feed})`);
    } catch (e) {
      this.ready = false;
      this.lastError = e.message;
      console.warn(`[alpaca] ${e.message}`);
      this.retryTimer = setTimeout(() => this.connect(), 30000);
      this.retryTimer.unref?.();
    }
  }

  _requireReady() {
    if (!this.ready) throw err(this.lastError || 'Not connected to Alpaca', 'NOT_CONNECTED');
  }

  _cached(key, ttlSec, producer) {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < ttlSec * 1000) return Promise.resolve({ ...hit.value, cached: true });
    if (this.inflight.has(key)) return this.inflight.get(key);
    const p = producer()
      .then((value) => { this.cache.set(key, { at: Date.now(), value }); return { ...value, cached: false }; })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  /** Active US equities, fetched once and kept for 12 h (Alpaca has no text search endpoint). */
  async _assets() {
    const { list } = await this._cached('assets', 12 * 3600, async () => {
      const raw = await this._get(this.tradingUrl, '/v2/assets', { status: 'active', asset_class: 'us_equity' });
      return { list: (Array.isArray(raw) ? raw : []).filter((a) => a.symbol) };
    });
    return list;
  }

  async searchSymbols(pattern) {
    this._requireReady();
    const q = pattern.trim().toUpperCase();
    if (!q) return [];
    const assets = await this._assets();
    const exact = [], prefix = [], byName = [];
    for (const a of assets) {
      const sym = a.symbol.toUpperCase();
      if (sym === q) exact.push(a);
      else if (sym.startsWith(q)) prefix.push(a);
      else if (q.length >= 3 && String(a.name || '').toUpperCase().includes(q)) byName.push(a);
    }
    prefix.sort((a, b) => a.symbol.length - b.symbol.length || a.symbol.localeCompare(b.symbol));
    return [...exact, ...prefix, ...byName].slice(0, 25).map((a) => ({
      conId: symbolId(a.symbol),
      symbol: a.symbol,
      secType: 'STK',
      exchange: a.exchange || '',
      currency: 'USD',
      name: a.name || '',
      hasFutures: false,
    }));
  }

  async _fetchBars(symbol, timeframe, startSec) {
    const params = {
      symbols: symbol, timeframe, start: new Date(startSec * 1000).toISOString(),
      limit: 10000, adjustment: 'split', feed: this.cfg.alpaca.feed, sort: 'asc',
    };
    // Free plans may read SIP only with a 15-minute delay
    if (this.cfg.alpaca.feed === 'sip') params.end = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    const out = [];
    for (let page = 0; page < 20; page++) {
      const body = await this._get(DATA_URL, '/v2/stocks/bars', params);
      for (const b of body.bars?.[symbol] ?? []) {
        out.push({ t: Math.floor(Date.parse(b.t) / 1000), o: b.o, h: b.h, l: b.l, c: b.c, v: b.v > 0 ? b.v : 0 });
      }
      if (!body.next_page_token) break;
      params.page_token = body.next_page_token;
    }
    return out;
  }

  async getBars(descriptor, tf) {
    const spec = TIMEFRAMES[tf];
    if (!spec) throw err('invalid timeframe', 'BAD_REQUEST');
    if (descriptor.secType !== 'STK') {
      throw err(`Alpaca does not provide data for ${descriptor.secType === 'CASH' ? 'forex' : descriptor.secType} (US stocks and ETFs only)`, 'UNSUPPORTED');
    }
    this._requireReady();
    const symbol = String(descriptor.symbol).toUpperCase();
    const useRTH = this.cfg.useRTH;
    return this._cached(`bars:${symbol}:${tf}:${useRTH ? 1 : 0}`, spec.ttl, async () => {
      const startSec = Math.floor(Date.now() / 1000) - durationDays(spec.duration) * 86400;
      let bars = await this._fetchBars(symbol, alpacaTimeframe(tf, useRTH), startSec);
      bars.sort((a, b) => a.t - b.t);
      bars = bars.filter((b, i) => i === 0 || b.t !== bars[i - 1].t);
      if (tf !== '1D' && useRTH) {
        bars = filterRTH(bars);
        if (tf === '4H') bars = aggregateSession4H(bars);
      }
      return { tf, dateOnly: false, bars };
    });
  }

  status() {
    return {
      connected: this.ready, mock: false, provider: 'Alpaca',
      target: `${this.cfg.alpaca.paper ? 'paper' : 'live'} · ${this.cfg.alpaca.feed}`, lastError: this.lastError,
    };
  }

  shutdown() {
    clearTimeout(this.retryTimer);
  }
}
