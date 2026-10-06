import { IBApi, EventName, isNonFatalError } from '@stoqey/ib';
import { config, TIMEFRAMES, SUPPORTED_SEC_TYPES } from './config.js';
import { matchForexPairs, looksLikePair } from './forex.js';

/** Converts IB's `time` field to epoch seconds. */
function parseIbTime(s) {
  if (/^\d{8}$/.test(s)) {
    // Daily bars may arrive as yyyymmdd (no time)
    const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8);
    return { t: Date.UTC(y, m - 1, d) / 1000, dateOnly: true };
  }
  if (/^\d+$/.test(s)) return { t: Number(s), dateOnly: false };
  const parsed = Date.parse(s);
  return { t: Math.floor(parsed / 1000), dateOnly: false };
}

/** Builds the IB Contract from the descriptor returned by the search. */
export function buildContract(c) {
  const base = { conId: c.conId, symbol: c.symbol, secType: c.secType, currency: c.currency };
  if (c.secType === 'STK') return { ...base, exchange: 'SMART' };
  if (c.secType === 'CASH') return { ...base, exchange: 'IDEALPRO' };
  return { ...base, exchange: c.exchange }; // IND or others: native exchange
}

export class IBClient {
  constructor() {
    this.ib = new IBApi({ host: config.ib.host, port: config.ib.port, clientId: config.ib.clientId });
    this.ready = false;
    this.lastError = null;
    this.nextId = 1;
    this.pending = new Map();   // reqId -> { resolve, reject, timer, data, kind }
    this.cache = new Map();     // key -> { at, value }
    this.inflight = new Map();  // key -> Promise (coalescing)
    this.queue = Promise.resolve();
    this.fxConIds = new Map();  // 'EUR.USD' -> conId (never changes)
    this.reconnectTimer = null;
    this._wire();
  }

  _wire() {
    const ib = this.ib;

    ib.on(EventName.connected, () => console.log(`[ib] socket connected (${config.ib.host}:${config.ib.port})`));

    ib.on(EventName.nextValidId, (id) => {
      this.nextId = Math.max(this.nextId, id);
      this.ready = true;
      this.lastError = null;
      try { ib.reqMarketDataType(config.marketDataType); } catch { /* not critical */ }
      console.log('[ib] ready to request data');
    });

    ib.on(EventName.disconnected, () => {
      if (this.ready) console.warn('[ib] disconnected');
      this.ready = false;
      this._failAll(Object.assign(new Error('Connection to IB lost'), { ibCode: 'DISCONNECTED' }));
      this._scheduleReconnect();
    });

    ib.on(EventName.error, (err, code, reqId) => {
      const p = this.pending.get(reqId);
      if (p && !isNonFatalError(code, err)) {
        this._settle(reqId, 'reject', Object.assign(new Error(err.message), { ibCode: code }));
        return;
      }
      if (reqId === -1 || reqId === undefined) {
        // Informational messages (2104, 2106, 2158 = data farm OK) are not real errors
        if (code >= 2100 && code < 3000) return;
        this.lastError = `${code}: ${err.message}`;
        console.warn(`[ib] ${this.lastError}`);
        if (code === 502 || code === 504) this._scheduleReconnect();
      }
    });

    ib.on(EventName.historicalData, (reqId, time, o, h, l, c, v) => {
      const p = this.pending.get(reqId);
      if (!p || p.kind !== 'bars') return;
      if (typeof time === 'string' && time.startsWith('finished')) {
        this._settle(reqId, 'resolve', p.data);
        return;
      }
      const { t, dateOnly } = parseIbTime(String(time));
      if (o < 0 || h < 0 || l < 0 || c < 0) return; // IB uses -1 for "no data"
      p.data.push({ t, o, h, l, c, v: v > 0 ? v : 0 }); // forex (MIDPOINT) comes with volume -1
      p.dateOnly = dateOnly;
    });

    ib.on(EventName.contractDetails, (reqId, details) => {
      const p = this.pending.get(reqId);
      if (p && p.kind === 'details') p.data.push(details);
    });

    ib.on(EventName.contractDetailsEnd, (reqId) => {
      const p = this.pending.get(reqId);
      if (p && p.kind === 'details') this._settle(reqId, 'resolve', p.data);
    });

    ib.on(EventName.symbolSamples, (reqId, descriptions) => {
      const p = this.pending.get(reqId);
      if (!p || p.kind !== 'search') return;
      this._settle(reqId, 'resolve', descriptions || []);
    });
  }

