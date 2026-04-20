import type { TableRow } from "../types";

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Parse hex color to RGB */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Lighten a hex color by a factor (0-1) */
function lighten(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

/** Relative luminance for contrast calculation */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface ReportTheme {
  bannerBg: string;
  bannerBgEnd: string;
  bannerText: string;
  bannerDateText: string;
  hoverBg: string;
}

export function deriveTheme(hex: string): ReportTheme {
  const lum = luminance(hex);
  const isDark = lum < 0.4;
  return {
    bannerBg: hex,
    bannerBgEnd: lighten(hex, 0.15),
    bannerText: isDark ? "#f8fafc" : "#111827",
    bannerDateText: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
    hoverBg: lighten(hex, 0.92),
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function changeHtml(delta: number): string {
  const positive = delta >= 0;
  const arrow = positive ? "↑" : "↓";
  const cls = positive ? "chg-pos" : "chg-neg";
  const val = fmt(Math.abs(delta * 100));
  return `<span class="chg ${cls}">${arrow} ${val}%</span>`;
}

function sparklineHtml(svgPoints: string, areaPoints: string, delta: number): string {
  const stroke = delta >= 0 ? "#16a34a" : "#dc2626";
  const fill = delta >= 0 ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)";
  return `<svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none">
    <polyline points="${areaPoints}" fill="${fill}" stroke="none"/>
    <polyline points="${svgPoints}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function iconClass(assetClass: string): string {
  const slug = assetClass.toLowerCase().replace(/\s+/g, "-");
  const valid = ["fx", "equities", "fixed-income", "commodities", "cryptocurrency", "spreads"];
  return valid.includes(slug) ? `icon-${slug}` : "icon-other";
}

function rowHtml(row: TableRow, index: number): string {
  const stripe = index % 2 === 1 ? ' class="stripe"' : "";
  return `<tr${stripe}>
    <td class="td-asset">
      <div class="asset">
        <div class="asset-icon ${iconClass(row.asset_class)}"><i class="${row.icon}"></i></div>
        <div>
          <div class="asset-name">${row.asset_name}</div>
          <div class="asset-ticker">${row.symbol}</div>
        </div>
      </div>
    </td>
    <td class="td-level">${fmt(row.last)}</td>
    <td class="pg-start">${changeHtml(row.delta_1w)}</td>
    <td class="td-spark">${sparklineHtml(row.trend_1w_svg, row.trend_1w_area, row.delta_1w)}</td>
    <td class="pg-start">${changeHtml(row.delta_4w)}</td>
    <td class="td-spark">${sparklineHtml(row.trend_4w_svg, row.trend_4w_area, row.delta_4w)}</td>
    <td class="pg-start">${changeHtml(row.delta_12w)}</td>
    <td class="td-spark">${sparklineHtml(row.trend_12w_svg, row.trend_12w_area, row.delta_12w)}</td>
  </tr>`;
}

const DEFAULT_THEME: ReportTheme = {
  bannerBg: "#1e293b",
  bannerBgEnd: "#334155",
  bannerText: "#f8fafc",
  bannerDateText: "rgba(255,255,255,0.45)",
  hoverBg: "#f0f4ff",
};

export function generateReportHTML(
  reportName: string,
  reportDate: string,
  tableData: TableRow[],
  theme?: ReportTheme,
): string {
  const rows = tableData.map((row, i) => rowHtml(row, i)).join("\n");
  const niceDate = formatDate(reportDate);
  const t = theme ?? DEFAULT_THEME;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            background: #f5f5f5;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            padding: 32px 24px;
        }

        .report {
            max-width: 1140px;
            margin: 0 auto;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04);
        }

        /* ── Header ── */
        .header {
            background: linear-gradient(135deg, ${t.bannerBg} 0%, ${t.bannerBgEnd} 100%);
            padding: 28px 32px;
        }

        .header h1 {
            font-size: 22px;
            font-weight: 700;
            color: ${t.bannerText};
            letter-spacing: -0.3px;
            line-height: 1.2;
        }

        .header .date {
            font-size: 12px;
            color: ${t.bannerDateText};
            margin-top: 6px;
        }

        /* ── Table ── */
        table { width: 100%; border-collapse: collapse; }

        thead th {
            padding: 10px 14px;
            text-align: center;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #9ca3af;
            background: #f9fafb;
        }

        thead tr:first-child th {
            border-bottom: 1px solid #f0f0f0;
        }

        thead tr:last-child th {
            border-bottom: 1px solid #e5e7eb;
        }

        thead th:first-child {
            text-align: left;
            padding-left: 24px;
        }

        th.gh {
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            letter-spacing: 0.05em;
        }

        /* ── Table body ── */
        td {
            padding: 14px;
            text-align: center;
            vertical-align: middle;
            border-bottom: 1px solid #f3f4f6;
        }

        tbody tr:last-child td { border-bottom: none; }

        tr.stripe td { background: #fafbfc; }

        tbody tr:hover td { background: ${t.hoverBg}; }

        /* ── Asset cell ── */
        .td-asset {
            text-align: left !important;
            padding-left: 24px !important;
        }

        .asset {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 200px;
        }

        .asset-icon {
            width: 38px;
            height: 38px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 15px;
            flex-shrink: 0;
        }

        .icon-fx {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            box-shadow: 0 2px 8px rgba(59,130,246,0.25);
        }
        .icon-equities {
            background: linear-gradient(135deg, #10b981, #059669);
            box-shadow: 0 2px 8px rgba(16,185,129,0.25);
        }
        .icon-fixed-income {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            box-shadow: 0 2px 8px rgba(139,92,246,0.25);
        }
        .icon-commodities {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            box-shadow: 0 2px 8px rgba(245,158,11,0.25);
        }
        .icon-cryptocurrency {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            box-shadow: 0 2px 8px rgba(6,182,212,0.25);
        }
        .icon-spreads {
            background: linear-gradient(135deg, #f472b6, #ec4899);
            box-shadow: 0 2px 8px rgba(236,72,153,0.25);
        }
        .icon-other {
            background: linear-gradient(135deg, #64748b, #475569);
            box-shadow: 0 2px 8px rgba(100,116,139,0.25);
        }

        .asset-name {
            font-weight: 600;
            font-size: 13px;
            color: #111827;
        }

        .asset-ticker {
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            color: #b0b0b0;
            margin-top: 2px;
            letter-spacing: 0.03em;
        }

        /* ── Level ── */
        .td-level {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
            font-size: 13px;
            color: #374151;
        }

        /* ── Change ── */
        .chg {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
        }

        .chg-pos { color: #16a34a; }
        .chg-neg { color: #dc2626; }

        /* ── Sparklines ── */
        .td-spark { width: 100px; padding: 10px 8px; }
        .spark { width: 100%; height: 30px; display: block; }

        /* ── Period divider ── */
        .pg-start { border-left: 1px solid #f0f0f0; }

        /* ── Print ── */
        @media print {
            body { padding: 0; background: #fff; }
            .report { box-shadow: none; border-radius: 0; }
            .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            tbody tr:hover td { background: transparent; }
        }
    </style>
</head>
<body>
    <div class="report">
        <div class="header">
            <h1>${reportName}</h1>
            <div class="date">${niceDate}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th rowspan="2" style="text-align:left; padding-left:24px;">ASSET</th>
                    <th rowspan="2">LEVEL</th>
                    <th colspan="2" class="gh">1W</th>
                    <th colspan="2" class="gh">1M</th>
                    <th colspan="2" class="gh">3M</th>
                </tr>
                <tr>
                    <th class="pg-start">CHANGE</th>
                    <th>TREND</th>
                    <th class="pg-start">CHANGE</th>
                    <th>TREND</th>
                    <th class="pg-start">CHANGE</th>
                    <th>TREND</th>
                </tr>
            </thead>
            <tbody>
${rows}
            </tbody>
        </table>
    </div>
</body>
</html>`;
}
