# Market Reports API

Standalone REST API that generates self-contained HTML market performance reports on demand. Fetches live market data from multiple sources, computes weekly/monthly/quarterly deltas with sparkline trends, and returns a styled HTML document.

## Quick Start (Local)

```bash
npm install
npm run dev    # starts on port 3000 (or PORT env var)
```

## Deploy to Render

1. Create a new **Web Service** on Render
2. Connect this repo, set **Root Directory** to `api`
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Add environment variables (see below)

Render will auto-assign a port via the `PORT` env var.

## Environment Variables

| Variable | Required For | Notes |
|----------|-------------|-------|
| `FRED_API_KEY` | FRED tickers (DGS*, T*YIE, etc.) | Free at https://fred.stlouisfed.org/docs/api/api_key.html |
| `ALPHA_VANTAGE_API_KEY` | FX pairs (EURUSD, etc.) | Free tier: 5 req/min. https://www.alphavantage.co/support/#api-key |
| `FMP_API_KEY` | Crypto tickers (BTCUSD, etc.) | https://financialmodelingprep.com/developer |

Yahoo Finance tickers require no API key. If a key is missing, tickers for that source silently return no data.

## Endpoints

### `GET /health`

Returns `{"status": "ok"}`. Use as Render health check path.

### `POST /api/report`

Generates an HTML market report for the specified tickers.

**Content-Type:** `application/json`
**Response:** `text/html; charset=utf-8`

#### Request Body

```json
{
  "tickers": [
    { "ticker": "AAPL", "name": "Apple Inc" },
    { "ticker": "MSFT", "name": "Microsoft Corp" },
    { "ticker": "DGS10", "name": "US 10Y Treasury" },
    { "ticker": "EURUSD", "name": "EUR/USD" },
    { "ticker": "BTCUSD", "name": "Bitcoin" }
  ],
  "color": "#1e293b",
  "endDate": "2026-04-17",
  "reportName": "My Portfolio Report"
}
```

#### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `tickers` | `Array<{ticker, name}>` | Yes | — | List of tickers to include. Each needs `ticker` (symbol) and `name` (display name). Order is preserved. |
| `color` | `string` | No | `#1e293b` (dark slate) | 6-digit hex color for the report header banner. A full theme is derived: gradient, text contrast, hover tint. |
| `endDate` | `string` | No | Latest available | Filter data up to this date. Format: `YYYY-MM-DD`. |
| `reportName` | `string` | No | `"Market Report"` | Title in the report header and HTML `<title>`. |

#### Ticker Auto-Detection

Each ticker is automatically routed to the correct data source:

| Source | Pattern | Examples |
|--------|---------|----------|
| **Yahoo Finance** | Default (anything not matching below) | `AAPL`, `^GSPC`, `^VIX`, `SPY`, `GLD` |
| **FRED** | Known series: `DGS*`, `T*YIE`, `BAML*`, `FEDFUNDS`, `SOFR` | `DGS10`, `T5YIE`, `BAMLC0A4CBBB` |
| **Alpha Vantage** | 6 uppercase chars, both halves are ISO currency codes | `EURUSD`, `GBPUSD`, `AUDUSD` |
| **FMP** | Uppercase ending in `USD`, base is not a currency code | `BTCUSD`, `ETHUSD`, `SOLUSD` |

#### Response

**200:** Complete self-contained HTML document with inline CSS, Google Fonts, Font Awesome, SVG sparklines.

**400/422/500:** JSON error:
```json
{ "error": "description" }
```

#### Report Contents

- Header banner with report name and date (styled with provided color)
- Table: Asset (icon + name + ticker) | Level | 1W Change + Trend | 1M Change + Trend | 3M Change + Trend
- Sparklines: inline SVGs, green (positive) / red (negative) with area fills

#### Data Requirements

- Fetches ~150 days of history, filters to last 120
- Needs at least 61 unique trading days for all three time horizons
- `endDate` too far in the past may cause insufficient data errors

## Examples

### Two stocks, default style

```bash
curl -X POST https://your-api.onrender.com/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": [
      {"ticker": "AAPL", "name": "Apple"},
      {"ticker": "MSFT", "name": "Microsoft"}
    ]
  }' > report.html
```

### Custom color, mixed sources

```bash
curl -X POST https://your-api.onrender.com/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": [
      {"ticker": "^GSPC", "name": "S&P 500"},
      {"ticker": "DGS10", "name": "US 10Y Treasury"},
      {"ticker": "EURUSD", "name": "EUR/USD"},
      {"ticker": "BTCUSD", "name": "Bitcoin"}
    ],
    "color": "#1e3a5f",
    "reportName": "Cross-Asset Dashboard"
  }' > report.html
```

## Performance

| Source | Latency | Notes |
|--------|---------|-------|
| Yahoo Finance | ~2-5s | Batched in groups of 5 |
| FRED | ~1-2s | Parallel |
| FMP | ~1-2s | Parallel |
| Alpha Vantage | ~12s per ticker | Rate-limited. Minimize FX tickers for speed. |

**Tip:** For FX without rate limits, use Yahoo Finance equivalents: `EURUSD=X` instead of `EURUSD`.
