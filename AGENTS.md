# AGENTS.md

Context for any AI (or person) working in this repository. Read it in full before changing anything.
Language when talking to the user: **Spanish**. Code, comments and docs in the repo: English.

Last updated: 2026-10-06.

---

## 1. What this project is

**market-structure** is an MVP for **learning to mark market structure**, not for trading.
It pulls candles from Interactive Brokers (IB) and draws on top of them, on 4 timeframes at once (1D, 4H, 15m, 10m):

- Swings and **HH / HL / LH / LL** labels
- **BOS** (Break of Structure) and **CHoCH** (Change of Character)
- Optional indicators (all *toggleable*): FVG, Order Blocks, EQH/EQL, Sweeps, external structure (n×3),
  higher-timeframe levels, EMA 50/200, daily VWAP and volume
- A **contextual guide** (`?` buttons) with diagrams, the exact rule the app uses, and step-by-step examples

It runs in the browser (local Node server + static pages). Each tab is independent: it can show a different symbol.

### Underlying goal
Help the user **train their eye**: learn what each mark is, how it is measured and how it is interpreted, by comparing what
they would mark with what the algorithm marks.

### What it is NOT (non-goals)
- **It is not a trading system.** It sends no orders, gives no buy/sell signals, and does no profitability backtesting.
- It is not financial advice. The guide and examples say so explicitly; keep that stance.
- It does not claim to be the "correct" definition of each concept: the definitions are this app's, and they vary between traders.

---

## 2. User profile

Only what the user has said, or what follows directly from the conversation, is included. **Do not fill gaps with assumptions.**

**What we know**
- Spanish speaker, time zone **America/Bogotá (UTC−5)**. Works on **macOS** (paths `/Users/anclavijo/...`).
- Wants to **learn to mark structure, not enter** the market yet: "solo aprender a marcar" ("just learn to mark").
- Concepts they work with: ChoCH, BOS, HH/HL/LH/LL, EQH, top-down across 1D / 4H / 15m / 10m. Asked for help understanding
  EQH and said they need to learn more about the **role of each timeframe** (top-down analysis). This is noted under
  "Still to learn" in the README.
