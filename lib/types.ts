export interface DataPoint {
  date: string; // YYYY-MM-DD
  asset: string;
  value: number;
}

export interface AssetMapping {
  asset: string;
  asset_name: string;
  symbol: string;
  index: number;
  asset_class: string;
}

export interface TableRow {
  asset: string;
  asset_name: string;
  symbol: string;
  icon: string;
  asset_class: string;
  last: number;
  delta_1w: number;
  delta_4w: number;
  delta_12w: number;
  trend_1w_svg: string;
  trend_4w_svg: string;
  trend_12w_svg: string;
  trend_1w_area: string;
  trend_4w_area: string;
  trend_12w_area: string;
}

export interface ReportConfig {
  name: string;
  assets: string[];
}

export interface TemplateEntry {
  name: string;
  assets: string[];
  builtin: boolean;
}
