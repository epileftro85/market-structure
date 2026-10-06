import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, TIMEFRAMES, SUPPORTED_SEC_TYPES } from './config.js';
import { IBClient } from './ib.js';
import { MockClient } from './mock.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const provider = config.mock ? new MockClient() : new IBClient();
provider.connect();

const app = express();
app.disable('x-powered-by');

app.use(express.static(path.join(root, 'public')));
// lightweight-charts is served from node_modules (no CDN, works offline)
app.use('/vendor', express.static(path.join(root, 'node_modules/lightweight-charts/dist')));

const SAFE = /^[A-Za-z0-9 .\-_]{0,24}$/;

function sendError(res, e) {
  if (e.ibCode === 'NOT_CONNECTED' || e.ibCode === 'DISCONNECTED') {
    return res.status(503).json({ error: 'ib_not_connected', message: e.message });
  }
  if (e.ibCode === 'TIMEOUT') return res.status(504).json({ error: 'timeout', message: e.message });
  console.warn('[api]', e.ibCode ?? '', e.message);
  return res.status(502).json({ error: 'ib_error', code: e.ibCode ?? null, message: e.message });
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
  console.log(config.mock ? '  MOCK mode (simulated data)\n' : `  IB at ${config.ib.host}:${config.ib.port}  (clientId ${config.ib.clientId})\n`);
});

function shutdown() {
  provider.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
