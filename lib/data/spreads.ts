import type { DataPoint } from "../types";

interface SpreadDef {
  name: string;
  leg1: string;
  leg2: string;
  type: "return" | "absolute";
}

const SPREAD_DEFS: SpreadDef[] = [
  { name: "SP5NDQ", leg1: "S&P500", leg2: "NASDAQ", type: "return" },
  { name: "SP5R2000", leg1: "S&P500", leg2: "RUSSELL", type: "return" },
  { name: "VALGROW", leg1: "VALUE", leg2: "GROWTH", type: "return" },
  { name: "VALMOM", leg1: "VALUE", leg2: "MOMENTUM", type: "return" },
  { name: "VALQUAL", leg1: "VALUE", leg2: "QUALITY", type: "return" },
  { name: "DMEM", leg1: "DM", leg2: "EM", type: "return" },
  { name: "DMBONDS", leg1: "DM", leg2: "BONDS", type: "return" },
  { name: "AUAG", leg1: "GOLD", leg2: "SILVER", type: "return" },
  { name: "OILWOILB", leg1: "WTI", leg2: "BRENT", type: "return" },
  { name: "UST2UST10", leg1: "UST10Y", leg2: "UST2Y", type: "absolute" },
  { name: "USREAL10", leg1: "UST10Y", leg2: "USBEI10Y", type: "absolute" },
];

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