- Instruments they have searched for: **EUR.USD and GBP.USD** (forex). It is not confirmed what else they study (the repo's tests also use stocks such as AAPL, for convenience).
- Has **IBKR Desktop** and **IB Gateway** installed. IBKR only allows **one session per user**, so they cannot have
  Desktop and Gateway open with the same user at the same time (see §8).
- Stated technical preferences: **Node, plain JavaScript (no TypeScript)**, "sencillo y práctico" ("simple and practical"), MVP, visualization in the browser.
- Asked for favorites stored in a **cookie** and an **IB symbol search**.
- Asked for extras to be **optional (toggleable)** and for explanations to come with **concrete examples**:
  what to do, what to measure, what to interpret.
- In `server/config.js` they changed the default IB port to **4001** (IB Gateway *live*). Do not revert or "fix" it without asking.

**What we do NOT know (do not assume)**
- Their experience level, capital, whether they trade live, which broker they use for execution, or whether they use a paper or live account in Gateway
  (port 4001 suggests live, but this is not confirmed).
- Which definition of Order Block, FVG or liquidity they prefer (the app implements one; see §6).

---

## 3. How to collaborate with this user

- Reply in **Spanish**, direct and without filler. Explain the *why* of a decision in one or two sentences.
- **Ask before building** when there are several reasonable approaches and each adds complexity (this was done with the indicators menu).
- If something **could not be tested**, say so. Today, everything that requires real IB is unverified (see §7).
- Prefer simple. Do not introduce frameworks, bundlers, TypeScript or databases unless asked.
- Every visual extra is **off by default** and has its `?` in the guide.
- When explaining market concepts: an example with numbers, what to measure, scenarios "if A happens → reading → what to check",
  and common mistakes. Make clear the numbers are **illustrative**.
- Do not give investment opinions ("buy here", "this will go up"). Describe what to look at and how to record results.
- Before **overwriting a file** the user may have edited, compare its content with the last version delivered.

---

## 4. Stack and architecture

```
IB Gateway / TWS (local)  ──TCP socket──▶  Node server (Express)  ──HTTP JSON──▶  Browser (N tabs)
        port 4001 (cfg)                    server/                                public/ (ES modules)
```

- **Node ≥ 18**, ESM (`"type": "module"`). Dependencies: `express`, `@stoqey/ib`, `lightweight-charts` (v5, served from
  `node_modules` at `/vendor`, no CDN). No build step.
- **One server, one IB connection**, shared by all tabs. Listens only on `127.0.0.1`.
- Each tab's state lives **in the URL** (symbol, layout, `n` per panel, break mode, indicators). "Duplicate tab" copies the URL.
- Cookies: `ms_favs` (favorites), `ms_ind` (last-used indicators) and `ms_lang` (language chosen with the ES/EN button). They belong to the **host** `127.0.0.1` (not port-specific): if the user opens the app as `localhost`, they will not see the same cookies.

```
server/
  config.js      ports, TIMEFRAMES (barSize/duration/ttl), useRTH, IB limits
  ib.js          IB client: connect/reconnect, search, historical data, cache, queue (pacing), forex
  forex.js       list of IDEALPRO pairs and search (reqMatchingSymbols does NOT return forex)
  mock.js        simulated data (MOCK=1) to test the UI without IB
  index.js       Express: /api/status, /api/search, /api/bars, static files
public/
  index.html · css/style.css
  js/app.js                 URL state, 4/2/1 layout, search, favorites, indicators menu, guide
  js/panel.js               one panel = one timeframe (chart, series, structure, indicators)
  js/structure.js           swings, HH/HL/LH/LL, BOS, CHoCH   ← PURE, with tests
  js/indicators.js          ATR, EMA, VWAP, FVG, OB, EQH/EQL, Sweeps ← PURE, with tests
  js/structurePrimitive.js  drawing on the chart canvas (zones below, marks on top)
  js/help.js · js/examples.js   guide and examples content in Spanish (data only) + SVG diagrams
  js/help.en.js · js/examples.en.js   the same guide and examples in English (same keys)
  js/i18n.js · js/locales/{es,en}.js   active language, t('key') and UI strings
  js/api.js · js/favorites.js   backend client / favorites cookie
test/                       node:test (structure, indicators, forex, help)
```

**Languages (i18n)**: Spanish (default) and English. Spanish UI/guide content lives in `locales/es.js`, `help.js` and `examples.js`;
English in `locales/en.js`, `help.en.js` and `examples.en.js`. `public/js/i18n.js` picks the language on load: the `ms_lang` cookie
(ES/EN button in the toolbar) or, if absent, `lang` from `server/config.js` (`APP_LANG`), delivered via `/api/status`.
Every new UI string goes in as a key in `locales/es.js` **and** `locales/en.js` (a test compares the keys) and is used via `t('key')`;
in static HTML, via `data-i18n` / `data-i18n-title` / `data-i18n-placeholder` / `data-i18n-aria-label`.
Market labels (HH, BOS, CHoCH, FVG, OB, sweep…) are not translated. Errors sent by IB are shown as-is.
Careful: do not name a local variable `t` in `app.js` / `panel.js` (it would shadow the translation function).

Data flow: `app.js` requests bars per panel → `api.js` normalizes (time shifted to New York time) →
`panel.js` calls `detectStructure` and the indicators → `structurePrimitive.js` draws.

---

## 5. Commands

```bash
npm install
npm start        # IB at 127.0.0.1:4001 (default in config.js). IB_PORT=4002 npm start for Gateway paper
npm run mock     # simulated data, no IB
npm test         # node --test  (must pass in full before delivering any change)
```

Useful environment variables: `IB_PORT`, `IB_HOST`, `IB_CLIENT_ID` (17), `PORT` (3000), `USE_RTH=0` (includes pre/post market), `MOCK=1`, `APP_LANG=en` (default language; `es` if not set).
IB ports: Gateway live 4001 / paper 4002; TWS live 7496 / paper 7497.
Installing and running IB Gateway (download, login, API settings, ports): see the "IB Gateway setup" section of `README.md`.

---

## 6. Definitions and decisions that must NOT change without notice

If you change a rule, update all of these together: the code, `help.js`, `examples.js` (and their `.en.js` versions), the README and the tests.

**Structure (`structure.js`)**
- Swing high: a high greater than the previous `n` candles (strict) and `≥` the next `n`. Swing low: symmetric.
  A swing is **confirmed `n` candles later** (this is inherent and documented to the user).
- Labels: each swing is compared with the previous one **of the same type** (HH/LH for highs, HL/LL for lows). The first of each type gets no label.
- Break of the last not-yet-broken swing: with the trend → **BOS**; against it → **CHoCH**. The first break sets the trend and is marked BOS.
- `close` mode (default) or `wick`. The result includes `active.high/low` (current levels, used by the higher-TF levels).

**Indicators (`indicators.js`)** — constants in `panel.js` (`MAX`, `EXT_FACTOR = 3`)
- **FVG**: `low[i] > high[i-2]` (bullish) / `high[i] < low[i-2]` (bearish), minimum size `0.25 × ATR(14)`; disappears when a candle fills it completely. Max. 10 most recent.
- **Order Block**: after each BOS/CHoCH, take the extreme between the broken swing and the break; the OB is the last opposite candle there (up to 2 before). Shown in full (wick to wick). Mitigated when a **close** goes through it. Max. 6.
- **EQH/EQL**: two consecutive swings of the same type differing by `≤ 0.1 × ATR(14)`. Ends on a sweep or a break. Max. 8.
- **Sweep**: the wick goes beyond a swing and the candle closes back inside (if it closes beyond, it is a break). Each swing yields at most one sweep.
  The candle that **forms** an EQH (second near-equal high) does **not** count as a sweep, and a candle that sweeps several levels is marked only once. Max. 12.
- **External**: same algorithm with `n × 3`. **Higher-TF levels**: each panel receives only the higher timeframes (1D receives nothing).
- Daily **VWAP** (not applied on 1D or without volume). **Volume**: forex has none (IB delivers MIDPOINT; IB's `-1` values are normalized to 0).

**Times**: lightweight-charts draws in UTC; candles are shifted by the `America/New_York` offset (`DISPLAY_TZ` in `api.js`). The daily candle is aligned to midnight of its day.

---

## 7. Verification status (be honest about this)

| Part | Status |
|---|---|
| Structure and indicator logic | Covered by tests (`npm test`) |
| UI (layouts, menu, guide, favorites, synced crosshair, cookies) | Tested in headless Chromium with simulated data |
| IB client (search, historical data, forex) | Tested **only against a fake IB** that emits the same events; checked against the `@stoqey/ib` typings |
| **Connection to a real IB Gateway** | **Not verified by the AI.** Real testing is done by the user |
| Data permissions for forex/stocks on their account | Unknown: IB may reject series without a subscription (the panel shows IB's error) |

If the user reports an IB error, ask for the exact message (code and text) before speculating.

---

## 8. Things that already bit us (gotchas)

- `reqMatchingSymbols` **does not return forex pairs**. They are resolved with a list (`forex.js`) and `reqContractDetails` to get the `conId`.
- Forex uses `MIDPOINT` (not `TRADES`) and has no volume; daily bars may arrive as `yyyymmdd` (normalized in `ib.js`).
- End of historical data in `@stoqey/ib`: a `historicalData` event whose `time` starts with `finished`. Informational errors 2100–2999 are not failures (`isNonFatalError`).
- IB limits ~60 historical requests per 10 min: there is a TTL cache and a queue with a pause (`historicalGapMs`). Do not remove them.
- **One session per user at IBKR**: the same user cannot be logged into IBKR Desktop and Gateway at the same time. Options: a paper account with its own user,
  a secondary user, or (with shared data) giving up on using the data in both at once. Do not use Client Portal with the same user as Gateway.
- Cookies are shared between tabs; changes from one tab reach the others when they regain focus.
- `Number('')` is `0`: when reading URL parameters use `parseInt` and validate (there was already a bug like this with `n`).
- A test that failed because of badly built data does not always indicate a code bug: check the data before "fixing" the logic.

---

## 9. Security and limits (hard rules)

1. **Never** add order submission, account modification, or endpoints that perform trading actions. This project is read-only.
2. Keep the server on **`127.0.0.1`**; do not expose it to the network. In Gateway, the user must keep **Read-Only API** enabled.
3. Do not log, upload or share credentials, account numbers or position data.
4. Educational content: keep the "illustrative / not investment advice" disclaimers.
5. Do not insert external data as unescaped HTML: the UI uses `textContent`; the diagram SVG is our own and static (a test checks this).
6. Respect the `lightweight-charts` attribution (the TradingView logo is shown by default; do not hide it).

---

## 10. Pending work and ideas (not promised; confirm with the user first)

- **Observation log**: record each EQH/sweep/FVG with its measurements (distance in ATR, wick, close, outcome) so the user learns from their own cases.
- **Practice mode**: the user marks swings/CHoCH with clicks and then compares with what the algorithm marked.
- **Per-panel** toggles (today they apply to all 4 panels at once).
- Layout giving more weight to one timeframe (once the user clarifies the "role" of each; see README).
- Futures (require choosing an expiry), more forex pairs (edit `FOREX_PAIRS`), sessions (Asia/London/NY) and previous day/week levels.
- Testing against real IB as soon as the user can provide results (data-permission error codes, forex `reqContractDetails`, etc.).

---

## 11. Rules for changing code

1. Keep the detection logic **pure** (no DOM, no Node) so it can be tested.
2. Every new indicator: pure function + tests in `test/`, an entry in `help.js` **and** `examples.js` and in their `.en.js` versions (tests require them to exist, be complete and have the same shape in both languages),
   a switch in the menu, a key in `IND_KEYS` in `app.js` (and in the copy of that list in `test/help.test.js`), and a row in the README table.
3. Run `npm test` before delivering. If you touch the UI, test it in a headless browser with `npm run mock` and look at a screenshot.
4. Do not change `server/config.js` (port, clientId) without asking: the user adjusted it to their environment.
5. Update the README and this file when anything described here changes.
6. Small, verifiable changes; avoid broad refactors unless asked.
