import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, TIMEFRAMES, SUPPORTED_SEC_TYPES } from './config.js';
import { createProvider } from './providers.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const provider = createProvider();
provider.connect();

const app = express();
app.disable('x-powered-by');

app.use(express.static(path.join(root, 'public')));
// lightweight-charts is served from node_modules (no CDN, works offline)
app.use('/vendor', express.static(path.join(root, 'node_modules/lightweight-charts/dist')));

const SAFE = /^[A-Za-z0-9 .\-_]{0,24}$/;

// Error codes keep their historical `ib_` names so the frontend stays provider-agnostic.
function sendError(res, e) {
  const code = e.code ?? e.ibCode;
  if (code === 'NOT_CONNECTED' || code === 'DISCONNECTED') {
    return res.status(503).json({ error: 'ib_not_connected', message: e.message });
  }
  if (code === 'TIMEOUT') return res.status(504).json({ error: 'timeout', message: e.message });
  if (code === 'UNSUPPORTED') return res.status(422).json({ error: 'unsupported', message: e.message });
  console.warn('[api]', code ?? '', e.message);
  return res.status(502).json({ error: 'ib_error', code: code ?? null, message: e.message });
}

app.get('/api/status', (_req, res) => res.json({ ...provider.status(), timeframes: Object.keys(TIMEFRAMES), lang: config.lang }));

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 1 || !SAFE.test(q)) return res.json({ results: [] });
  try {
    res.json({ results: (await provider.searchSymbols(q)).slice(0, 25) });
  } catch (e) { sendError(res, e); }
});

app.get('/api/bars', async (req, res) => {
  const { conId, symbol = '', secType, exchange = '', currency = '', tf } = req.query;
  if (!TIMEFRAMES[tf]) return res.status(400).json({ error: 'bad_request', message: 'invalid tf' });
  if (!/^\d{1,12}$/.test(String(conId))) return res.status(400).json({ error: 'bad_request', message: 'invalid conId' });
  if (!SUPPORTED_SEC_TYPES.includes(secType)) return res.status(400).json({ error: 'bad_request', message: 'unsupported secType' });
  if (![symbol, exchange, currency].every((v) => SAFE.test(String(v)))) {
    return res.status(400).json({ error: 'bad_request', message: 'invalid parameters' });
  }
  try {
    const out = await provider.getBars({ conId: Number(conId), symbol, secType, exchange, currency }, tf);
    res.json(out);
  } catch (e) { sendError(res, e); }
});

const server = app.listen(config.port, config.host, () => {
  console.log(`\n  market-structure → http://${config.host}:${config.port}`);
  const where = {
    mock: 'MOCK mode (simulated data)',
    ibkr: `IBKR at ${config.ib.host}:${config.ib.port}  (clientId ${config.ib.clientId})`,
    alpaca: `Alpaca market data (${config.alpaca.paper ? 'paper' : 'live'} keys, feed ${config.alpaca.feed})`,
  }[config.provider];
  console.log(`  ${where}\n`);
});

function shutdown() {
  provider.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
