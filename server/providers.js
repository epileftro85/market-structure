// Data provider strategy. Every provider implements the same interface:
//
//   connect()                      start the connection (or key check); never throws
//   shutdown()                     release sockets/timers
//   status()                       { connected, mock, provider, target, lastError }
//   searchSymbols(q)            →  [{ conId, symbol, secType, exchange, currency, name, hasFutures }]
//   getBars(descriptor, tf)     →  { tf, dateOnly, bars: [{ t, o, h, l, c, v }], cached }
//
// Errors carry `code`: NOT_CONNECTED / DISCONNECTED / TIMEOUT / UNSUPPORTED, or the provider's own code.
// Pick one with DATA_PROVIDER in .env (ibkr | alpaca | mock).
import { config } from './config.js';
import { IBClient } from './ib.js';
import { AlpacaClient } from './alpaca.js';
import { MockClient } from './mock.js';

const FACTORIES = {
  ibkr: () => new IBClient(),
  alpaca: () => new AlpacaClient(),
  mock: () => new MockClient(),
};

export function createProvider(name = config.provider) {
  const make = FACTORIES[name];
  if (!make) throw new Error(`Unknown data provider "${name}" (valid: ${Object.keys(FACTORIES).join(', ')})`);
  return make();
}
