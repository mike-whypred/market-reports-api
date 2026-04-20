import type { DataPoint } from "../types";
import { calculateSpreads } from "./spreads";

/**
 * Takes raw DataPoint[] from all sources, applies:
 * 1. Pivot to wide format (date -> asset -> value)
 * 2. Filter to last 120 days
 * 3. Drop dates where >25% of assets have no value
 * 4. Forward-fill missing values per asset
 * 5. Calculate spreads
 * 6. Return as DataPoint[] (long format)
 */
export function transformData(raw: DataPoint[]): DataPoint[] {
  // 1. Collect all unique assets and dates
  const assetSet = new Set<string>();
  const dateMap = new Map<string, Map<string, number>>();

  for (const pt of raw) {
    assetSet.add(pt.asset);
    let row = dateMap.get(pt.date);
    if (!row) {
      row = new Map();
      dateMap.set(pt.date, row);
    }
    row.set(pt.asset, pt.value);
  }

  // 2. Filter to last 120 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 120);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const allDates = Array.from(dateMap.keys())
    .filter((d) => d >= cutoffStr)
    .sort();

  const assets = Array.from(assetSet);
  const totalAssets = assets.length;

  // 3. Drop dates where >25% of assets are missing
  const filteredDates: string[] = [];
  for (const date of allDates) {
    const row = dateMap.get(date)!;
    let missing = 0;
    for (const a of assets) {
      if (!row.has(a)) missing++;
    }
    if (missing / totalAssets < 0.25) {
      filteredDates.push(date);
    }
  }

  // 4. Forward-fill per asset
  const wideData = new Map<string, Map<string, number>>();
  const lastKnown = new Map<string, number>();

  for (const date of filteredDates) {
    const srcRow = dateMap.get(date)!;
    const filledRow = new Map<string, number>();

    for (const asset of assets) {
      const val = srcRow.get(asset);
      if (val != null) {
        filledRow.set(asset, val);
        lastKnown.set(asset, val);
      } else {
        const prev = lastKnown.get(asset);
        if (prev != null) {
          filledRow.set(asset, prev);
        }
      }
    }

    wideData.set(date, filledRow);
  }

  // 5. Calculate spreads
  const spreadPoints = calculateSpreads(wideData, filteredDates);

  // Add spread values into wideData for downstream use
  for (const sp of spreadPoints) {
    const row = wideData.get(sp.date);
    if (row) row.set(sp.asset, sp.value);
  }

  // 6. Melt back to long format
  const result: DataPoint[] = [];
  for (const date of filteredDates) {
    const row = wideData.get(date)!;
    for (const [asset, value] of row.entries()) {
      if (!isNaN(value) && isFinite(value)) {
        result.push({ date, asset, value });
      }
    }
  }

  return result;
}
