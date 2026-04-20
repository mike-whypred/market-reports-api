import type { ReportConfig } from "../types";

export const REPORT_TYPES: Record<string, ReportConfig> = {
  aa: {
    name: "THE ASSET ALLOCATOR'S REPORT",
    assets: [
      "USDJPY", "EURUSD", "GBPUSD", "AUDUSD",
      "S&P500", "NASDAQ", "DM", "EM",
      "BONDS", "UST10Y", "USBEI10Y", "USCS",
      "GOLD", "SILVER", "WTI", "BRENT",
      "BTCUSD", "ETHUSD", "XRPUSD", "SOLUSD",
    ],
  },
  eq: {
    name: "THE EQUITY PM'S REPORT",
    assets: [
      "S&P500", "NASDAQ", "RUSSELL", "VALUE",
      "GROWTH", "MOMENTUM", "QUALITY", "VIX",
      "DISCRETIONARY", "STAPLES", "ENERGY", "FINANCIALS",
      "HEALTHCARE", "INDUSTRIAL", "MATERIALS", "REALESTATE",
      "TECHNOLOGY", "UTILITIES", "COMMUNICATION", "DM", "EM",
    ],
  },
  sp: {
    name: "THE TRADER'S REPORT",
    assets: [
      "SP5NDQ", "SP5R2000", "VALGROW", "VALMOM", "VALQUAL",
      "DMEM", "DMBONDS", "AUAG", "OILWOILB", "UST2UST10", "USREAL10",
    ],
  },
};

export const ASSET_ICONS: Record<string, string> = {
  // FX
  USDJPY: "fa-solid fa-yen-sign",
  EURUSD: "fa-solid fa-euro-sign",
  GBPUSD: "fa-solid fa-sterling-sign",
  AUDUSD: "fa-solid fa-dollar-sign",
  // Indices
  "S&P500": "fa-solid fa-chart-line",
  NASDAQ: "fa-solid fa-microchip",
  RUSSELL: "fa-solid fa-building",
  // Factors
  VALUE: "fa-solid fa-gem",
  GROWTH: "fa-solid fa-rocket",
  MOMENTUM: "fa-solid fa-fire",
  QUALITY: "fa-solid fa-award",
  VIX: "fa-solid fa-triangle-exclamation",
  // Sectors
  DISCRETIONARY: "fa-solid fa-shopping-cart",
  STAPLES: "fa-solid fa-basket-shopping",
  ENERGY: "fa-solid fa-bolt",
  FINANCIALS: "fa-solid fa-building-columns",
  HEALTHCARE: "fa-solid fa-heart-pulse",
  INDUSTRIAL: "fa-solid fa-industry",
  MATERIALS: "fa-solid fa-hammer",
  REALESTATE: "fa-solid fa-house",
  TECHNOLOGY: "fa-solid fa-laptop-code",
  UTILITIES: "fa-solid fa-plug",
  COMMUNICATION: "fa-solid fa-tower-cell",
  // Markets
  DM: "fa-solid fa-globe",
  EM: "fa-solid fa-globe-asia",
  // Fixed Income
  BONDS: "fa-solid fa-file-invoice-dollar",
  UST2Y: "fa-solid fa-landmark",
  UST5Y: "fa-solid fa-landmark",
  UST10Y: "fa-solid fa-landmark",
  USBEI5Y: "fa-solid fa-percent",
  USBEI10Y: "fa-solid fa-percent",
  USCS: "fa-solid fa-chart-area",
  // Commodities
  GOLD: "fa-solid fa-coins",
  SILVER: "fa-solid fa-ring",
  WTI: "fa-solid fa-gas-pump",
  BRENT: "fa-solid fa-oil-can",
  // Crypto
  BTCUSD: "fa-brands fa-bitcoin",
  ETHUSD: "fa-brands fa-ethereum",
  XRPUSD: "fa-solid fa-coins",
  SOLUSD: "fa-solid fa-network-wired",
  // Spreads
  SP5NDQ: "fa-solid fa-right-left",
  SP5R2000: "fa-solid fa-right-left",
  VALGROW: "fa-solid fa-right-left",
  VALMOM: "fa-solid fa-right-left",
  VALQUAL: "fa-solid fa-right-left",
  DMEM: "fa-solid fa-right-left",
  DMBONDS: "fa-solid fa-right-left",
  AUAG: "fa-solid fa-right-left",
  OILWOILB: "fa-solid fa-right-left",
  UST2UST10: "fa-solid fa-right-left",
  USREAL10: "fa-solid fa-right-left",
};

export const ASSET_CLASS_ICONS: Record<string, string> = {
  FX: "fa-solid fa-dollar-sign",
  Equities: "fa-solid fa-chart-line",
  "Fixed Income": "fa-solid fa-landmark",
  Commodities: "fa-solid fa-oil-can",
  Cryptocurrency: "fa-brands fa-bitcoin",
  Spreads: "fa-solid fa-arrow-right-arrow-left",
};

// Assets where deltas use absolute difference / 100 instead of percentage change.
// Includes fixed income (basis points) and all spreads (cumulative return differences
// can cross zero, making percentage change meaningless).
export const BOND_ASSETS = new Set([
  "UST10Y", "UST5Y", "UST2Y", "USBEI5Y", "USBEI10Y", "USCS",
  "UST2UST10", "USREAL10",
  "SP5NDQ", "SP5R2000", "VALGROW", "VALMOM", "VALQUAL",
  "DMEM", "DMBONDS", "AUAG", "OILWOILB",
]);

export function getAssetIcon(asset: string, assetClass: string): string {
  return ASSET_ICONS[asset] ?? ASSET_CLASS_ICONS[assetClass] ?? "fa-solid fa-chart-line";
}
