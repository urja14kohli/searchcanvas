import type { ChartKind, ChartPoint, ChartWorkspaceData, Column, Row } from "@/lib/types";
import { domainOf } from "@/lib/search/discover";

/**
 * Turning scraped prose into a chart.
 *
 * Sources never agree on how to write a number: "$3.4 billion", "3.4B",
 * "about $500M ARR", "12.5%". Everything here exists to get those onto one
 * axis while keeping the original wording and its URL attached, so a dot on
 * the chart can still be traced back to the page that claimed it.
 */

const MAGNITUDES: { pattern: RegExp; factor: number }[] = [
  { pattern: /^\s*(trillion|tn|t)\b/i, factor: 1e12 },
  { pattern: /^\s*(billion|bn|b)\b/i, factor: 1e9 },
  { pattern: /^\s*(million|mm|mn|m)\b/i, factor: 1e6 },
  { pattern: /^\s*(thousand|k)\b/i, factor: 1e3 },
];

export type ParsedValue = { value: number; unit: string };

/**
 * Pulls the first number out of a phrase along with its scale and unit.
 * Returns null when there is nothing plottable, which is the common case for
 * a field the extractor filled with commentary instead of a figure.
 */
export function parseValue(raw: string): ParsedValue | null {
  const text = raw.trim();
  if (!text) return null;

  const match = text.match(/(-|−|\()?\s*([$€£₹]|usd\s*)?\s*(\d[\d,]*\.?\d*)/i);
  if (!match) return null;

  const digits = Number(match[3].replace(/,/g, ""));
  if (!Number.isFinite(digits)) return null;

  const rest = text.slice((match.index ?? 0) + match[0].length);

  let factor = 1;
  for (const { pattern, factor: f } of MAGNITUDES) {
    if (pattern.test(rest)) {
      factor = f;
      break;
    }
  }

  const negative = Boolean(match[1]);
  const percent = /^\s*%|^\s*percent/i.test(rest);
  const currency = Boolean(match[2]) || /\b(usd|dollars?)\b/i.test(text);

  return {
    value: (negative ? -digits : digits) * factor,
    unit: percent ? "%" : currency ? "$" : "",
  };
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/**
 * Orders period labels along an axis. Returns null for anything that is a
 * category rather than a time ("Enterprise", "North America"), which is the
 * signal to leave the points in the order the sources ranked them.
 */
export function periodRank(label: string): number | null {
  const text = label.toLowerCase();

  // No \b on the left: "FY2025" and "fy26" are both common in filings.
  const year = text.match(/(?<!\d)(19|20)\d{2}(?!\d)/);
  const shortYear = text.match(/\bfy\s?'?(\d{2})(?!\d)/);

  const fullYear = year
    ? Number(year[0])
    : shortYear
      ? 2000 + Number(shortYear[1])
      : null;

  if (fullYear === null) return null;

  const base = fullYear * 12;

  const quarter = text.match(/\bq([1-4])\b/) ?? text.match(/\b([1-4])q\b/);
  if (quarter) return base + (Number(quarter[1]) - 1) * 3;

  const half = text.match(/\bh([12])\b/);
  if (half) return base + (Number(half[1]) - 1) * 6;

  const month = MONTHS.findIndex((m) => text.includes(m));
  if (month >= 0) return base + month;

  // A bare year covers the whole year, so it sits mid-year rather than in
  // January, where it would jump ahead of that year's dated figures.
  return base + 6;
}

/** Reads the requested shape out of the query, defaulting to a line. */
export function chartKindFor(query: string): ChartKind {
  const q = query.toLowerCase();

  if (/\b(pie|donut|doughnut|breakdown|distribution|split|share of|proportion)\b/.test(q)) {
    return "pie";
  }
  if (/\b(bar|column|histogram|ranked|ranking)\b/.test(q)) {
    return "bar";
  }
  return "line";
}

/**
 * The metric families we can tell apart. Pages about a company's revenue also
 * quote its valuation and its funding, and the extractor cheerfully returns
 * all three as "figures", so knowing which family was asked for is what keeps
 * a $60B valuation out of a $4B revenue chart.
 */
const FAMILIES: { key: string; label: string; asked: RegExp; labelled: RegExp }[] = [
  {
    key: "revenue",
    label: "Revenue",
    asked: /\b(revenue|arr|mrr|sales|run.?rate)\b/,
    labelled: /\b(revenue|arr|mrr|sales|run.?rate|booking)/,
  },
  {
    key: "valuation",
    label: "Valuation",
    asked: /\b(valuation|valued|market cap|worth)\b/,
    labelled: /\b(valuation|valued|market cap|worth)/,
  },
  {
    key: "funding",
    label: "Funding",
    asked: /\b(funding|raised|fundraise|round)\b/,
    labelled: /\b(funding|raised|round|series [a-f])/,
  },
  {
    key: "users",
    label: "Users",
    asked: /\b(users|customers|subscribers|downloads|installs)\b/,
    labelled: /\b(users|customers|subscribers|downloads|installs)/,
  },
  {
    key: "headcount",
    label: "Headcount",
    asked: /\b(headcount|employees|staff|team size)\b/,
    labelled: /\b(headcount|employees|staff)/,
  },
  {
    key: "share",
    label: "Market share",
    asked: /\bmarket share\b/,
    labelled: /\bmarket share/,
  },
  {
    key: "price",
    label: "Share price",
    asked: /\b(stock|share price)\b/,
    labelled: /\b(stock|share price)/,
  },
];

/** The metric the query is about, if it names one recognisably. */
function familyFor(query: string) {
  const q = query.toLowerCase();
  return FAMILIES.find((family) => family.asked.test(q)) ?? null;
}

function cellText(row: Row, key: string): string {
  const cell = row.cells[key];
  return cell ? String(cell.value).trim() : "";
}

/**
 * Builds the chart payload from merged rows.
 *
 * Rows whose value field holds no number are dropped rather than plotted as
 * zero — an invented point is worse than a missing one. The full row set is
 * carried along in `table` so the workspace can still show the numbers.
 */
export function toChart(
  query: string,
  rows: Row[],
  columns: Column[],
  suggestions: string[],
  title: string,
): ChartWorkspaceData {
  const kind = chartKindFor(query);
  const family = familyFor(query);
  const units = new Map<string, number>();

  const points: ChartPoint[] = [];

  rows.forEach((row, index) => {
    const label = cellText(row, "period");
    const display = cellText(row, "value");
    if (!label || !display) return;

    // A period that names a metric other than the one asked about is a figure
    // for a different question — "Valuation (June 2026)" in a revenue chart.
    if (family) {
      const text = `${label} ${display}`.toLowerCase();
      const foreign = FAMILIES.some(
        (other) =>
          other.key !== family.key &&
          other.labelled.test(text) &&
          !family.labelled.test(text),
      );
      if (foreign) return;
    }

    const parsed = parseValue(display);
    if (!parsed) return;

    units.set(parsed.unit, (units.get(parsed.unit) ?? 0) + 1);

    // The value cell remembers which page supplied the figure; prefer that
    // over the row's own link, which may point at the entity's homepage.
    const cell = row.cells.value;

    points.push({
      id: row.id || String(index),
      label,
      value: parsed.value,
      display,
      url: cell?.url ?? row.url,
      source: cell?.source ?? domainOf(row.url ?? ""),
      favicon: row.favicon,
      note: cellText(row, "note") || undefined,
    });
  });

  // Whichever unit most sources used wins the axis.
  const unit =
    [...units.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  // Mixed units on one axis would be a lie, so keep only the majority unit.
  const sameUnit =
    units.size > 1
      ? points.filter((p) => (parseValue(p.display)?.unit ?? "") === unit)
      : points;

  /**
   * A literal zero next to real figures is nearly always an artifact — an
   * empty field in a listing, or a stray "0" the extractor grabbed. Keeping
   * it costs a fake point at the baseline and blocks a log axis.
   */
  const consistent = sameUnit.some((p) => p.value > 0)
    ? sameUnit.filter((p) => p.value !== 0)
    : sameUnit;

  const ranked = consistent.map((point) => ({
    point,
    rank: periodRank(point.label),
  }));

  /**
   * A chart is time-shaped as soon as most of its labels are periods. It is
   * never all of them — extractors happily return "last week" or "annualized
   * revenue" as a period — and those cannot be placed on a dated axis, so
   * they are dropped rather than smuggled in at whatever index they arrived.
   */
  const timeShaped =
    kind !== "pie" &&
    ranked.filter((r) => r.rank !== null).length >= ranked.length * 0.6;

  let ordered = ranked;

  if (timeShaped) {
    ordered = ranked
      .filter((r) => r.rank !== null)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  } else if (kind === "pie") {
    ordered = [...ranked].sort((a, b) => b.point.value - a.point.value);
  }

  /**
   * One figure per period, first source to report it wins. Ranking by month
   * bucket is what collapses "Nov 2025", "November 2025", and "ARR as of Nov
   * 2025" into a single point instead of three dots stacked on each other.
   */
  const seen = new Set<string>();
  const deduped = ordered
    .filter(({ point, rank }) => {
      const key =
        rank !== null ? `t${rank}` : point.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => r.point);

  const sources = [...new Set(deduped.map((p) => p.source).filter(Boolean))] as string[];

  return {
    type: "chart",
    title,
    chartKind: kind,
    valueLabel: family?.label ?? "Value",
    unit,
    subtitle: deduped.length
      ? `${deduped.length} data points from ${sources.length} source${sources.length === 1 ? "" : "s"} — click any point to open its source`
      : "No plottable figures found",
    points: deduped,
    sources,
    suggestions,
    table: { columns, rows },
  };
}
