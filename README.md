# market-structure

An MVP to **learn how to mark market structure** (not to trade): it pulls candles from Interactive Brokers or Alpaca and draws
**HH / HL / LH / LL**, **BOS** and **CHoCH** on 4 timeframes at once (1D, 4H, 15m, 10m).

- Node + Express on the server, the browser for the charts ([lightweight-charts](https://github.com/tradingview/lightweight-charts)).
- Each browser tab is independent: its state lives in the URL (symbol, layout, parameters).
- Symbol search against the data provider and favorites saved in a cookie.
- Data provider chosen in `.env`: **IBKR** (default) or **Alpaca** (see [Data providers](#data-providers-ibkr-or-alpaca)).
- Interface and guide in **Spanish and English** (see [Language](#language)).

> Educational tool only. It never sends orders and nothing in it is investment advice.

## Quick start

```bash
npm install
cp .env.example .env # optional: provider, language, Alpaca keys (see below)
npm start            # IBKR by default: connects to IB at 127.0.0.1:4001 (IB Gateway, live)
# IB_PORT=4002 npm start   ← IB Gateway paper account
# IB_PORT=7497 npm start   ← TWS paper
npm run mock         # simulated data, no IB needed (to try the interface)
npm test             # unit tests
```

Then open <http://127.0.0.1:3000>. The first time, set up IB Gateway as described below (or switch to Alpaca).

## Data providers (IBKR or Alpaca)

The server talks to one data provider, chosen with `DATA_PROVIDER` in `.env`. Every provider implements the same
interface (`server/providers.js`), so the interface works the same with any of them.

| `DATA_PROVIDER` | What it needs | Instruments |
|---|---|---|
| `ibkr` (default) | IB Gateway or TWS running and logged in ([setup](#ib-gateway-setup)) | Stocks/ETFs, indices, forex |
| `alpaca` | An Alpaca account and API keys (paper or live) | US stocks and ETFs only |
| `mock` | Nothing (same as `npm run mock`) | Simulated data |

### `.env`

Copy `.env.example` to `.env` and edit it. `.env` is git-ignored: **never commit real keys**. Variables exported in the
shell take precedence over `.env` (for example `IB_PORT=4002 npm start` still works).

| Variable | Default | Meaning |
|---|---|---|
| `DATA_PROVIDER` | `ibkr` | `ibkr`, `alpaca` or `mock` |
| `APP_LANG` | `es` | Default UI language (`es` or `en`) |
| `IB_HOST` / `IB_PORT` / `IB_CLIENT_ID` | `127.0.0.1` / `4001` / `17` | IB Gateway/TWS connection |
| `ALPACA_API_KEY_ID` / `ALPACA_API_SECRET_KEY` | empty | Alpaca API keys |
| `ALPACA_PAPER` | `1` | `1` = paper keys, `0` = live keys (they are different key pairs) |
| `ALPACA_FEED` | `iex` | `iex` (free for every account) or `sip` (all US exchanges; free plans get it 15 min delayed) |
| `USE_RTH`, `PORT` | `1`, `3000` | Regular trading hours only; local web port |

### Alpaca setup

1. Create an account at [alpaca.markets](https://alpaca.markets) (a paper account is enough for market data).
2. In the dashboard, open **API Keys** and generate a key pair. Paper and live accounts have separate keys.
3. In `.env`: `DATA_PROVIDER=alpaca`, the two keys, and `ALPACA_PAPER=0` only if they are live keys.
4. `npm start`. The console prints `[alpaca] keys OK` and the status dot turns green.

What to know about Alpaca:

- **Read-only.** The app only makes GET requests to the market data, asset list and market clock endpoints. It never
  calls orders, positions or account endpoints.
- **No forex and no indices.** Alpaca serves FX data only to broker partners, so EUR.USD, GBP.USD, SPX… keep working
  only with IBKR. Asking Alpaca for them shows an "Alpaca does not provide data for…" message in the panel.
- **Search** uses Alpaca's list of active US equities (downloaded once, cached for 12 h) and matches symbol or name.
- **IEX feed** (default) covers a single exchange, so volume is lower than the consolidated tape; prices and structure
  are close to SIP. Use `ALPACA_FEED=sip` if your plan allows it.
- **4H candles with regular hours** are built from 30-minute bars so they start at 9:30 and 13:30 New York, like IB's.
  With `USE_RTH=0` Alpaca's own 4-hour bars are used.
- Instrument ids: Alpaca has no IB `conId`, so the server derives a stable numeric id from the symbol. Stock favorites
  saved with IBKR still open with Alpaca (bars are requested by symbol).

## IB Gateway setup

The app reads market data through the IB API, which is served by **IB Gateway** (or by TWS). IBKR Desktop and Client
Portal do **not** expose the socket API, so they cannot be used for this.

### 1. Download and install

1. Go to <https://www.interactivebrokers.com/en/trading/ibgateway-stable.php> (Interactive Brokers site →
   *Trading* → *Platforms* → *IB Gateway*).
2. Pick the **Stable** version for your OS (macOS, Windows or Linux) and download the installer.
3. Install it like any other app. On macOS, open the `.dmg` and run the installer; if macOS blocks it, allow it in
   *System Settings → Privacy & Security*.

### 2. Log in

1. Open **IB Gateway**.
2. Choose **IB API** (not *FIX CTCI*).
3. Choose **Live Trading** or **Paper Trading** (the paper account has its own username, visible in Client Portal →
   *Settings* → *Paper Trading Account*).
4. Enter your IBKR username and password and approve the second factor (IBKR Mobile) if asked.

**One session per user.** IBKR allows only one active session per username. If you log in to IB Gateway with the
same user you use in IBKR Desktop, TWS or the mobile app, one of them gets disconnected. Options: use the paper account
(its own username), create a secondary user for API access, or don't use both at the same time.

### 3. API settings

In IB Gateway: **Configure → Settings → API → Settings**.

| Setting | Value |
|---|---|
| Enable ActiveX and Socket Clients | ✅ (on by default in Gateway) |
| **Read-Only API** | ✅ keep it on: this project never sends orders |
| Socket port | `4001` live · `4002` paper (TWS: `7496` live · `7497` paper) |
| Allow connections from localhost only | ✅ |
| Trusted IPs | `127.0.0.1` |

Click **Apply / OK**. The port must match the app: by default it uses `4001` (`server/config.js`); override it with
`IB_PORT`. Other variables: `IB_HOST` (default `127.0.0.1`) and `IB_CLIENT_ID` (default `17`, must be unique among
API clients connected to the same Gateway).

Optional, in **Configure → Settings → Lock and Exit**: IB Gateway restarts or logs off once a day; choose
*Auto restart* so it stays connected.

### 4. Start the app

1. With IB Gateway logged in, run `npm start` (or `IB_PORT=4002 npm start` for paper).
2. The console prints `market-structure → http://127.0.0.1:3000` and the IB host/port.
3. Open that URL. The dot at the right of the top bar is **green** when connected to IB, **red** when not
   (hover it to see the error), and **orange** in mock mode.
4. Search for a symbol (`AAPL`, `SPY`, `EUR.USD`…) and choose it.

### Troubleshooting

| Symptom | What to check |
|---|---|
| Red dot, "Not connected to IB" | Gateway is open and logged in, the port in Gateway matches `IB_PORT`, *Enable ActiveX and Socket Clients* is on |
| Connects and then drops | Another session with the same IBKR user (Desktop, TWS, mobile) took over; see *One session per user* |
| "clientId already in use" | Another program uses the same client id: run with `IB_CLIENT_ID=<another number>` |
| A panel shows an IB error about market data | Your account has no data subscription for that instrument. Without one, IB delivers delayed data or rejects some symbols. The panel shows IB's own message |
| No candles outside market hours | Regular trading hours only by default: `USE_RTH=0 npm start` includes pre/post market |

When reporting an IB error, include the exact code and text that IB returned.

## Usage

| Action | How |
|---|---|
| Search symbol | Type in the search box (↑↓ Enter). `Ctrl/⌘+Enter` opens it in a new tab |
| Favorite | ★ next to the symbol. Chips below the bar: click = load here, `↗` = new tab |
| Layout 4 → 2 → 1 | **Layout** button or the `L` key |
| Which timeframe to show (layouts 2 and 1) | `1D 4H 15m 10m` chips or click a panel's title. Double click = maximize |
| Another symbol side by side | **Duplicate tab ↗** and change the symbol in one of them |
| Sensitivity | `n` of each panel (− / +) |
| Break by close or by wick | **Break** selector |
| Language | **ES / EN** selector |

## Language

The interface and the guide are available in Spanish and English. The default language is set in `server/config.js`
(`lang`, from `APP_LANG=en` in `.env` or the shell; Spanish if not set). Each browser can switch with the **ES/EN** selector in the
top bar: the choice is saved in the `ms_lang` cookie and the page reloads without losing the view.

## How structure is marked (rules in `public/js/structure.js`)

- **Swing high/low**: a high (low) higher (lower) than the `n` candles on each side. It is **confirmed `n` candles later**,
  which is why the most recent marks appear with a delay: this is normal for any swing indicator.
- **HH/LH, HL/LL**: each swing is compared with the previous one of the same type.
- **Break** of the last swing not yet broken:
  - with the current trend → **BOS**
  - against it → **CHoCH** (the trend flips)
  - the first break on the chart sets the trend and is marked as BOS.

The right `n` depends on the timeframe and your judgment: if you see too much noise raise `n`; if swings are missing, lower it.

## Known MVP limits

- Supports stocks/ETFs (`STK`), indices (`IND`) and forex (`CASH`). **No futures** (they need an expiry).
- **Forex:** IB's text search does not return currency pairs, so 14 IDEALPRO pairs are offered from `server/forex.js` (EUR.USD, GBP.USD, USD.JPY…). Search `EUR.USD`, `eurusd` or `gbp`. To add more pairs, edit that list.
- Regular trading hours by default (`USE_RTH=0` to include pre/post).
- Times are shown in New York time (`DISPLAY_TZ` in `public/js/api.js`).
- Without a data subscription, IB delivers delayed data or rejects some symbols (the panel shows IB's error).
- IB limits historical requests (~60 / 10 min): the server caches and spaces out requests. Alpaca's free plan allows
  200 requests/min; bars are cached the same way.
- The Alpaca provider is tested only against a fake API (no real keys were available while building it).
- Favorites, indicators and language are cookies of the host `127.0.0.1`; if you open the app as `localhost` you won't see them.

## Layout

```
server/   config.js (reads .env) · providers.js (picks the provider) · ib.js (IBKR: cache, pacing) · alpaca.js (Alpaca)
          forex.js · mock.js · index.js (Express)
public/   index.html · css/ · js/ (app, panel, structure, indicators, help, examples, structurePrimitive, favorites, api, i18n)
          js/locales/ (es, en: UI text) · help.en.js · examples.en.js (English guide)
test/     structure.test.js · indicators.test.js · forex.test.js · help.test.js · alpaca.test.js
```

## Optional indicators (**Indicators ▾** menu)

All are **off by default**. They are saved in the URL (so "Duplicate tab" copies the view) and in the `ms_ind`
cookie (a new tab without parameters remembers your last choice). They apply to all 4 panels.

**Contextual guide (`?`).** Every mark has a `?` button (in the indicators menu, next to HH/HL/LH/LL and BOS/CHoCH,
and next to each panel's `n`) and there is a **? Guide** button in the top bar. It opens a side panel with a diagram,
what it is, how to read it, the exact rule the app applies, what to practice and its limits. From the guide you can
also turn the indicator on or off without closing it; the charts resize to stay visible. `Esc` closes it.
The content is in `public/js/help.js` and `examples.js` (English: `help.en.js` and `examples.en.js`).

Each guide entry includes a **step-by-step example** with illustrative numbers: the situation, what to do in the app,
the possible scenarios ("if A happens → how to read it → what to check"), what to measure and common mistakes.
**EQH/EQL** has the most detailed one, with 4 diagrams (how it forms, sweep, break and where to measure).
The numbers are illustrative, not statistics or recommendations.

| Indicator | What it shows | Exact rule |
|---|---|---|
| **FVG** | A 3-candle gap price has not filled yet | Bullish: `low[i] > high[i-2]`; bearish: `high[i] < low[i-2]`. Minimum 0.25×ATR(14). Hidden when a candle fills it completely. Max. 10 recent |
| **Order Blocks** | Zone of the last opposite candle before a break of structure | Between the broken swing and the break, the extreme is taken (the low in a bullish break); the OB is the last opposite candle at that point (up to 2 candles earlier). Hidden when a **close** goes through the zone. Max. 6 |
| **EQH / EQL** | Nearly equal highs/lows (liquidity) | Two consecutive swings of the same type within ≤ 0.1×ATR. The line extends until it is swept or broken. Max. 8 |
| **Sweeps** | Liquidity sweep | The wick takes out a swing and the candle **closes back** inside. If it closes beyond, it is a break (BOS/CHoCH), not a sweep. Max. 12 |
| **External (n×3)** | Second structure scale | Same algorithm with `n` tripled; drawn with pill labels and thick lines over the internal one |
| **Higher TF levels** | Top-down alignment aid | On each panel, the active swing high/low and last break of the higher timeframes (1D purple, 4H cyan, 15m lime). Loads hidden panels in the background if needed. Only visible if inside the visible price range |
| **EMA 50 / 200** | Exponential moving averages | Seeded with an SMA. EMA 200 needs 200 candles |
| **VWAP (daily)** | Volume-weighted average price | Resets every day (exchange time). Not applicable on 1D |
| **Volume** | Bottom histogram | Forex has no volume (IB returns MIDPOINT): the panel says so |

Zones and levels are a **visual aid for practice**; with everything on the chart gets crowded, so turn on one or two at a time.

## 📝 Still to learn

- **Role of each timeframe (top-down analysis).** The MVP gives the 4 timeframes the same weight because the goal is
  only to learn how to mark. It is still to be understood how they are used together: 1D = overall bias, 4H = relevant
  structure, 15m = confirmation, 10m = fine execution. To study: which CHoCH/BOS on a lower timeframe "counts" only if
  it is aligned with the higher one? Once this is clear, a layout that gives more weight to one of them can be designed.
