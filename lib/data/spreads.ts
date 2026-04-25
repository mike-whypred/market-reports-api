import type { DataPoint } from "../types";

export interface SpreadDef {
  name: string;
  leg1: string;
  leg2: string;
  type: "return" | "absolute";
  displayName: string;
  assetClass: string;
}

export const SPREAD_DEFS: SpreadDef[] = [
  { name: "SP5NDQ", leg1: "S&P500", leg2: "NASDAQ", type: "return", displayName: "S&P 500 vs Nasdaq", assetClass: "Spreads" },
  { name: "SP5R2000", leg1: "S&P500", leg2: "RUSSELL", type: "return", displayName: "S&P 500 vs Russell 2000", assetClass: "Spreads" },
  { name: "VALGROW", leg1: "VALUE", leg2: "GROWTH", type: "return", displayName: "Value vs Growth", assetClass: "Spreads" },
  { name: "VALMOM", leg1: "VALUE", leg2: "MOMENTUM", type: "return", displayName: "Value vs Momentum", assetClass: "Spreads" },
  { name: "VALQUAL", leg1: "VALUE", leg2: "QUALITY", type: "return", displayName: "Value vs Quality", assetClass: "Spreads" },
  { name: "DMEM", leg1: "DM", leg2: "EM", type: "return", displayName: "DM vs EM Equity", assetClass: "Spreads" },
  { name: "DMBONDS", leg1: "DM", leg2: "BONDS", type: "return", displayName: "DM Equity vs Bonds", assetClass: "Spreads" },
  { name: "AUAG", leg1: "GOLD", leg2: "SILVER", type: "return", displayName: "Gold vs Silver", assetClass: "Spreads" },
  { name: "OILWOILB", leg1: "WTI", leg2: "BRENT", type: "return", displayName: "WTI vs Brent", assetClass: "Spreads" },
  { name: "UST2UST10", leg1: "UST10Y", leg2: "UST2Y", type: "absolute", displayName: "2s10s Yield Curve", assetClass: "Spreads" },
  { name: "USREAL10", leg1: "UST10Y", leg2: "USBEI10Y", type: "absolute", displayName: "10Y Real Yield", assetClass: "Spreads" },
];

export const SPREAD_LOOKUP: Map<string, SpreadDef> = new Map(SPREAD_DEFS.map((s) => [s.name, s]));

export function calculateSpreads(
  wideData: Map<string, Map<string, number>>,
  sortedDates: string[],
): DataPoint[] {
  const results: DataPoint[] = [];

  for (const spread of SPREAD_DEFS) {
    if (spread.type === "absolute") {
      // Absolute difference of levels
      for (const date of sortedDates) {
        const row = wideData.get(date);
        if (!row) continue;
        const v1 = row.get(spread.leg1);
        const v2 = row.get(spread.leg2);
        if (v1 == null || v2 == null) continue;
        results.push({ date, asset: spread.name, value: v1 - v2 });
      }
    } else {
      // Cumulative difference of percent returns
      // Each day: compute daily return difference, then cumsum so the "level"
      // represents total cumulative relative performance (meaningful for % change deltas)
      let prevLeg1: number | null = null;
      let prevLeg2: number | null = null;
      let cumulative = 0;

      for (const date of sortedDates) {
        const row = wideData.get(date);
        if (!row) continue;
        const v1 = row.get(spread.leg1);
        const v2 = row.get(spread.leg2);
        if (v1 == null || v2 == null) {
          prevLeg1 = v1 ?? prevLeg1;
          prevLeg2 = v2 ?? prevLeg2;
          continue;
        }

        if (prevLeg1 != null && prevLeg1 !== 0 && prevLeg2 != null && prevLeg2 !== 0) {
          const ret1 = (v1 - prevLeg1) / prevLeg1;
          const ret2 = (v2 - prevLeg2) / prevLeg2;
          cumulative += ret1 - ret2;
        }

        results.push({ date, asset: spread.name, value: cumulative });

        prevLeg1 = v1;
        prevLeg2 = v2;
      }
    }
  }

  return results;
}
