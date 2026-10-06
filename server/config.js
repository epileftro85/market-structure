import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Central configuration. Everything can be overridden with environment variables,
// either exported in the shell or written in a `.env` file at the repo root (see .env.example).
// Shell variables win over `.env`.
//
// Typical IB ports:
//   IB Gateway  paper 4002  |  live 4001
//   TWS         paper 7497  |  live 7496
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'), quiet: true });

export const PROVIDERS = ['ibkr', 'alpaca', 'mock'];

// Which data source to use: DATA_PROVIDER=ibkr (default) | alpaca | mock. MOCK=1 still forces mock.
function pickProvider() {
  if (process.env.MOCK === '1') return 'mock';
  const p = String(process.env.DATA_PROVIDER || 'ibkr').trim().toLowerCase();
  if (!PROVIDERS.includes(p)) {
    console.warn(`[config] unknown DATA_PROVIDER "${p}", using ibkr (valid: ${PROVIDERS.join(', ')})`);
    return 'ibkr';
  }
  return p;
}

const provider = pickProvider();

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '127.0.0.1', // local only: do not expose this to the network
  provider,
  mock: provider === 'mock',             // simulated data, no broker (to test the UI)
  // Default UI language: 'es' or 'en'. Each browser can switch it with the ES/EN button (cookie ms_lang).
  lang: process.env.APP_LANG === 'en' ? 'en' : 'es',
  ib: {
    host: process.env.IB_HOST || '127.0.0.1',
    port: Number(process.env.IB_PORT) || 4001,
    clientId: Number(process.env.IB_CLIENT_ID) || 17,
  },
  // Alpaca market data (read-only: only GET requests to the data and assets endpoints).
  // Paper and live accounts have different keys; ALPACA_PAPER=0 uses the live endpoints.
  alpaca: {
    keyId: process.env.ALPACA_API_KEY_ID || '',
    secretKey: process.env.ALPACA_API_SECRET_KEY || '',
    paper: process.env.ALPACA_PAPER !== '0',
    // iex = free for every account; sip = all US exchanges (free plans only get it 15 min delayed)
    feed: process.env.ALPACA_FEED === 'sip' ? 'sip' : 'iex',
  },
  // 1 = regular trading hours only (cleaner structure). 0 = includes pre/post market.
  useRTH: process.env.USE_RTH !== '0',
  // 3 = delayed. Without a market data subscription, IB delivers delayed data.
  marketDataType: Number(process.env.IB_MARKET_DATA_TYPE) || 3,
  // Minimum gap between historical requests (IB allows ~60 per 10 min).
  historicalGapMs: 350,
  requestTimeoutMs: 30000,
};

// Supported timeframes. `ttl` = seconds the server reuses the cache.
// Durations: more history = more candles to practice on, but heavier requests.
export const TIMEFRAMES = {
  '1D': { barSize: '1 day', duration: '2 Y', ttl: 300 },
  '4H': { barSize: '4 hours', duration: '6 M', ttl: 120 },
  '15m': { barSize: '15 mins', duration: '3 W', ttl: 60 },
  '10m': { barSize: '10 mins', duration: '2 W', ttl: 45 },
};

export const SUPPORTED_SEC_TYPES = ['STK', 'IND', 'CASH'];
