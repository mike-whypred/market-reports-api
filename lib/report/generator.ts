import type { DataPoint, TableRow, AssetMapping } from "../types";
import { BOND_ASSETS, getAssetIcon } from "./assets";

function createSparklineSvg(values: number[]): string {
  if (!values || values.length < 2) return "0,20 100,20";

  const min = Math.min(...values);
  const max = Math.max(...values);

  const normalized =
    max === min
      ? values.map(() => 20)
      : values.map((v) => 35 - ((v - min) / (max - min)) * 30);

  const step = 100 / (values.length - 1);

  return normalized.map((y, i) => `${(i * step).toFixed(2)},${y.toFixed(2)}`).join(" ");
}

function createSparklineArea(values: number[]): string {
  if (!values || values.length < 2) return "0,40 100,40 100,40 0,40";
  const linePoints = createSparklineSvg(values);
  return `0,40 ${linePoints} 100,40`;
}

export function generateTableData(
  data: DataPoint[],
  mapping: AssetMapping[],
  assetList: string[],
): { tableData: TableRow[]; reportDate: string } {
  // Build lookup: asset -> sorted array of {date, value}
  const assetData = new Map<string, { date: string; value: number }[]>();
  for (const pt of data) {
    let arr = assetData.get(pt.asset);
    if (!arr) {
      arr = [];
      assetData.set(pt.asset, arr);
    }
    arr.push({ date: pt.date, value: pt.value });
  }

  // Sort each asset's data by date
  for (const arr of assetData.values()) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Get unique dates sorted descending
  const allDates = Array.from(new Set(data.map((d) => d.date))).sort().reverse();

  if (allDates.length < 61) {
    throw new Error(`Not enough data to generate report (have ${allDates.length} days, need at least 61)`);
  }

  const lastDate = allDates[0];
  const date1w = allDates[Math.min(5, allDates.length - 1)];
  const date4w = allDates[Math.min(20, allDates.length - 1)];
  const date12w = allDates[Math.min(60, allDates.length - 1)];

  // Build mapping lookup
  const mappingLookup = new Map<string, AssetMapping>();
  for (const m of mapping) {
    mappingLookup.set(m.asset, m);
  }

  const tableData: TableRow[] = [];

  for (const asset of assetList) {
    const points = assetData.get(asset);
    if (!points || points.length === 0) continue;

    // Build date->value lookup for this asset
    const dateValueMap = new Map<string, number>();
    for (const p of points) {
      dateValueMap.set(p.date, p.value);
    }

    const lastValue = dateValueMap.get(lastDate);
    if (lastValue == null) continue;

    const value1w = dateValueMap.get(date1w) ?? lastValue;
    const value4w = dateValueMap.get(date4w) ?? lastValue;
    const value12w = dateValueMap.get(date12w) ?? lastValue;

    // Calculate deltas
    let delta1w: number, delta4w: number, delta12w: number;
    if (BOND_ASSETS.has(asset)) {
      delta1w = (lastValue - value1w) / 100;
      delta4w = (lastValue - value4w) / 100;
      delta12w = (lastValue - value12w) / 100;
    } else {
      delta1w = value1w !== 0 ? (lastValue - value1w) / value1w : 0;
      delta4w = value4w !== 0 ? (lastValue - value4w) / value4w : 0;
      delta12w = value12w !== 0 ? (lastValue - value12w) / value12w : 0;
    }

    // Extract trend arrays (values between date_Xw and lastDate)
    const trend1w = points.filter((p) => p.date >= date1w && p.date <= lastDate).map((p) => p.value);
    const trend4w = points.filter((p) => p.date >= date4w && p.date <= lastDate).map((p) => p.value);
    const trend12w = points.filter((p) => p.date >= date12w && p.date <= lastDate).map((p) => p.value);

    // Mapping info
    const m = mappingLookup.get(asset);
    const assetName = m?.asset_name ?? asset;
    const symbol = m?.symbol ?? asset;
    const assetClass = m?.asset_class ?? "Other";
    const icon = getAssetIcon(asset, assetClass);

    tableData.push({
      asset,
      asset_name: assetName,
      symbol,
      icon,
      asset_class: assetClass,
      last: lastValue,
      delta_1w: delta1w,
      delta_4w: delta4w,
      delta_12w: delta12w,
      trend_1w_svg: createSparklineSvg(trend1w),
      trend_4w_svg: createSparklineSvg(trend4w),
      trend_12w_svg: createSparklineSvg(trend12w),
      trend_1w_area: createSparklineArea(trend1w),
      trend_4w_area: createSparklineArea(trend4w),
      trend_12w_area: createSparklineArea(trend12w),
    });
  }

  return { tableData, reportDate: lastDate };
}
