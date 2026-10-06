// Cliente del backend + normalización de tiempos.
//
// lightweight-charts dibuja los tiempos como UTC. Para ver la hora de la bolsa
// (y no UTC) desplazamos cada vela por el offset de la zona horaria de visualización.
// Es solo cosmético: el precio y el orden no cambian.

export const DISPLAY_TZ = 'America/New_York';

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TZ, hourCycle: 'h23',
  year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});
const offsetCache = new Map();

function tzOffsetSec(t) {
  const bucket = Math.floor(t / 1800);
  let off = offsetCache.get(bucket);
  if (off === undefined) {
    const tb = bucket * 1800;
    const parts = fmt.formatToParts(new Date(tb * 1000));
    const g = (type) => Number(parts.find((p) => p.type === type).value);
    off = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) / 1000 - tb;
    offsetCache.set(bucket, off);
  }
  return off;
}

async function getJSON(url, signal) {
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('No se pudo contactar al servidor local');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || `Error ${res.status}`);
    err.status = res.status;
    err.code = body.error;
    throw err;
  }
  return body;
}

export const getStatus = (signal) => getJSON('/api/status', signal);

export async function searchSymbols(q, signal) {
  const { results } = await getJSON(`/api/search?q=${encodeURIComponent(q)}`, signal);
  return results;
}

export async function fetchBars(contract, tf, signal) {
  const p = new URLSearchParams({
    conId: contract.conId, symbol: contract.symbol, secType: contract.secType,
    exchange: contract.exchange || '', currency: contract.currency || '', tf,
  });
  const { bars, dateOnly } = await getJSON(`/api/bars?${p}`, signal);
  const out = [];
  for (const b of bars) {
    let t = b.t;
    if (!dateOnly) {
      t += tzOffsetSec(t);
      if (tf === '1D') t -= ((t % 86400) + 86400) % 86400; // vela diaria = medianoche de su día
    }
    if (out.length && t <= out[out.length - 1].time) continue;
    out.push({ time: t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v || 0 });
  }
  return out;
}

export const displayName = (c) => (c.secType === 'CASH' ? `${c.symbol}.${c.currency}` : c.symbol);