  connect() {
    try { this.ib.connect(); } catch (e) { this.lastError = e.message; this._scheduleReconnect(); }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.ready) this.connect();
    }, 5000);
  }

  _settle(reqId, how, value) {
    const p = this.pending.get(reqId);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(reqId);
    if (how === 'resolve') p.resolve(p.kind === 'bars' ? { bars: p.data, dateOnly: !!p.dateOnly } : value);
    else p.reject(value);
  }

  _failAll(err) {
    for (const reqId of [...this.pending.keys()]) this._settle(reqId, 'reject', err);
  }

  _request(kind, send) {
    if (!this.ready) {
      return Promise.reject(Object.assign(new Error('No connection to IB Gateway/TWS'), { ibCode: 'NOT_CONNECTED' }));
    }
    const reqId = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (kind === 'bars') { try { this.ib.cancelHistoricalData(reqId); } catch { /* ignore */ } }
        this._settle(reqId, 'reject', Object.assign(new Error('Timed out waiting for IB'), { ibCode: 'TIMEOUT' }));
      }, config.requestTimeoutMs);
      this.pending.set(reqId, { resolve, reject, timer, data: [], kind });
      try { send(reqId); } catch (e) { this._settle(reqId, 'reject', e); }
    });
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

  /** Serializes historical requests with a pause between them (IB pacing). */
  _enqueueHistorical(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, config.historicalGapMs)));
    return run;
  }

  /** Resolves the conId of a forex pair (IB does not return it in the text search). */
  async _resolveForex({ pair, base, quote }) {
    if (this.fxConIds.has(pair)) return this.fxConIds.get(pair);
    const details = await this._request('details', (id) =>
      this.ib.reqContractDetails(id, { symbol: base, secType: 'CASH', exchange: 'IDEALPRO', currency: quote }),
    );
    const conId = details[0]?.contract?.conId;
    if (!conId) throw new Error(`IB could not resolve the pair ${pair}`);
    this.fxConIds.set(pair, conId);
    return conId;
  }

  async _searchForex(q) {
    const settled = await Promise.allSettled(
      matchForexPairs(q).map(async (m) => ({
        conId: await this._resolveForex(m), symbol: m.base, secType: 'CASH',
        exchange: 'IDEALPRO', currency: m.quote, name: `Forex ${m.pair}`, hasFutures: false,
      })),
    );
    const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    if (!ok.length && settled.length) throw settled[0].reason; // all failed
    return ok;
  }

  async _searchStocks(q) {
    const out = await this._cached(`search:${q}`, 600, async () => {
      const descs = await this._request('search', (id) => this.ib.reqMatchingSymbols(id, q));
      const results = [];
      for (const d of descs) {
        const c = d.contract;
        if (!c || !c.conId || !SUPPORTED_SEC_TYPES.includes(c.secType)) continue;
        results.push({
          conId: c.conId,
          symbol: c.symbol,
          secType: c.secType,
          exchange: c.primaryExch || c.exchange || '',
          currency: c.currency || '',
          name: c.description || '',
          hasFutures: (d.derivativeSecTypes || []).includes('FUT'),
        });
      }
      return { results };
    });
    return out.results;
  }

  async searchSymbols(pattern) {
    const q = pattern.trim().toUpperCase();
    // "EUR.USD" or "EURUSD" are not stock tickers: skip that search entirely
    const pairOnly = looksLikePair(q) && matchForexPairs(q).length > 0;
    const [stocks, fx] = await Promise.allSettled([
      pairOnly ? Promise.resolve([]) : this._searchStocks(q),
      this._searchForex(q),
    ]);
    const a = stocks.status === 'fulfilled' ? stocks.value : [];
    const b = fx.status === 'fulfilled' ? fx.value : [];
    if (!a.length && !b.length) {
      const failed = [stocks, fx].find((r) => r.status === 'rejected');
      if (failed) throw failed.reason;
    }
    return pairOnly ? [...b, ...a] : [...a, ...b];
  }

  async getBars(descriptor, tf) {
    const spec = TIMEFRAMES[tf];
    const key = `bars:${descriptor.conId}:${tf}`;
    return this._cached(key, spec.ttl, () =>
      this._enqueueHistorical(async () => {
        const contract = buildContract(descriptor);
        const whatToShow = descriptor.secType === 'CASH' ? 'MIDPOINT' : 'TRADES';
        const { bars, dateOnly } = await this._request('bars', (id) =>
          this.ib.reqHistoricalData(id, contract, undefined, spec.duration, spec.barSize, whatToShow, config.useRTH ? 1 : 0, 2, false),
        );
        bars.sort((a, b) => a.t - b.t);
        const dedup = bars.filter((b, i) => i === 0 || b.t !== bars[i - 1].t);
        return { tf, dateOnly, bars: dedup };
      }),
    );
  }

  status() {
    return { connected: this.ready, mock: false, host: config.ib.host, port: config.ib.port, lastError: this.lastError };
  }

  shutdown() {
    clearTimeout(this.reconnectTimer);
    try { this.ib.disconnect(); } catch { /* ignore */ }
  }
}
