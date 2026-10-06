// Favorites stored in a cookie (shared by every tab of the same origin).
// Format: compact JSON [[symbol, conId, secType, exchange, currency, name], ...]
// Cookies hold at most ~4 KB, so when that is exceeded the oldest ones are dropped.

const COOKIE = 'ms_favs';
const MAX_ENCODED = 3500;

export function readFavs() {
  try {
    const row = document.cookie.split('; ').find((r) => r.startsWith(COOKIE + '='));
    if (!row) return [];
    const arr = JSON.parse(decodeURIComponent(row.slice(COOKIE.length + 1)));
    return arr
      .filter((a) => Array.isArray(a) && a.length >= 5)
      .map(([symbol, conId, secType, exchange, currency, name]) => ({ symbol, conId, secType, exchange, currency, name: name || '' }));
  } catch {
    return [];
  }
}

export function writeFavs(list) {
  let items = list.map((c) => [c.symbol, c.conId, c.secType, c.exchange || '', c.currency || '', (c.name || '').slice(0, 24)]);
  let enc = encodeURIComponent(JSON.stringify(items));
  while (enc.length > MAX_ENCODED && items.length) {
    items.shift();
    enc = encodeURIComponent(JSON.stringify(items));
  }
  document.cookie = `${COOKIE}=${enc}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
}

export const isFav = (c) => !!c && readFavs().some((f) => f.conId === c.conId);

/** Adds or removes the contract. Returns true if it ended up as a favorite. */
export function toggleFav(c) {
  const list = readFavs();
  const i = list.findIndex((f) => f.conId === c.conId);
  if (i >= 0) list.splice(i, 1);
  else list.push(c);
  writeFavs(list);
  return i < 0;
}

export function removeFav(conId) {
  writeFavs(readFavs().filter((f) => f.conId !== conId));
}
