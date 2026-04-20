import express from "express";
import { fetchTickers, type TickerInput } from "./lib/data/fetch-tickers.js";
import { transformData } from "./lib/data/transforms.js";
import { generateTableData } from "./lib/report/generator.js";
import { generateReportHTML, deriveTheme } from "./lib/report/template.js";
import { getAssetIcon } from "./lib/report/assets.js";
import type { AssetMapping } from "./lib/types.js";

const app = express();
app.use(express.json());

interface RequestBody {
  tickers: TickerInput[];
  color?: string;
  endDate?: string;
  reportName?: string;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/report", async (req, res) => {
  const body = req.body as RequestBody;
  const { tickers, color, endDate, reportName } = body;

  if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
    res.status(400).json({
      error: "tickers is required and must be a non-empty array of {ticker, name}",
    });
    return;
  }

  for (const t of tickers) {
    if (!t.ticker || !t.name) {
      res.status(400).json({
        error: `Each ticker must have "ticker" and "name" fields. Got: ${JSON.stringify(t)}`,
      });
      return;
    }
  }

  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    res.status(400).json({
      error: "color must be a valid 6-digit hex color (e.g., #1e293b)",
    });
    return;
  }

  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    res.status(400).json({ error: "endDate must be in YYYY-MM-DD format" });
    return;
  }

  try {
    const raw = await fetchTickers(tickers);

    if (raw.length === 0) {
      res.status(422).json({
        error: "No data returned for any of the provided tickers",
      });
      return;
    }

    let transformed = transformData(raw);

    if (endDate) {
      transformed = transformed.filter((d) => d.date <= endDate);
    }

    if (transformed.length === 0) {
      res.status(422).json({ error: "No data available after filtering" });
      return;
    }

    const mapping: AssetMapping[] = tickers.map((t, i) => ({
      asset: t.name,
      asset_name: t.name,
      symbol: t.ticker,
      index: i,
      asset_class: "Other",
    }));

    const assetList = tickers.map((t) => t.name);
    const { tableData, reportDate } = generateTableData(transformed, mapping, assetList);

    for (const row of tableData) {
      row.icon = getAssetIcon(row.asset, row.asset_class);
    }

    const theme = color ? deriveTheme(color) : undefined;
    const title = reportName || "Market Report";
    const html = generateReportHTML(title, reportDate, tableData, theme);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`Market Reports API listening on port ${port}`);
});
