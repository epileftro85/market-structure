// reqMatchingSymbols de IB no devuelve pares de forex, así que el buscador los completa
// con esta lista de pares IDEALPRO y luego resuelve su conId con reqContractDetails.

export const FOREX_PAIRS = [
  'EUR.USD', 'GBP.USD', 'USD.JPY', 'USD.CHF', 'AUD.USD', 'USD.CAD', 'NZD.USD',
  'EUR.GBP', 'EUR.JPY', 'GBP.JPY', 'EUR.CHF', 'EUR.AUD', 'AUD.JPY', 'USD.MXN',
].map((p) => {
  const [base, quote] = p.split('.');
  return { pair: p, base, quote };
});

const normalize = (q) => q.toUpperCase().replace(/[^A-Z]/g, '');

/** ¿La consulta parece un par? ("EUR.USD", "eur/usd", "EURUSD") → se prioriza sobre las acciones. */
export function looksLikePair(q) {
  return /^[A-Za-z]{3}\s*[./ -]\s*[A-Za-z]{3}$/.test(q.trim()) || /^[A-Za-z]{6}$/.test(q.trim());
}

/** Pares que coinciden con el texto buscado (EUR, EURUSD, EUR.USD, usd/jpy, "eu"…). */
export function matchForexPairs(q) {
  const n = normalize(q);
  if (n.length < 2) return [];
  return FOREX_PAIRS.filter(({ base, quote }) => {
    const key = base + quote;
    return n.length >= 3 ? key.includes(n) : key.startsWith(n);
  });
}
