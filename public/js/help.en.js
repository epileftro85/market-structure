// English version of the guide content (help.js). Data only; same keys, groups, toggles and diagrams as the Spanish one.
import { C } from './help.js';

export const HELP = [
  {
    key: 'swings', group: 'basic', title: 'Swings and HH · HL · LH · LL labels', color: C.up,
    diagram: 'swings',
    toggles: [{ k: '@sw', label: 'Show HH/HL/LH/LL labels' }],
    what: 'A swing high is a local high and a swing low a local low. Each swing is compared with the previous one of the same type to describe the trend: HH (Higher High), HL (Higher Low), LH (Lower High) and LL (Lower Low).',
    read: [
      'Uptrend = a sequence of HH and HL. Downtrend = a sequence of LH and LL.',
      'Green = HH/HL. Red = LH/LL. A grey dot is the first swing of each type (there is nothing to compare it with yet).',
      'When the sequence breaks (for example, an LL appears after a series of HL) it is a sign of a possible change: that is what gets marked as CHoCH.',
    ],
    rules: [
      'Swing high: a high greater than the highs of the previous n candles and greater than or equal to those of the next n. Swing low: the same, reversed.',
      'A swing is only confirmed n candles after it forms, which is why the most recent marks appear "late". This is inherent to any swing indicator.',
      'n is set per panel with the − / + buttons in its header (default 3).',
    ],
    practice: 'Mark the swings by hand on a chart, then look at what the app marks and notice where they differ. Try n = 2, 3, 5 and watch which swings appear and disappear.',
    caveat: 'There is no "correct" n: a small n gives a lot of noise, a large n gives few, late swings. It depends on the timeframe and on what you want to study.',
  },
  {
    key: 'bos', group: 'basic', title: 'BOS · Break of Structure', color: C.bos,
    diagram: 'bos',
    toggles: [{ k: '@st', label: 'Show BOS/CHoCH lines' }],
    what: 'A break of structure in the direction of the current trend: in an uptrend, price takes out the last swing high; in a downtrend, it loses the last swing low. It signals trend continuation.',
    read: [
      'Dashed blue line from the swing that was broken to the candle that breaks it, labeled BOS.',
      'The first break on the whole chart sets the trend and is marked as BOS.',
    ],
    rules: [
      'By default the break is by close: a candle must close beyond the level. With "Break: by wick" it is enough for the wick to go past it.',
      'It is checked against the last swing not yet broken. Each swing is broken only once.',
    ],
    practice: 'Before looking at the mark, ask yourself: which is the last unbroken swing? Which candle broke it and closed beyond it?',
    caveat: 'A BOS describes what already happened; it does not predict that the trend will continue.',
  },
  {
    key: 'choch', group: 'basic', title: 'CHoCH · Change of Character', color: C.choch,
    diagram: 'choch',
    toggles: [{ k: '@st', label: 'Show BOS/CHoCH lines' }],
    what: 'The first break against the current trend: in an uptrend, a close below the last swing low (usually the HL); in a downtrend, above the last swing high (the LH). It is the first sign of a possible trend change.',
    read: [
      'Solid orange line labeled CHoCH. From that candle on, the trend shown in the panel header (▲ / ▼) flips.',
      'After a CHoCH, the next move in the new direction will be marked as BOS.',
    ],
    rules: [
      'Same criterion as the BOS (close or wick), but against the current trend.',
    ],
    practice: 'Compare timeframes: a CHoCH on 15m inside a 4H uptrend may be just a pullback within the larger trend. That is why it helps to look at several at once (turn on "Higher TF levels").',
    caveat: 'A CHoCH can fail: price can come back and resume the previous trend.',
  },
  {
    key: 'fvg', group: 'zones', title: 'FVG · Fair Value Gap', color: C.up,
    diagram: 'fvg', toggles: [{ k: 'fvg', label: 'Show FVG' }],
    what: 'A gap left by a very fast move: between the wick of candle 1 and the wick of candle 3 there is a range that candle 2 (the impulsive one) did not let "fill". The idea is that little trading happened there and price sometimes returns to that range.',
    read: [
      'Rectangle with a dashed border from the middle candle to the right: green if the gap is bullish (it sits below price), red if it is bearish.',
      'When a candle fills it completely, it disappears.',
    ],
    rules: [
      'Bullish: the low of candle 3 is above the high of candle 1. Bearish: the high of candle 3 is below the low of candle 1.',
      'Gaps smaller than 0.25 × ATR(14) are ignored to avoid noise. At most the 10 most recent unfilled ones are shown.',
    ],
    practice: 'Watch what price does when it returns to an FVG: does it bounce, cut through it, fill it halfway? Do it on different timeframes.',
    caveat: 'It is a visual hypothesis, not a guarantee. On low timeframes many appear and most of them are irrelevant.',
  },
  {
    key: 'ob', group: 'zones', title: 'Order Block', color: C.up,
    diagram: 'ob', toggles: [{ k: 'ob', label: 'Show Order Blocks' }],
    what: 'The last candle of the opposite direction before the impulse that broke structure. The idea is that a concentration of orders was left there, which price might "respect" when it returns.',
    read: [
      'Solid-border rectangle labeled OB: green (bullish, a bearish candle before an upward impulse) or red (bearish).',
      'It extends to the right until a candle closes on the other side of the zone (it becomes "mitigated") and then disappears.',
    ],
    rules: [
      'For each BOS/CHoCH: between the broken swing and the breaking candle, the extreme is taken (the low in a bullish break, the high in a bearish one).',
      'The OB is the last opposite candle at that extreme or up to 2 candles earlier. The zone is its full range, wick to wick.',
      'At most the 6 most recent unmitigated ones are shown.',
    ],
    practice: 'Find the OB of a break by hand before turning the indicator on. Then check whether price came back to the zone and how it reacted.',
    caveat: 'There are several definitions of an OB (body only, full wick, another candle in the sequence). This is one of them; if yours differs, that is normal.',
  },
  {
    key: 'eq', group: 'liquidity', title: 'EQH / EQL · Equal Highs / Lows', color: C.eq,
    diagram: 'eq', toggles: [{ k: 'eq', label: 'Show EQH / EQL' }],
    what: 'Two consecutive highs (or lows) at almost the same level. They are read as liquidity: many participants place their stops just above the highs (or below the lows), so price may go looking for them.',
    read: [
      'Dashed grey line joining the two swings and extending to the right until the level is swept or broken.',
    ],
    rules: [
      'Two consecutive swings of the same type with a price difference ≤ 0.1 × ATR(14). It uses the panel\'s own swings, so it depends on n.',
      'The level is the more extreme of the two. At most the 8 most recent are shown.',
    ],
    practice: 'Watch what happens after an EQH is swept: reversal or continuation? Combine it with "Sweeps".',
    caveat: 'The tolerance (0.1 × ATR) is a choice of this app; two highs that look equal to you may fall outside it, and vice versa.',
  },
  {
    key: 'sweep', group: 'liquidity', title: 'Sweep · liquidity sweep', color: C.sweep,
    diagram: 'sweep', toggles: [{ k: 'sweep', label: 'Show Sweeps' }],
    what: 'The wick takes out a previous swing (grabbing the stops resting there) but the candle closes back inside the range. It is different from a break (BOS/CHoCH), where the close ends up beyond the level.',
    read: [
      'Dotted pink line from the swing to the candle, with ▼ sweep (it swept a high) or ▲ sweep (it swept a low).',
    ],
    rules: [
      'For each confirmed swing, the first candle that goes past it is checked: if it closes back inside it is a sweep; if it closes beyond, it is a break and is not marked here. Each swing produces at most one sweep.',
      'At most the 12 most recent are shown.',
    ],
    practice: 'A sweep followed by a CHoCH on a lower timeframe is a classic pattern to study. Look for them and check how many times it worked and how many it did not.',
    caveat: 'If the break mode is "by wick", the same candle can show up as BOS/CHoCH and as a sweep, because both criteria are independent.',
  },
  {
    key: 'ext', group: 'advanced', title: 'External structure (n × 3)', color: C.choch,
    diagram: 'ext', toggles: [{ k: 'ext', label: 'Show external structure' }],
    what: 'A second scale of structure on the same chart. The internal one (your n) shows the small moves; the external one (n × 3) shows only the big ones.',
    read: [
      'Pill-shaped labels and thick lines (BOS blue, CHoCH orange), on top of the regular marks.',
      'It helps tell an internal pullback apart from a larger external move.',
    ],
    rules: [
      'It is the same algorithm with n tripled: if n = 3, the external one uses n = 9.',
    ],
    practice: 'Look for internal CHoCHs that are not accompanied by an external CHoCH and see how each case ends.',
    caveat: 'The factor of 3 is a convention of this app, not a standard.',
  },
  {
    key: 'htf', group: 'advanced', title: 'Higher TF levels', color: C.htf4,
    diagram: 'htf', toggles: [{ k: 'htf', label: 'Show higher TF levels' }],
    what: 'Draws on each panel the active levels of the higher timeframes, to see whether what you mark below lines up with the context above (top-down analysis).',
    read: [
      'Horizontal lines labeled on the right: "4H swing high/low" (solid) and "4H BOS ▼" (dashed: level of the last break and its direction).',
      'Colors: 1D purple, 4H cyan, 15m lime. Each panel header already shows the trend (▲ / ▼) of its timeframe.',
      'Key question on 15m / 10m: does the CHoCH I see go with or against the last 4H and 1D break?',
    ],
    rules: [
      'Active swing high/low = the last unbroken ones according to that timeframe\'s n (each panel uses its own n). The last break is the most recent one.',
      'A panel only receives the timeframes above its own (1D receives nothing; 10m receives 1D, 4H and 15m).',
      'If a timeframe is not visible (layout 1 or 2), the app loads it in the background.',
    ],
    practice: 'Look at a CHoCH on 10m and check whether it goes with or against the 4H and 1D trend. Write down how it plays out in each case.',
    caveat: 'Lines that fall outside the visible price range are not drawn; zoom out to see them.',
  },
  {
    key: 'ema', group: 'context', title: 'EMA 10 / 20 / 50 / 100 / 200', color: '#93c5fd',
    toggles: [10, 20, 50, 100, 200].map((p) => ({ k: `ema${p}`, label: `EMA ${p}` })),
    what: 'Exponential moving averages: they average the closes giving more weight to the recent ones. They give context about the trend and the "speed" of price.',
    read: [
      'The shorter the EMA, the thicker the line and the faster it reacts: EMA 10 (pink, thickest), 20 (teal), 50 (light blue), 100 (violet) and 200 (white, thinnest).',
      'Price above an upward-sloping EMA is usually read as bullish context; below and sloping down, bearish.',
    ],
    rules: [
      'EMA of the real closes (also when Heikin Ashi is on), seeded with the simple average of the first n candles. Each EMA needs at least as many candles as its period; if there are not enough, the panel says so.',
    ],
    practice: 'Compare how structure (BOS/CHoCH) behaves when price is above or below the EMA 200.',
    caveat: 'They are lagging indicators: they describe the recent past.',
  },
  {
    key: 'vwap', group: 'context', title: 'Daily VWAP', color: '#fbbf24',
    toggles: [{ k: 'vwap', label: 'VWAP' }],
    what: 'Volume-weighted average price since the start of the session. Many participants use it as the reference "average price of the day".',
    read: [
      'Yellow line that jumps at the start of each day because it resets.',
      'Price above = buyers paying above the day\'s average; below, the opposite.',
    ],
    rules: [
      'Uses the typical price (high + low + close) / 3 of each candle weighted by its volume, reset every day (exchange time).',
      'Not applicable on 1D and cannot be computed without volume (forex): the panel says so.',
    ],
    practice: 'Watch how price reacts to the VWAP on the 15m and 10m timeframes during the session.',
    caveat: 'The volume IB delivers may not match other platforms exactly, so the VWAP may differ slightly.',
  },
  {
    key: 'vol', group: 'context', title: 'Volume', color: '#26a69a',
    toggles: [{ k: 'vol', label: 'Volume' }],
    what: 'Amount traded in each candle, shown as a histogram at the bottom of the chart.',
    read: [
      'Green: bullish candle. Red: bearish candle.',
      'People usually check whether breaks (BOS/CHoCH) come with higher than normal volume.',
    ],
    rules: [
      'Forex has no volume in IB (MIDPOINT prices are requested): the panel says so instead of drawing something fake.',
    ],
    practice: 'Compare the volume of a BOS with that of the previous candles: does it stand out or go unnoticed?',
    caveat: 'More volume does not guarantee continuation; it is context, not a signal.',
  },
  {
    key: 'ha', group: 'context', title: 'Heikin Ashi candles', color: '#26a69a',
    toggles: [{ k: '@ha', label: 'Use Heikin Ashi candles' }],
    what: 'Another way to draw the candles: each one averages the real candle with the previous Heikin Ashi one. It smooths out noise and makes runs of same-colored candles easier to see.',
    read: [
      'Runs of green candles with no lower wick are usually read as bullish momentum; red ones with no upper wick, bearish.',
      'Small candles with wicks on both sides point to indecision or a pause.',
      'Marks (swings, BOS, CHoCH, zones) are computed on the real candles, so a label may not sit exactly on the Heikin Ashi wick that is drawn.',
    ],
    rules: [
      'HA close = (open + high + low + close) / 4. HA open = (previous HA open + previous HA close) / 2; the first one is (open + close) / 2.',
      'HA high = the largest of the real high, HA open and HA close; HA low, the smallest.',
      'Display only: structure, indicators, EMAs and the last-price label use the real candles. Normal candles are the default.',
    ],
    practice: 'Mark the structure with normal candles, switch to Heikin Ashi and check whether the color runs match the legs between BOS.',
    caveat: 'Heikin Ashi prices are not traded prices: do not measure levels, breaks or distances on them.',
  },
];
