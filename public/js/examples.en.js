// Practical examples for each guide entry (help.js). Data only.
//
// All numbers are ILLUSTRATIVE (to show how to measure and reason); they are not statistics
// or historical results, and none of this is investment advice.
//
// Structure of each example:
//   title      short title
//   scenario   concrete situation with numbers
//   diagrams   [{ key, caption }]  extra drawings (keys of DIAGRAMS in help.js)
//   steps      "What to do" step by step, in the app
//   outcomes   [{ title, when, means, check }]  scenarios: if X happens → how to read it → what to check
//   measure    what to measure (and how)
//   mistakes   common mistakes
//
// Pip convention: EUR/USD, 1 pip = 0.0001.

export const EXAMPLES = {
  // ------------------------------------------------------------------ EQH / EQL
  eq: {
    title: 'EUR/USD 15m: an EQH, step by step',
    scenario:
      'You turn on "EQH / EQL" on EUR/USD 15m. The ATR(14) of this panel is 10 pips, so the app\'s tolerance is 0.1 × 10 = 1 pip. ' +
      'Two consecutive swing highs sit at 1.0852 and 1.0853: the difference is 1 pip, within tolerance. ' +
      'The app draws a dotted gray line at 1.0853 (the higher of the two) labeled EQH, and extends it to the right as long as the level stays intact.',
    diagrams: [
      { key: 'eq_form', caption: '① It forms: two nearly equal highs. Many participants place their stop just above (the "×" zone).' },
      { key: 'eq_sweep', caption: '② Scenario A: the wick exceeds it but the candle closes back below → sweep.' },
      { key: 'eq_break', caption: '③ Scenario B: a candle closes above → break, not a sweep. The level may turn into support (retest).' },
      { key: 'eq_measure', caption: '④ What to measure: A distance between highs · B candles between touches · C wick beyond the level · D where it closes.' },
    ],
    steps: [
      'Find the EQH line and note the level (1.0853) and the time of the second touch. Do not trade or decide yet: just observe.',
      'Measure the quality of the level (see "What to measure"): a 1-pip difference or almost 0? How many candles separate the two highs? Is there a third touch?',
      'Turn on "Higher TF levels" and check whether the level is near a 4H or 1D swing: an EQH that lines up with a higher level stands out more.',
      'Cover the right side of the chart with your hand and write down what you would expect: a sweep and rejection? A break and continuation? Neither?',
      'Uncover it and watch what price did over the next 10–20 candles. Record the outcome in your log (see "What to measure"), even if it differs from what you expected: that is where you learn.',
    ],
    outcomes: [
      {
        title: 'A · Sweep and rejection',
        when: 'A candle reaches 1.0861 with its wick (8 pips above the level) but closes at 1.0847, below 1.0853.',
        means: 'The EQH line stops at that candle and, if you have "Sweeps" turned on, the pink ▼ sweep mark also appears. A possible reading: the stops above were taken and price found no acceptance higher up.',
        check: 'Look at the wick size in ATR (8 pips = 0.8 × ATR) and where it closed. Then drop to 10m: does a bearish CHoCH appear a few candles later? If not, a sweep on its own says little.',
      },
      {
        title: 'B · Break with acceptance',
        when: 'A candle closes at 1.0858, 5 pips above 1.0853 (0.5 × ATR). The next candle also closes above.',
        means: 'Not a sweep: there was acceptance above the level. The EQH line ends there. If that swing was the last unbroken one, the app will also mark a bullish BOS or CHoCH.',
        check: 'Watch whether price comes back to retest 1.0853 from above and holds it as support, or loses it and the break turns out to be false.',
      },
      {
        title: 'C · Nothing happens (level still live)',
        when: '40 candles go by and price does not even approach the level; the EQH line keeps extending to the right.',
        means: 'The level is still intact: it is a reference, not a signal. Until it is touched, there is nothing to interpret.',
        check: 'Note how many pips it is from the current price and whether it lines up with a higher TF level. Do not force a reading.',
      },
      {
        title: 'D · Touch without a clear close',
        when: 'The high reaches exactly 1.0853 (does not exceed it) and price drops.',
        means: 'Neither a sweep nor a break: the app treats it as a level that is still live (to be a sweep, the wick must exceed it).',
        check: 'Count how many touches it has: three nearly equal highs usually draw more attention than two.',
      },
    ],
    measure: [
      'A · Distance between the two highs, in multiples of ATR (here 1 pip / 10 pips = 0.1 × ATR). The closer to 0, the "cleaner" the EQH.',
      'B · Candles between the two touches (for example 12). If there are very few (≤ 4), it may just be noise within the same move.',
      'Number of touches: 2, 3 or more. Write it down; the app only pairs two consecutive swings at a time.',
      'C · Size of the wick that exceeds it, in ATR (0.8 × ATR in the example). A tiny wick and a large one do not tell the same story.',
      'D · Where the candle closes relative to the level: inside the range (sweep) or outside (break), and by how much, in ATR.',
      'Candles until a reaction appears (CHoCH or BOS on a lower timeframe) or until it is invalidated.',
      'Context: with or against the 4H/1D trend (turn on "Higher TF levels")?',
    ],
    mistakes: [
      'Treating every EQH as a signal: they are areas of interest, not predictions. Record what happened each time.',
      'Seeing "stops above" and assuming price will always go after them: sometimes it never touches them.',
      'Judging with the chart already complete (hindsight bias). Cover the right side and decide before uncovering it.',
      'Comparing EQHs with a different n or a different timeframe without noticing: change n and the swings change, and therefore so do the EQHs.',
      'Confusing a sweep with a break: it depends on the close, not the wick. Wait for the candle to close before classifying it.',
      'Expecting the app\'s tolerance to match your visual judgment: 0.1 × ATR is a choice made by this app.',
    ],
  },

  // ------------------------------------------------------------------ swings
  swings: {
    title: 'EUR/USD 15m with n = 3: reading the sequence',
    scenario:
      'Price had been rising and now you have these swings. Highs: 1.0840 → 1.0852 → 1.0846 (no label, HH, LH). Lows: 1.0825 → 1.0833 → 1.0829 (no label, HL, LL). ' +
      'The first swing of each type has no label because there is nothing to compare it with yet. What describes the current situation are the last two labels: LH and LL.',
    steps: [
      'Cover the right side of the chart and mark by hand the swings you see, with your own n in mind.',
      'Uncover it and compare with what the app marks: where do they differ? It is almost always because you see a smaller or larger swing than n requires.',
      'Change n to 2 and then to 5 (the panel\'s − / + buttons). Note which swings appear and which disappear.',
      'Look at the latest labels of each type (highs and lows), not just one.',
    ],
    outcomes: [
      { title: 'A · HH + HL', when: 'The latest highs and lows are higher than the previous ones.', means: 'Bullish structure.', check: 'Check whether a recent bullish BOS confirms it.' },
      { title: 'B · LH + LL', when: 'As at the end of the example: the latest high is lower (LH) and so is the latest low (LL).', means: 'Bearish structure: the previous bullish sequence has broken.', check: 'Find the CHoCH that marked it and check what the higher timeframe says.' },
      { title: 'C · Mixed (HH + LL, or LH + HL)', when: 'A higher high but a lower low (or the other way round).', means: 'No clear trend: expansion or range.', check: 'Wait for a break (BOS/CHoCH) before giving it a firm reading.' },
    ],
    measure: [
      'Size of each swing in ATR: moves smaller than 1 × ATR are usually noise on that timeframe.',
      'How many swings appear or disappear when going from n = 3 to n = 5 (tells you how "fragile" the reading is).',
      'Confirmation delay: n candles from the peak until the app marks it.',
    ],
    mistakes: [
      'Reading the trend from a single label (an isolated HH is not a trend).',
      'Comparing swings from panels with different n as if they were the same.',
      'Forgetting that the most recent swings are not confirmed yet: n candles are still missing.',
    ],
  },

  // ------------------------------------------------------------------ BOS
  bos: {
    title: 'EUR/USD 4H: does it count as a BOS?',
    scenario:
      'Bullish trend on 4H. The last unbroken swing high is at 1.0900 and the panel\'s ATR(14) is 20 pips. A 4H candle closes at 1.0912.',
    steps: [
      'Identify the last unbroken swing: it is the line the app draws from that swing to the breaking candle.',
      'Check whether the candle closed beyond the level or only touched it with the wick (depends on the "Break" selector).',
      'Measure how far beyond it closed, in ATR, and watch what the next candle does.',
    ],
    outcomes: [
      { title: 'A · Clear close', when: 'It closes at 1.0912: 12 pips above (0.6 × ATR).', means: 'Clear bullish BOS: trend continuation.', check: 'Does the next candle keep the close above 1.0900?' },
      { title: 'B · Wick only', when: 'It reaches 1.0905 with the wick but closes at 1.0895.', means: 'With "Break: by close" there is no BOS. With "Break: by wick" there is. The two modes describe different things.', check: 'Switch the selector and see how much the marks change. Which criterion do you prefer for learning?' },
      { title: 'C · Marginal close', when: 'It closes at 1.0901 (1 pip above).', means: 'Technically a BOS, but a weak one: a break of 0.05 × ATR says little.', check: 'Compare with more decisive BOS and record which ones held.' },
    ],
    measure: [
      'Distance from the close to the broken level, in ATR.',
      'Body size of the breaking candle compared with the previous ones.',
      'Whether the next candle closes back below the level (failed break).',
      'Volume versus the average (if the instrument has it).',
    ],
    mistakes: [
      'Taking a BOS as a "buy signal": it only describes that the structure continued.',
      'Forgetting which mode you are in (close or wick) when comparing screenshots or examples.',
      'Marking the break before the candle closes.',
    ],
  },

  // ------------------------------------------------------------------ CHoCH
  choch: {
    title: 'CHoCH on 15m inside a bullish 4H',
    scenario:
      'On 4H the last break was a bullish BOS and the header says ▲ bullish. On 15m, after a pullback, a bearish CHoCH appears (close below the last swing low). Has the trend changed?',
    diagrams: [{ key: 'choch_htf', caption: 'A CHoCH on the lower timeframe may just be a pullback within the higher trend.' }],
    steps: [
      'Turn on "Higher TF levels" and look at each panel\'s header: what do 4H and 1D say?',
      'Compare the level of the 15m CHoCH with the active 4H swing low (cyan line).',
      'Watch the next swings on 15m: HH/HL again (it resumes) or LH/LL (the change consolidates)?',
    ],
    outcomes: [
      { title: 'A · Only on the lower timeframe', when: '15m makes a bearish CHoCH, 4H is still ▲ and its swing low has not been lost.', means: 'Hypothesis: a pullback within the higher trend.', check: 'If 15m makes a bullish BOS again, the pullback is over; if it keeps making LH/LL, watch the 4H swing low.' },
      { title: 'B · Also on the higher one', when: '4H loses its swing low and the header switches to ▼.', means: 'Change of character on the higher timeframe: more relevant than the 15m one.', check: 'Check whether 1D agrees or is still going the other way.' },
      { title: 'C · It fails', when: 'Price comes back and exceeds the swing high that originated the CHoCH.', means: 'The CHoCH did not hold.', check: 'Count how many of your CHoCHs fail; it is valuable information about which timeframes are reliable for you.' },
    ],
    measure: [
      'Candles between the last BOS and the CHoCH.',
      'Size of the candle that breaks it, in ATR.',
      'Distance from the CHoCH level to the 4H swing, in the panel\'s ATR.',
      'How many timeframes agree (10m, 15m, 4H, 1D)?',
    ],
    mistakes: [
      'Assuming a CHoCH is a confirmed reversal.',
      'Ignoring the higher timeframe.',
      'Labeling while the candle is still open.',
    ],
  },

  // ------------------------------------------------------------------ FVG
  fvg: {
    title: 'EUR/USD 15m: a 12-pip bullish FVG',
    scenario:
      'ATR(14) = 10 pips. Candle 2 rallies strongly: the high of candle 1 is 1.0840 and the low of candle 3 is 1.0852. A 12-pip bullish gap (1.2 × ATR) is left between 1.0840 and 1.0852. The app draws it as a dotted green rectangle.',
    steps: [
      'Turn on FVG and find a recent gap. Note its two edges (in the example, 1.0840 and 1.0852).',
      'Check whether it goes with the higher timeframe trend (use "Higher TF levels").',
      'Watch what price does when it comes back to the zone, if it does.',
    ],
    outcomes: [
      { title: 'A · Enters and bounces', when: 'Price drops to 1.0846 (halfway into the gap) and rises again.', means: 'The zone acted as support; it stays visible because it was not completely filled.', check: 'Note what percentage of the gap was covered before the bounce (50% in the example).' },
      { title: 'B · Completely filled', when: 'A candle reaches 1.0840 or lower.', means: 'The gap disappears from the chart: the move was absorbed.', check: 'What did price do after filling it? Compare with the ones that bounced.' },
      { title: 'C · Does not come back', when: 'Price keeps rising and never returns.', means: 'It stays "live" for a while; many FVGs are never revisited.', check: 'Do not treat it as valid just because it exists.' },
    ],
    measure: [
      'Gap size in ATR (here 1.2 × ATR). Very small ones are noise.',
      'Candles until the first return.',
      'Percentage of the gap covered before reacting.',
      'Does it line up with an OB or a higher TF level?',
    ],
    mistakes: [
      'Marking every gap: filter by size and context.',
      'Not distinguishing those that go with the higher trend from those that go against it.',
      'Expecting them to always get filled.',
    ],
  },

  // ------------------------------------------------------------------ OB
  ob: {
    title: 'EUR/USD 15m: a bullish Order Block',
    scenario:
      'A bullish BOS breaks the swing high at 1.0880. Between that swing and the break, the low is on a bearish candle with a range of 1.0858–1.0866. The app draws that zone (green rectangle with "OB") to the right.',
    steps: [
      'Before turning on the indicator, try to identify by hand the last bearish candle before the impulse.',
      'Turn on OB and compare your choice with the app\'s.',
      'Watch whether price returns to the zone and how it reacts.',
    ],
    outcomes: [
      { title: 'A · Returns and rejects', when: 'Price drops to 1.0864 and bounces without closing below 1.0858.', means: 'The zone was respected; it stays visible.', check: 'Note how deep it went (in ATR) before bouncing.' },
      { title: 'B · Mitigated', when: 'A candle closes at 1.0855, below the lower edge.', means: 'The zone is no longer drawn: the app considers it invalidated.', check: 'Compare how many OBs are respected and how many are lost on different timeframes.' },
      { title: 'C · Does not return', when: 'Price still has not come back.', means: 'There is nothing to read yet.', check: 'Just wait.' },
    ],
    measure: [
      'Height of the zone in ATR (a very large zone is not very precise).',
      'Whether it comes from a BOS or a CHoCH: note it and compare results separately.',
      'Candles between the break and the first return.',
      'Alignment with the higher timeframe trend.',
    ],
    mistakes: [
      'Taking an OB in the middle of a range, without a clear break.',
      'Believing they are all valid: OBs change when n changes (the swings change).',
      'Forgetting that there are several definitions; yours may differ from this one.',
    ],
  },

  // ------------------------------------------------------------------ Sweep
  sweep: {
    title: 'EUR/USD 15m: sweep of a high',
    scenario:
      'There is a swing high at 1.0853. A candle reaches 1.0861 with its wick but closes at 1.0847. ATR(14) = 10 pips. The app marks "▼ sweep" and a pink line from the swing to that candle.',
    diagrams: [{ key: 'eq_sweep', caption: 'Wick above the level, close back inside: sweep.' }],
    steps: [
      'Wait for the candle to close before classifying it: while it is open it can still turn into a break.',
      'Measure the wick and where it closed (see "What to measure").',
      'Drop to a lower timeframe and look at what happens over the next candles.',
    ],
    outcomes: [
      { title: 'A · Sweep + lower CHoCH', when: 'On 10m a bearish CHoCH appears a few candles later.', means: 'Classic study pattern: a liquidity grab followed by a change of character.', check: 'Count how many times the pattern completes and how many times it does not.' },
      { title: 'B · Sweep and price recovers', when: 'After the sweep price rises again and exceeds the high of the wick.', means: 'The sweep had no follow-through.', check: 'Record it anyway: failures are data too.' },
      { title: 'C · Closes beyond', when: 'The candle closes at 1.0858.', means: 'It is no longer a sweep: it is a break (BOS/CHoCH).', check: 'Change your reading; do not insist on the sweep.' },
    ],
    measure: [
      'Wick beyond the level, in ATR (0.8 × ATR in the example).',
      'Distance from the close to the level.',
      'Candles until the reaction on the lower timeframe.',
      'Context: with or against the higher trend?',
    ],
    mistakes: [
      'Calling every wick a sweep: it must exceed a real swing and close back inside.',
      'Classifying while the candle is still open.',
      'Seeing a single successful example and generalizing.',
    ],
  },

  // ------------------------------------------------------------------ External
  ext: {
    title: 'n = 3 (internal) vs n = 9 (external)',
    scenario:
      'On 15m, 3 internal CHoCHs appear within 20 candles, but no external one. The external trend (thick lines) is still the same.',
    steps: [
      'Turn on "External (n×3)" and look at the large pills.',
      'Each time there is an internal CHoCH, check whether it coincides with an external one.',
      'Change n and watch how the external one changes (n × 3).',
    ],
    outcomes: [
      { title: 'A · Internal CHoCH without external', when: 'There are only thin lines.', means: 'Usually read as a pullback or correction within a larger move.', check: 'Watch whether the larger move resumes.' },
      { title: 'B · External CHoCH', when: 'A large CHoCH pill appears.', means: 'Change of character on the larger scale.', check: 'Check what the higher timeframe says.' },
    ],
    measure: [
      'Candles between one external CHoCH and the next.',
      'How many internal CHoCHs occur between two external ones.',
    ],
    mistakes: [
      'Confusing "external" with "higher timeframe": it is the same timeframe, with a larger n.',
      'Increasing n until there is nothing left to interpret.',
    ],
  },

  // ------------------------------------------------------------------ HTF
  htf: {
    title: '10m with an eye on 4H and 1D',
    scenario:
      'On 10m a bullish CHoCH appears. A cyan line (4H swing high) is at 1.0880, 15 pips above; a purple line (1D BOS ▼) is at 1.0910. The 10m ATR is 6 pips.',
    diagrams: [{ key: 'htf', caption: 'Higher timeframe lines appear on your panel.' }],
    steps: [
      'Turn on "Higher TF levels" and read the labels on the right.',
      'Compare the direction of the last 1D and 4H break with that of the 10m CHoCH.',
      'Measure the distance from price to the next higher level.',
    ],
    outcomes: [
      { title: 'A · Aligned', when: '1D and 4H are also rising and the level is far away.', means: 'The lower CHoCH goes with the context.', check: 'Note how far away the next higher level is.' },
      { title: 'B · Against', when: 'As in the example: 1D ▼ and a 4H swing high 15 pips away.', means: 'The lower CHoCH clashes with the context: there is little room before a relevant level.', check: '15 pips = 2.5 × the 10m ATR. Is that little room for what you are studying?' },
    ],
    measure: [
      'Distance to the higher level in the panel\'s ATR.',
      'How many timeframes agree on the direction.',
      'What happens when price reaches a 4H or 1D level (bounce, break, nothing).',
    ],
    mistakes: [
      'Expecting the lines to act as walls: they are references.',
      'Not looking at the header: that is where the direction of each timeframe is shown.',
    ],
  },

  // ------------------------------------------------------------------ EMA
  ema: {
    title: 'EMA 50 and EMA 200 on 4H',
    scenario:
      'On 4H price is above both EMAs and the EMA 50 is above the 200. A bearish CHoCH appears on 15m.',
    steps: [
      'Turn on both EMAs on 4H and on 15m.',
      'Watch how the structure behaves in the areas where price touches the EMA.',
    ],
    outcomes: [
      { title: 'A · Pullback to the EMA', when: 'Price drops to the 4H EMA 50 and bounces.', means: 'It is an area of interest that many people watch.', check: 'Note how many times the bounce happens and how many times it does not.' },
      { title: 'B · Loses the EMA 200', when: 'It closes below the EMA 200.', means: 'Change in the longer-term context.', check: 'Compare with what the structure has done.' },
    ],
    measure: [
      'Distance from price to the EMA, in ATR.',
      'Slope of the EMA (is it flattening?).',
    ],
    mistakes: [
      'Treating EMA crossovers as signals on their own: they are lagging indicators.',
      'Comparing EMAs with few candles loaded (the EMA 200 needs 200).',
    ],
  },

  // ------------------------------------------------------------------ VWAP
  vwap: {
    title: 'VWAP in a stock session (15m)',
    scenario:
      'A stock opens and rises; the daily VWAP (yellow line) follows it from below. Later price falls and crosses below the VWAP.',
    steps: [
      'Turn on VWAP on 15m or 10m for a stock (not on 1D or forex).',
      'Watch how price reacts when it approaches the VWAP.',
    ],
    outcomes: [
      { title: 'A · Respects the VWAP', when: 'Price pulls back to the VWAP and continues.', means: 'Usually read as the "average price of the day" acting as support.', check: 'Count how many times it happens during the session.' },
      { title: 'B · Loses it', when: 'It closes below and stays below.', means: 'The day\'s buyers paid above the average and are now at a loss.', check: 'Compare with the structure (was there a CHoCH?).' },
    ],
    measure: [
      'Distance from price to the VWAP in ATR.',
      'Candles price spends above or below.',
    ],
    mistakes: [
      'Using it on forex: there is no volume from IB and the app does not calculate it.',
      'Forgetting that it resets every day.',
    ],
  },

  // ------------------------------------------------------------------ Volume
  vol: {
    title: 'Volume on a break (stocks)',
    scenario:
      'A stock breaks a high with a bullish BOS. The volume of that candle is 2.5 times the average of the last 20 candles.',
    steps: [
      'Turn on Volume and find the BOS.',
      'Compare the bar of the breaking candle with the previous ones.',
    ],
    outcomes: [
      { title: 'A · High volume', when: 'The breaking candle has volume well above average.', means: 'Greater participation in the break.', check: 'Does price continue over the next candles?' },
      { title: 'B · Low volume', when: 'The break happens on volume similar to or below average.', means: 'Less participation; it does not guarantee failure.', check: 'Record how many low-volume breaks held.' },
    ],
    measure: [
      'Candle volume divided by the average of the last 20 candles.',
      'Whether pullback candles have less volume than impulse candles.',
    ],
    mistakes: [
      'Expecting volume on forex: IB delivers MIDPOINT (no volume).',
      'Interpreting high volume as direction: it can be buying or selling.',
    ],
  },
};
