// Detección de estructura de mercado. Módulo PURO: velas entran, marcas salen.
// No depende del navegador ni de Node, así que se prueba con `npm test`.
//
// Definiciones (las mismas que usan indicadores populares tipo "Smart Money Concepts"):
//
//  • Swing high  : vela cuyo máximo es mayor que el de las `n` velas anteriores y
//                  mayor o igual que el de las `n` posteriores.
//  • Swing low   : lo mismo a la inversa.
//  • Un swing solo se CONFIRMA `n` velas después de formarse. Por eso las marcas
//    más recientes pueden aparecer "tarde": es inherente a cualquier indicador de swings.
//  • Etiquetas   : cada swing se compara con el anterior de su mismo tipo
//                  high:  HH (más alto) / LH (más bajo)
//                  low :  HL (más alto) / LL (más bajo)
//  • Ruptura     : cuando el precio supera el último swing high (o pierde el último
//                  swing low) todavía no roto.
//        - Si va A FAVOR de la tendencia vigente  → BOS   (Break of Structure)
//        - Si va EN CONTRA de la tendencia vigente → CHoCH (Change of Character)
//        - La primera ruptura del gráfico fija la tendencia y se marca como BOS.
//  • `breakBy`   : 'close' (cierre más allá del nivel) o 'wick' (basta la mecha).
//
// Formato de velas de entrada: { time, open, high, low, close }

/**
 * @param {Array<{time:number, open:number, high:number, low:number, close:number}>} bars
 * @param {{n?:number, breakBy?:'close'|'wick'}} [opts]
 */
export function detectStructure(bars, opts = {}) {
  const n = Math.max(1, Math.floor(opts.n ?? 3));
  const breakBy = opts.breakBy === 'wick' ? 'wick' : 'close';

  const pivots = [];
  const breaks = [];
  let trend = null; // 'bull' | 'bear' | null

  let lastHighPivot = null; // último pivot high confirmado (para etiquetar HH/LH)
  let lastLowPivot = null;  // último pivot low confirmado (para etiquetar HL/LL)
  let activeHigh = null;    // nivel de swing high aún no roto
  let activeLow = null;     // nivel de swing low aún no roto

  for (let i = 0; i < bars.length; i++) {
    // 1) ¿Se confirma un pivote ahora? El candidato es la vela i-n.
    const p = i - n;
    if (p >= n) {
      if (isSwingHigh(bars, p, n)) {
        const piv = {
          type: 'high', index: p, time: bars[p].time, price: bars[p].high, confirmedIndex: i,
          label: lastHighPivot ? (bars[p].high > lastHighPivot.price ? 'HH' : 'LH') : null,
        };
        pivots.push(piv);
        lastHighPivot = piv;
        activeHigh = { price: piv.price, index: p, time: piv.time };
      }
      if (isSwingLow(bars, p, n)) {
        const piv = {
          type: 'low', index: p, time: bars[p].time, price: bars[p].low, confirmedIndex: i,
          label: lastLowPivot ? (bars[p].low > lastLowPivot.price ? 'HL' : 'LL') : null,
        };
        pivots.push(piv);
        lastLowPivot = piv;
        activeLow = { price: piv.price, index: p, time: piv.time };
      }
    }

    // 2) ¿La vela actual rompe algún nivel activo?
    const bar = bars[i];
    const upSide = breakBy === 'wick' ? bar.high : bar.close;
    const downSide = breakBy === 'wick' ? bar.low : bar.close;

    let broke = false;
    if (activeHigh && upSide > activeHigh.price) {
      breaks.push({
        kind: trend === 'bear' ? 'CHoCH' : 'BOS', dir: 'bull',
        level: activeHigh.price, fromIndex: activeHigh.index, fromTime: activeHigh.time,
        index: i, time: bar.time,
      });
      trend = 'bull';
      activeHigh = null;
      broke = true;
    }
    if (!broke && activeLow && downSide < activeLow.price) {
      breaks.push({
        kind: trend === 'bull' ? 'CHoCH' : 'BOS', dir: 'bear',
        level: activeLow.price, fromIndex: activeLow.index, fromTime: activeLow.time,
        index: i, time: bar.time,
      });
      trend = 'bear';
      activeLow = null;
    }
  }

  return { pivots, breaks, trend, active: { high: activeHigh, low: activeLow }, params: { n, breakBy } };
}

function isSwingHigh(bars, p, n) {
  const h = bars[p].high;
  for (let j = 1; j <= n; j++) {
    if (bars[p - j].high >= h) return false; // izquierda: estrictamente mayor
    if (bars[p + j].high > h) return false;  // derecha: mayor o igual
  }
  return true;
}

function isSwingLow(bars, p, n) {
  const l = bars[p].low;
  for (let j = 1; j <= n; j++) {
    if (bars[p - j].low <= l) return false;
    if (bars[p + j].low < l) return false;
  }
  return true;
}
