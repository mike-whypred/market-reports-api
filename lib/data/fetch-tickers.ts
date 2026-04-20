import type { DataPoint } from "../types";

/**
 * Known patterns for auto-detecting which data source a ticker belongs to.
 */

// FRED series IDs we know about
const KNOWN_FRED: Set<string> = new Set([
  "DGS2", "DGS5", "DGS10", "DGS30", "DGS1", "DGS7", "DGS20",
  "T5YIE", "T10YIE", "T5YIFR",
  "BAMLC0A4CBBB", "BAMLC0A0CM", "BAMLH0A0HYM2",
  "FEDFUNDS", "SOFR", "EFFR",
]);

// 3-letter ISO currency codes for FX pair detection
const CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF",
  "CNY", "HKD", "SGD", "SEK", "NOK", "DKK", "ZAR", "MXN",
  "BRL", "INR", "KRW", "TRY", "PLN", "THB", "IDR", "MYR",
]);

type Source = "yahoo" | "fred" | "alphavantage" | "fmp";

export function detectSource(ticker: string): Source {
  // Check FRED first — exact match against known series
  if (KNOWN_FRED.has(ticker)) return "fred";
  // FRED pattern: all-caps with digits, typical FRED naming
  if (/^[A-Z]{2,}[0-9]+[A-Z]*$/.test(ticker) && !ticker.endsWith("USD")) {
    // Could be FRED — but also could be a Yahoo ticker. Check common FRED prefixes.
    if (/^DGS\d/.test(ticker) || /^T\d+Y/.test(ticker) || /^BAML/.test(ticker)) {
      return "fred";
    }
  }

  // FX pairs: exactly 6 uppercase letters where both halves are known currencies
  if (/^[A-Z]{6}$/.test(ticker)) {
    const base = ticker.slice(0, 3);
    const quote = ticker.slice(3, 6);
    if (CURRENCIES.has(base) && CURRENCIES.has(quote)) {
      return "alphavantage";
    }
  }

  // Crypto: 3-6 uppercase letters ending in USD (but not FX pairs)
  if (/^[A-Z]{3,6}USD$/.test(ticker) && ticker.length <= 9) {
    const base = ticker.slice(0, -3);
    if (!CURRENCIES.has(base)) {
      return "fmp";
    }
  }

  // Default: Yahoo Finance
  return "yahoo";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchYahooTicker(ticker: string, assetName: string): Promise<DataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 150);
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!res.ok) return [];

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) return [];

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] =
    result.indicators?.adjclose?.[0]?.adjclose ??
    result.indicators?.quote?.[0]?.close ??
    [];

  const points: DataPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const val = closes[i];
    if (val == null) continue;
    const d = new Date(timestamps[i] * 1000);
    points.push({ date: d.toISOString().slice(0, 10), asset: assetName, value: val });
  }
  return points;
}

async function fetchFredTicker(seriesId: string, assetName: string): Promise<DataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=2023-01-01`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const observations: { date: string; value: string }[] = json.observations ?? [];
  const points: DataPoint[] = [];

  for (const obs of observations) {
    if (obs.value === ".") continue;
    const val = parseFloat(obs.value);
    if (!isNaN(val)) points.push({ date: obs.date, asset: assetName, value: val });
  }
  return points;
}

async function fetchAlphaVantageTicker(ticker: string, assetName: string): Promise<DataPoint[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return [];

  const from = ticker.slice(0, 3);
  const to = ticker.slice(3, 6);
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&apikey=${apiKey}&outputsize=compact`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const timeSeries = json["Time Series FX (Daily)"];
  if (!timeSeries) return [];

  const points: DataPoint[] = [];
  for (const [date, values] of Object.entries(timeSeries)) {
    const val = parseFloat((values as Record<string, string>)["4. close"]);
    if (!isNaN(val)) points.push({ date, asset: assetName, value: val });
  }
  return points;
}

async function fetchFmpTicker(ticker: string, assetName: string): Promise<DataPoint[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 150);
  const fromStr = startDate.toISOString().slice(0, 10);

  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${fromStr}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const historical: { date: string; adjClose?: number; close?: number }[] = json.historical ?? [];
  const points: DataPoint[] = [];

  for (const entry of historical) {
    const val = entry.adjClose ?? entry.close;
    if (val != null) points.push({ date: entry.date, asset: assetName, value: val });
  }
  return points;
}

export interface TickerInput {
  ticker: string;
  name: string;
}

/**
 * Fetch data for a list of tickers, auto-detecting the source for each.
 * Alpha Vantage tickers are fetched sequentially with rate limiting.
 */
export async function fetchTickers(tickers: TickerInput[]): Promise<DataPoint[]> {
  // Group by source
  const groups: Record<Source, TickerInput[]> = {
    yahoo: [],
    fred: [],
    alphavantage: [],
    fmp: [],
  };

  for (const t of tickers) {
    const source = detectSource(t.ticker);
    groups[source].push(t);
  }

  // Fetch Yahoo, FRED, FMP in parallel
  const parallelPromises: Promise<DataPoint[]>[] = [];

  // Yahoo: batch in groups of 5
  for (let i = 0; i < groups.yahoo.length; i += 5) {
    const batch = groups.yahoo.slice(i, i + 5);
    parallelPromises.push(
      Promise.all(batch.map((t) => fetchYahooTicker(t.ticker, t.name))).then((r) => r.flat()),
    );
  }

  // FRED: all in parallel
  for (const t of groups.fred) {
    parallelPromises.push(fetchFredTicker(t.ticker, t.name));
  }

  // FMP: all in parallel
  for (const t of groups.fmp) {
    parallelPromises.push(fetchFmpTicker(t.ticker, t.name));
  }

  const parallelResults = (await Promise.all(parallelPromises)).flat();

  // Alpha Vantage: sequential with rate limit
  const avResults: DataPoint[] = [];
  for (let i = 0; i < groups.alphavantage.length; i++) {
    const t = groups.alphavantage[i];
    const points = await fetchAlphaVantageTicker(t.ticker, t.name);
    avResults.push(...points);
    if (i < groups.alphavantage.length - 1) {
      await sleep(12000);
    }
  }

  return [...parallelResults, ...avResults];
}
