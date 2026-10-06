// Content of the contextual guide ("?" buttons) and mini-diagrams.
// Data only: app.js turns it into the side panel.
//
// Each entry:
//   key      identifier (used by the HTML's data-help="...")
//   group    guide section (key of GROUPS; the title is in GROUP_TITLES)
//   title    title
//   color    color it is drawn with on the chart
//   what     what it is (text)
//   read     how to read it on the chart (list)
//   rules    exact rule THIS app applies (list)
//   practice what to practice in order to learn
//   caveat   limits / warnings
//   toggles  switches that can be toggled from the guide: [{ k, label }]
//            k = indicator key, or '@sw' / '@st' (top bar checkboxes)
//   diagram  drawing key (optional). DIAGRAMS[k](lang) returns the SVG with labels in that language
//
// The English version of the content is in help.en.js (same keys, same toggles and diagrams).

export const C = {
  up: '#2ebd85', down: '#f6465d', bos: '#6ea8fe', choch: '#f5a524', eq: '#94a3b8',
  sweep: '#f472b6', mute: '#8b95a5', htf4: '#22d3ee', htf1: '#c084fc',
};

// ---------------------------------------------------------------- drawings
const svg = (inner) =>
  `<svg viewBox="0 0 230 110" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const ln = (x1, y1, x2, y2, c, { w = 1.5, d = '' } = {}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
const tx = (x, y, t, c, { a = 'middle', s = 10 } = {}) =>
  `<text x="${x}" y="${y}" fill="${c}" font-size="${s}" font-weight="600" text-anchor="${a}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">${t}</text>`;
const dot = (x, y, c, r = 2.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const poly = (pts, c, w = 1.6) =>
  `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const box = (x, y, w, h, c, { fill = 0.16, d = '' } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" fill-opacity="${fill}" stroke="${c}" stroke-opacity=".8" stroke-width="1.2"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
// y grows DOWNWARD (lower price). Green candle if it closes above its open (c < o in y).
const candle = (x, o, c, h, l) => {
  const col = c <= o ? C.up : C.down;
  return `${ln(x, h, x, l, col, { w: 1.2 })}<rect x="${x - 4}" y="${Math.min(o, c)}" width="8" height="${Math.max(2, Math.abs(o - c))}" fill="${col}"/>`;
};

// Drawing labels in the requested language (Spanish by default).
const L = (lang, es, en) => (lang === 'en' ? en : es);

export const DIAGRAMS = {
  swings: (lang) => svg([
    poly([[18, 88], [52, 52], [84, 70], [118, 24], [150, 56], [182, 40], [210, 78]], C.mute),
    ...[[18, 88], [52, 52], [84, 70], [118, 24], [150, 56], [182, 40], [210, 78]].map(([x, y]) => dot(x, y, '#cbd5e1')),
    tx(118, 17, 'HH', C.up), tx(182, 33, 'LH', C.down),
    tx(84, 84, 'HL', C.up), tx(150, 70, 'HL', C.up), tx(210, 92, 'LL', C.down),
    tx(52, 45, L(lang, 'primer swing', 'first swing'), C.mute, { s: 8 }),
  ].join('')),

  bos: (lang) => svg([
    poly([[16, 92], [58, 40], [92, 72], [150, 22]], C.mute),
    ln(58, 40, 129, 40, C.bos, { w: 1.4, d: '4 3' }),
    dot(58, 40, '#cbd5e1'), dot(129, 40, C.bos, 3.2),
    tx(94, 33, 'BOS', C.bos), tx(58, 56, 'swing high', C.mute, { s: 8 }),
    tx(150, 14, L(lang, 'cierra por encima', 'closes above'), C.mute, { s: 8, a: 'middle' }),
  ].join('')),

  choch: (lang) => svg([
    poly([[16, 92], [48, 62], [80, 76], [116, 28], [160, 92]], C.mute),
    ln(80, 76, 149, 76, C.choch, { w: 2 }),
    dot(80, 76, '#cbd5e1'), dot(149, 76, C.choch, 3.2),
    tx(114, 90, 'CHoCH', C.choch), tx(80, 62, 'HL', C.up), tx(116, 20, 'HH', C.up),
    tx(188, 80, L(lang, 'cierra por debajo', 'closes below'), C.mute, { s: 8 }),
  ].join('')),

  fvg: (lang) => svg([
    box(92, 36, 123, 18, C.up, { fill: 0.14, d: '3 3' }),
    ln(62, 54, 92, 54, C.up, { w: 1, d: '2 2' }), ln(92, 36, 122, 36, C.up, { w: 1, d: '2 2' }),
    candle(62, 70, 60, 54, 74), candle(92, 62, 26, 22, 66), candle(122, 30, 18, 14, 36),
    candle(170, 28, 46, 24, 50),
    tx(196, 48, 'FVG', C.up),
    tx(62, 100, L(lang, 'vela 1', 'candle 1'), C.mute, { s: 8 }), tx(92, 100, L(lang, 'vela 2', 'candle 2'), C.mute, { s: 8 }), tx(122, 100, L(lang, 'vela 3', 'candle 3'), C.mute, { s: 8 }),
    tx(170, 100, L(lang, 'vuelve al hueco', 'returns to the gap'), C.mute, { s: 8 }),
  ].join('')),

  ob: (lang) => svg([
    ln(12, 35, 102, 35, C.bos, { w: 1.2, d: '4 3' }), tx(56, 29, 'BOS', C.bos),
    box(50, 60, 168, 17, C.up, { fill: 0.2 }),
    candle(30, 76, 66, 62, 78), candle(54, 64, 74, 60, 77), // the 2nd one is the bearish candle (OB)
    candle(78, 72, 46, 43, 74), candle(102, 46, 26, 22, 48), candle(126, 28, 18, 14, 30),
    candle(152, 20, 50, 18, 54), candle(176, 52, 64, 50, 68), candle(200, 62, 34, 30, 66),
    tx(128, 73, 'OB', C.up),
    tx(54, 95, L(lang, 'última vela', 'last bearish'), C.mute, { s: 8 }), tx(54, 104, L(lang, 'bajista', 'candle'), C.mute, { s: 8 }),
    tx(176, 95, L(lang, 'el precio regresa', 'price returns'), C.mute, { s: 8 }),
  ].join('')),

  eq: (lang) => svg([
    poly([[16, 90], [58, 32], [94, 66], [132, 33], [172, 80], [210, 60]], C.mute),
    ln(58, 32, 192, 32, C.eq, { w: 1.4, d: '2 3' }),
    dot(58, 32, '#cbd5e1'), dot(132, 33, '#cbd5e1'),
    tx(95, 24, 'EQH', C.eq), tx(150, 14, L(lang, 'stops acumulados encima', 'stops resting above'), C.mute, { s: 8 }),
  ].join('')),

  sweep: (lang) => svg([
    poly([[16, 90], [60, 36], [96, 66]], C.mute),
    ln(60, 36, 132, 36, C.sweep, { w: 1.2, d: '1 3' }),
    dot(60, 36, '#cbd5e1'),
    candle(132, 46, 56, 24, 60), candle(158, 58, 80, 56, 84),
    tx(132, 14, '▼ sweep', C.sweep), tx(60, 28, 'swing high', C.mute, { s: 8 }),
    tx(185, 36, L(lang, 'mecha pasa,', 'wick goes past,'), C.mute, { s: 8 }), tx(185, 46, L(lang, 'cierre vuelve', 'close comes back'), C.mute, { s: 8 }),
  ].join('')),

  eq_form: (lang) => svg([
    poly([[14, 92], [52, 36], [92, 72], [130, 37], [170, 74], [212, 58]], C.mute),
    ln(52, 36, 206, 36, C.eq, { w: 1.4, d: '2 3' }),
    dot(52, 36, '#cbd5e1'), dot(130, 37, '#cbd5e1'),
    tx(52, 27, L(lang, 'máx. 1', 'high 1'), C.mute, { s: 8 }), tx(91, 27, 'EQH', C.eq), tx(130, 27, L(lang, 'máx. 2', 'high 2'), C.mute, { s: 8 }),
    tx(178, 27, '× × ×  stops', C.sweep, { s: 8 }),
    tx(115, 104, L(lang, 'dos máximos a casi el mismo precio', 'two highs at almost the same price'), C.mute, { s: 8 }),
  ].join('')),

  eq_sweep: (lang) => svg([
    ln(0, 40, 230, 40, C.eq, { w: 1.2, d: '2 3' }), tx(22, 34, 'EQH', C.eq),
    candle(64, 66, 54, 50, 70), candle(88, 56, 46, 43, 59), candle(112, 50, 44, 42, 53),
    candle(142, 44, 58, 20, 60), // wick above the level, closes below
    candle(168, 58, 72, 56, 75), candle(194, 72, 88, 70, 90),
    ln(152, 20, 152, 40, C.sweep, { w: 1 }), tx(158, 32, L(lang, 'mecha', 'wick'), C.sweep, { s: 8, a: 'start' }),
    tx(142, 13, '▼ sweep', C.sweep),
    tx(115, 104, L(lang, 'cierra de vuelta bajo el nivel', 'closes back below the level'), C.mute, { s: 8 }),
  ].join('')),

  eq_break: (lang) => svg([
    ln(0, 46, 230, 46, C.eq, { w: 1.2, d: '2 3' }), tx(22, 40, 'EQH', C.eq),
    candle(46, 74, 64, 60, 76), candle(70, 64, 54, 50, 66), candle(94, 56, 49, 47, 58),
    candle(124, 50, 26, 22, 52), // closes beyond the level
    candle(150, 28, 38, 26, 40), candle(176, 40, 48, 38, 50), candle(204, 48, 24, 20, 50),
    tx(124, 14, L(lang, 'cierra más allá', 'closes beyond'), C.bos, { s: 9 }),
    tx(176, 66, 'retest', C.mute, { s: 8 }), ln(176, 52, 176, 60, C.mute, { w: 1 }),
    tx(115, 104, L(lang, 'ruptura (no es barrido): hay aceptación arriba', 'break (not a sweep): price is accepted above'), C.mute, { s: 8 }),
  ].join('')),

  eq_measure: (lang) => svg([
    poly([[14, 94], [48, 34], [86, 72], [124, 44], [158, 72]], C.mute),
    ln(48, 34, 204, 34, C.eq, { w: 1.2, d: '2 3' }), ln(124, 44, 150, 44, C.eq, { w: 1, d: '2 3' }),
    dot(48, 34, '#cbd5e1'), dot(124, 44, '#cbd5e1'),
    ln(138, 34, 138, 44, C.choch, { w: 1.4 }), tx(146, 41, 'A', C.choch, { s: 9, a: 'start' }),
    ln(48, 98, 124, 98, C.choch, { w: 1.4 }), tx(86, 92, 'B', C.choch, { s: 9 }),
    candle(190, 46, 62, 14, 64),
    ln(176, 14, 176, 34, C.choch, { w: 1.4 }), tx(169, 28, 'C', C.choch, { s: 9, a: 'end' }),
    ln(206, 34, 206, 62, C.choch, { w: 1.4 }), tx(213, 52, 'D', C.choch, { s: 9, a: 'start' }),
    tx(48, 26, 'EQH', C.eq),
  ].join('')),

  choch_htf: (lang) => svg([
    tx(8, 10, L(lang, '4H · alcista', '4H · bullish'), C.up, { a: 'start', s: 9 }),
    poly([[14, 44], [54, 28], [86, 36], [128, 14], [168, 22], [214, 8]], C.up, 1.8),
    ln(0, 54, 230, 54, C.mute, { w: 0.8, d: '1 3' }),
    tx(8, 66, '15m · CHoCH ▼', C.choch, { a: 'start', s: 9 }),
    poly([[14, 100], [48, 78], [76, 90], [108, 72], [140, 98], [170, 88], [212, 76]], C.mute),
    ln(76, 90, 140, 90, C.choch, { w: 2 }),
    tx(108, 106, L(lang, 'solo un retroceso en la mayor?', 'just a pullback on the higher TF?'), C.mute, { s: 8 }),
  ].join('')),

  ext: (lang) => svg([
    poly([[14, 80], [30, 60], [42, 72], [58, 44], [72, 58], [88, 30], [104, 52], [118, 42], [134, 70], [150, 56], [166, 88], [182, 70], [198, 84], [214, 60]], C.mute, 1),
    poly([[14, 80], [88, 30], [166, 88], [214, 60]], C.choch, 2.6),
    tx(60, 24, L(lang, 'externa (n×3)', 'external (n×3)'), C.choch, { s: 9 }), tx(150, 40, L(lang, 'interna (n)', 'internal (n)'), C.mute, { s: 9 }),
  ].join('')),

  htf: (lang) => svg([
    ln(0, 28, 230, 28, C.htf4, { w: 1.4, d: '8 4' }), tx(224, 23, '4H swing high', C.htf4, { a: 'end', s: 8 }),
    ln(0, 78, 230, 78, C.htf1, { w: 1.2, d: '2 4' }), tx(224, 74, '1D BOS ▲', C.htf1, { a: 'end', s: 8 }),
    poly([[14, 96], [50, 64], [78, 80], [112, 48], [140, 62], [172, 34]], C.mute),
    tx(40, 100, L(lang, 'tu panel (15m / 10m)', 'your panel (15m / 10m)'), C.mute, { s: 8, a: 'start' }),
  ].join('')),
};

// ---------------------------------------------------------------- content
export const GROUPS = ['basic', 'zones', 'liquidity', 'advanced', 'context'];
export const GROUP_TITLES = {
  es: { basic: 'Estructura básica', zones: 'Zonas', liquidity: 'Liquidez', advanced: 'Estructura avanzada', context: 'Contexto' },
  en: { basic: 'Basic structure', zones: 'Zones', liquidity: 'Liquidity', advanced: 'Advanced structure', context: 'Context' },
};

export const HELP = [
  {
    key: 'swings', group: 'basic', title: 'Swings y etiquetas HH · HL · LH · LL', color: C.up,
    diagram: 'swings',
    toggles: [{ k: '@sw', label: 'Mostrar etiquetas HH/HL/LH/LL' }],
    what: 'Un swing high es un máximo local y un swing low un mínimo local. Cada swing se compara con el anterior del mismo tipo para describir la tendencia: HH (Higher High, máximo más alto), HL (Higher Low, mínimo más alto), LH (Lower High) y LL (Lower Low).',
    read: [
      'Tendencia alcista = secuencia de HH y HL. Tendencia bajista = secuencia de LH y LL.',
      'Verde = HH/HL. Rojo = LH/LL. Un punto gris es el primer swing de cada tipo (todavía no hay con qué compararlo).',
      'Cuando la secuencia se rompe (por ejemplo, aparece un LL tras una serie de HL) es una señal de posible cambio: es lo que se marca como CHoCH.',
    ],
    rules: [
      'Swing high: máximo mayor que el de las n velas anteriores y mayor o igual que el de las n posteriores. Swing low: lo mismo a la inversa.',
      'Un swing solo se confirma n velas después de formarse, por eso las marcas más recientes aparecen "tarde". Es inherente a cualquier indicador de swings.',
      'n se ajusta por panel con los botones − / + de su cabecera (por defecto 3).',
    ],
    practice: 'Marca a mano los swings en un gráfico, luego mira lo que marca la app y fíjate dónde difieren. Prueba n = 2, 3, 5 y observa qué swings aparecen y desaparecen.',
    caveat: 'No existe un n "correcto": n pequeño da mucho ruido, n grande da pocos swings y tardíos. Depende de la temporalidad y de lo que quieras estudiar.',
  },
  {
    key: 'bos', group: 'basic', title: 'BOS · Break of Structure', color: C.bos,
    diagram: 'bos',
    toggles: [{ k: '@st', label: 'Mostrar líneas BOS/CHoCH' }],
    what: 'Ruptura de estructura a favor de la tendencia vigente: en tendencia alcista, el precio supera el último swing high; en bajista, pierde el último swing low. Indica continuación de la tendencia.',
    read: [
      'Línea azul punteada desde el swing que se rompió hasta la vela que lo rompe, con la etiqueta BOS.',
      'La primera ruptura de todo el gráfico fija la tendencia y se marca como BOS.',
    ],
    rules: [
      'Por defecto la ruptura es por cierre: una vela debe cerrar más allá del nivel. Con "Ruptura: por mecha" basta que la mecha lo supere.',
      'Se evalúa contra el último swing aún no roto. Cada swing se rompe una sola vez.',
    ],
    practice: 'Antes de ver la marca, pregúntate: ¿cuál es el último swing sin romper? ¿Qué vela lo rompió y cerró más allá?',
    caveat: 'Un BOS describe lo que ya ocurrió; no predice que la tendencia vaya a continuar.',
  },
  {
    key: 'choch', group: 'basic', title: 'CHoCH · Change of Character', color: C.choch,
    diagram: 'choch',
    toggles: [{ k: '@st', label: 'Mostrar líneas BOS/CHoCH' }],
    what: 'Primera ruptura en contra de la tendencia vigente: en alcista, un cierre por debajo del último swing low (normalmente el HL); en bajista, por encima del último swing high (el LH). Es la primera señal de un posible cambio de tendencia.',
    read: [
      'Línea naranja sólida con la etiqueta CHoCH. Desde esa vela, la tendencia que muestra la cabecera del panel (▲ / ▼) cambia de signo.',
      'Después de un CHoCH, el siguiente movimiento en la nueva dirección se marcará como BOS.',
    ],
    rules: [
      'Mismo criterio que el BOS (cierre o mecha), pero en contra de la tendencia vigente.',
    ],
    practice: 'Compara las temporalidades: un CHoCH en 15m dentro de una tendencia alcista de 4H puede ser solo un retroceso dentro de la tendencia mayor. Es el motivo por el que conviene mirar varias a la vez (activa "Niveles de TF mayor").',
    caveat: 'Un CHoCH puede fallar: el precio puede volver y retomar la tendencia previa.',
  },
  {
    key: 'fvg', group: 'zones', title: 'FVG · Fair Value Gap', color: C.up,
    diagram: 'fvg', toggles: [{ k: 'fvg', label: 'Mostrar FVG' }],
    what: 'Hueco que deja un movimiento muy rápido: entre la mecha de la vela 1 y la de la vela 3 queda un rango que la vela 2 (impulsiva) no dejó "cubrir". La idea es que ahí hubo poca negociación y el precio a veces regresa a ese rango.',
    read: [
      'Rectángulo con borde punteado desde la vela central hacia la derecha: verde si el hueco es alcista (queda debajo del precio), rojo si es bajista.',
      'Cuando una vela lo llena por completo, desaparece.',
    ],
    rules: [
      'Alcista: el low de la vela 3 es mayor que el high de la vela 1. Bajista: el high de la vela 3 es menor que el low de la vela 1.',
      'Se ignoran huecos menores que 0.25 × ATR(14) para evitar ruido. Se muestran como máximo los 10 más recientes sin llenar.',
    ],
    practice: 'Observa qué hace el precio cuando regresa a un FVG: ¿rebota, lo atraviesa, lo llena a medias? Hazlo en distintas temporalidades.',
    caveat: 'Es una hipótesis visual, no una garantía. En temporalidades bajas aparecen muchos y la mayoría no tiene relevancia.',
  },
  {
    key: 'ob', group: 'zones', title: 'Order Block', color: C.up,
    diagram: 'ob', toggles: [{ k: 'ob', label: 'Mostrar Order Blocks' }],
    what: 'La última vela de dirección contraria antes del impulso que rompió la estructura. La idea es que ahí quedó una concentración de órdenes que el precio podría "respetar" cuando regrese.',
    read: [
      'Rectángulo de borde sólido con la etiqueta OB: verde (alcista, vela bajista previa a un impulso al alza) o rojo (bajista).',
      'Se prolonga hacia la derecha hasta que una vela cierra al otro lado de la zona (queda "mitigado") y entonces desaparece.',
    ],
    rules: [
      'Para cada BOS/CHoCH: entre el swing roto y la vela de ruptura se toma el extremo (el mínimo en una ruptura alcista, el máximo en una bajista).',
      'El OB es la última vela contraria en ese extremo o hasta 2 velas antes. La zona es su rango completo, de mecha a mecha.',
      'Se muestran como máximo los 6 más recientes sin mitigar.',
    ],
    practice: 'Identifica a mano el OB de una ruptura antes de activar el indicador. Luego observa si el precio regresó a la zona y cómo reaccionó.',
    caveat: 'Hay varias definiciones de OB (solo el cuerpo, la mecha completa, otra vela de la secuencia). Esta es una; si la tuya difiere es normal.',
  },
  {
    key: 'eq', group: 'liquidity', title: 'EQH / EQL · Equal Highs / Lows', color: C.eq,
    diagram: 'eq', toggles: [{ k: 'eq', label: 'Mostrar EQH / EQL' }],
    what: 'Dos máximos (o mínimos) consecutivos casi al mismo nivel. Se interpretan como liquidez: muchos participantes colocan sus stops justo encima de los máximos (o debajo de los mínimos), así que el precio puede ir a buscarlos.',
    read: [
      'Línea gris punteada que une los dos swings y se prolonga hacia la derecha hasta que el nivel se barre (sweep) o se rompe.',
    ],
    rules: [
      'Dos swings consecutivos del mismo tipo con diferencia de precio ≤ 0.1 × ATR(14). Usa los mismos swings del panel, así que depende de n.',
      'El nivel es el más extremo de los dos. Se muestran como máximo los 8 más recientes.',
    ],
    practice: 'Mira qué ocurre después de que un EQH es barrido: ¿reversión o continuación? Combínalo con "Sweeps".',
    caveat: 'La tolerancia (0.1 × ATR) es una elección de esta app; dos máximos que a ti te parecen iguales pueden quedar fuera, y al revés.',
  },
  {
    key: 'sweep', group: 'liquidity', title: 'Sweep · barrido de liquidez', color: C.sweep,
    diagram: 'sweep', toggles: [{ k: 'sweep', label: 'Mostrar Sweeps' }],
    what: 'La mecha supera un swing anterior (toma los stops que había allí) pero la vela cierra de vuelta dentro del rango. Es distinto de una ruptura (BOS/CHoCH), donde el cierre queda más allá del nivel.',
    read: [
      'Línea rosa punteada desde el swing hasta la vela, con ▼ sweep (barrió un máximo) o ▲ sweep (barrió un mínimo).',
    ],
    rules: [
      'Para cada swing confirmado se mira la primera vela que lo supera: si cierra de vuelta dentro es un sweep; si cierra más allá es una ruptura y no se marca aquí. Cada swing da como mucho un sweep.',
      'Se muestran como máximo los 12 más recientes.',
    ],
    practice: 'Un sweep seguido de un CHoCH en una temporalidad menor es un patrón clásico de estudio. Búscalos y revisa cuántas veces funcionó y cuántas no.',
    caveat: 'Si la ruptura está en modo "por mecha", la misma vela puede aparecer como BOS/CHoCH y como sweep, porque ambos criterios son independientes.',
  },
  {
    key: 'ext', group: 'advanced', title: 'Estructura externa (n × 3)', color: C.choch,
    diagram: 'ext', toggles: [{ k: 'ext', label: 'Mostrar estructura externa' }],
    what: 'Una segunda escala de estructura en el mismo gráfico. La interna (tu n) muestra los movimientos pequeños; la externa (n × 3) muestra solo los grandes.',
    read: [
      'Etiquetas en forma de píldora y líneas gruesas (BOS azul, CHoCH naranja), por encima de las marcas normales.',
      'Sirve para distinguir un retroceso interno dentro de un movimiento externo más grande.',
    ],
    rules: [
      'Es el mismo algoritmo con n triplicado: si n = 3, la externa usa n = 9.',
    ],
    practice: 'Busca CHoCH internos que no vengan acompañados de CHoCH externo y mira cómo termina cada caso.',
    caveat: 'El factor 3 es una convención de esta app, no un estándar.',
  },
  {
    key: 'htf', group: 'advanced', title: 'Niveles de TF mayor', color: C.htf4,
    diagram: 'htf', toggles: [{ k: 'htf', label: 'Mostrar niveles de TF mayor' }],
    what: 'Dibuja en cada panel los niveles vigentes de las temporalidades superiores, para ver si lo que marcas abajo está alineado con el contexto de arriba (análisis top-down).',
    read: [
      'Líneas horizontales con la etiqueta a la derecha: "4H swing high/low" (continua) y "4H BOS ▼" (punteada: nivel de la última ruptura y su dirección).',
      'Colores: 1D morado, 4H cian, 15m lima. La cabecera de cada panel ya muestra la tendencia (▲ / ▼) de su temporalidad.',
      'Pregunta clave en 15m / 10m: ¿el CHoCH que veo va a favor o en contra de la última ruptura de 4H y 1D?',
    ],
    rules: [
      'Swing high/low vigentes = los últimos sin romper según el n de esa temporalidad (cada panel usa su propio n). La última ruptura es la más reciente.',
      'Un panel solo recibe las temporalidades superiores a la suya (1D no recibe nada; 10m recibe 1D, 4H y 15m).',
      'Si alguna temporalidad no está visible (layout 1 o 2), la app la carga en segundo plano.',
    ],
    practice: 'Mira un CHoCH en 10m y revisa si está a favor o en contra de la tendencia de 4H y 1D. Anota cómo evoluciona en cada caso.',
    caveat: 'Las líneas que caen fuera del rango de precios visible no se dibujan; aleja el zoom para verlas.',
  },
  {
    key: 'ema', group: 'context', title: 'EMA 50 / EMA 200', color: '#93c5fd',
    toggles: [{ k: 'ema50', label: 'EMA 50' }, { k: 'ema200', label: 'EMA 200' }],
    what: 'Promedios móviles exponenciales: promedian los cierres dándole más peso a los recientes. Dan contexto de tendencia y de "velocidad" del precio.',
    read: [
      'EMA 50 (azul claro) reacciona más rápido; EMA 200 (blanca) representa una tendencia más lenta.',
      'Precio por encima de una EMA inclinada hacia arriba suele leerse como contexto alcista; por debajo y hacia abajo, bajista.',
    ],
    rules: [
      'EMA de los cierres, sembrada con la media simple de las primeras n velas. La EMA 200 necesita 200 velas; si no hay suficientes, el panel lo avisa.',
    ],
    practice: 'Compara cómo se comporta la estructura (BOS/CHoCH) cuando el precio está por encima o por debajo de la EMA 200.',
    caveat: 'Son indicadores rezagados: describen el pasado reciente.',
  },
  {
    key: 'vwap', group: 'context', title: 'VWAP diario', color: '#fbbf24',
    toggles: [{ k: 'vwap', label: 'VWAP' }],
    what: 'Precio medio ponderado por volumen desde el inicio de la sesión. Muchos participantes lo usan como referencia del "precio medio del día".',
    read: [
      'Línea amarilla que salta al inicio de cada día porque se reinicia.',
      'Precio por encima = compradores pagando por encima del promedio del día; por debajo, lo contrario.',
    ],
    rules: [
      'Usa el precio típico (máximo + mínimo + cierre) / 3 de cada vela ponderado por su volumen, reiniciado cada día (hora de la bolsa).',
      'No aplica en 1D y no se puede calcular sin volumen (forex): el panel lo avisa.',
    ],
    practice: 'Observa cómo reacciona el precio al VWAP en las temporalidades de 15m y 10m durante la sesión.',
    caveat: 'El volumen que entrega IB puede no coincidir exactamente con el de otras plataformas, así que el VWAP puede diferir ligeramente.',
  },
  {
    key: 'vol', group: 'context', title: 'Volumen', color: '#26a69a',
    toggles: [{ k: 'vol', label: 'Volumen' }],
    what: 'Cantidad negociada en cada vela, como histograma en la parte inferior del gráfico.',
    read: [
      'Verde: vela alcista. Rojo: vela bajista.',
      'Se suele observar si las rupturas (BOS/CHoCH) vienen acompañadas de más volumen de lo normal.',
    ],
    rules: [
      'Forex no tiene volumen en IB (se piden precios MIDPOINT): el panel lo avisa en lugar de dibujar algo falso.',
    ],
    practice: 'Compara el volumen de un BOS con el de las velas anteriores: ¿se confirma o pasa desapercibido?',
    caveat: 'Más volumen no garantiza continuación; es contexto, no una señal.',
  },
];

/** The menu switches (ema50, ema200) share a single help entry. */
export const helpKeyFor = (indKey) => (indKey === 'ema50' || indKey === 'ema200' ? 'ema' : indKey);
