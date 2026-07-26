import type { Cell, Column, Row } from "@/lib/types";
import { parseItems, type ExaResult } from "@/lib/search/exa";

/** "https://www.ycombinator.com/apply" -> "ycombinator.com" */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconFor(url: string): string | undefined {
  const domain = domainOf(url);
  if (!domain) return undefined;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/** Collapses casing, punctuation, and common suffixes so duplicates match. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|llc|ltd|the|program|programme|accelerator)\b/g, " ")
    .trim();
}

const EMPTY_VALUE =
  /^(n\/?a|none|null|unknown|not specified|not stated|not mentioned|not available|varies|tbd|-{1,}|—)$/i;

function isMeaningful(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !EMPTY_VALUE.test(trimmed);
}

/**
 * Rejects the page's own headline leaking in as if it were an entity.
 * Listicles love titles like "9 Best AI Accelerators for Startups in 2026".
 */
function looksLikeArticleTitle(name: string): boolean {
  if (name.length > 64) return true;
  return /^\s*\d*\s*(best|top|the best|top rated)\b/i.test(name) ||
    /\b(in|for)\s+20\d{2}\s*$/i.test(name);
}

type Candidate = {
  key: string;
  displayName: string;
  cells: Record<string, Cell>;
  website?: string;
  sources: Set<string>;
  /** how many distinct pages listed this entity */
  mentions: number;
  /** newest publish date across contributing pages, epoch ms */
  newest: number;
  /** the page that carried that date, so "Last seen" can link to it */
  newestUrl?: string;
};

/** "Jul 24, 2026" — short, unambiguous, and parseable when the column is sorted. */
function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Turns raw Exa results into merged, deduplicated rows.
 *
 * Two things happen here that a single-page scrape cannot do:
 * gaps get filled across sources (one page knows the equity, another the
 * deadline), and agreement across pages becomes a ranking signal.
 */
export function mergeResults(
  results: ExaResult[],
  columns: Column[],
): { rows: Row[]; pagesRead: number } {
  const primaryKey = columns[0]?.key ?? "name";
  const candidates = new Map<string, Candidate>();
  let pagesRead = 0;

  for (const result of results) {
    const items = parseItems(result);
    if (items.length === 0) continue;
    pagesRead += 1;

    const sourceUrl = result.url;
    const sourceDomain = domainOf(sourceUrl);
    const publishedAt = result.publishedDate
      ? Date.parse(result.publishedDate)
      : Number.NaN;

    for (const item of items) {
      const rawName = item[primaryKey];
      if (!isMeaningful(rawName)) continue;

      const displayName = rawName.trim();
      if (looksLikeArticleTitle(displayName)) continue;

      const key = normalizeName(displayName);
      if (!key) continue;

      let candidate = candidates.get(key);
      if (!candidate) {
        candidate = {
          key,
          displayName,
          cells: {},
          sources: new Set(),
          mentions: 0,
          newest: Number.NEGATIVE_INFINITY,
        };
        candidates.set(key, candidate);
      }

      candidate.mentions += 1;
      candidate.sources.add(sourceUrl);

      if (Number.isFinite(publishedAt) && publishedAt > candidate.newest) {
        candidate.newest = publishedAt;
        candidate.newestUrl = sourceUrl;
      }

      // Prefer the shortest sensible name across sources; listicles pad them.
      if (displayName.length < candidate.displayName.length) {
        candidate.displayName = displayName;
      }

      if (!candidate.website && isMeaningful(item.website)) {
        candidate.website = item.website.trim();
      }

      // First source to supply a real value for a field wins, and that cell
      // remembers which page it came from.
      for (const col of columns) {
        if (col.key === primaryKey) continue;
        const value = item[col.key];
        if (!isMeaningful(value)) continue;
        if (candidate.cells[col.key]) continue;

        candidate.cells[col.key] = {
          value: value.trim(),
          url: sourceUrl,
          source: sourceDomain,
        };
      }
    }
  }

  const wantsMentions = columns.some((col) => col.key === "mentions");
  const wantsLastSeen = columns.some((col) => col.key === "lastSeen");

  const rows = [...candidates.values()]
    .sort((a, b) => {
      // Agreement across sources first, then recency, then completeness.
      // When these columns are shown, this order is visible in the table
      // rather than something the reader has to take on trust.
      if (b.mentions !== a.mentions) return b.mentions - a.mentions;
      if (b.newest !== a.newest) return b.newest - a.newest;
      return Object.keys(b.cells).length - Object.keys(a.cells).length;
    })
    .map((candidate, index) => {
      const website = candidate.website;
      const firstSource = [...candidate.sources][0];

      const cells: Record<string, Cell> = {
        [primaryKey]: {
          value: candidate.displayName,
          url: website ?? firstSource,
          source: website ? domainOf(website) : domainOf(firstSource ?? ""),
        },
        ...candidate.cells,
      };

      if (wantsMentions) {
        cells.mentions = { value: candidate.mentions };
      }

      if (wantsLastSeen && Number.isFinite(candidate.newest)) {
        cells.lastSeen = {
          value: formatDate(candidate.newest),
          url: candidate.newestUrl,
          source: domainOf(candidate.newestUrl ?? ""),
        };
      }

      const row: Row = {
        id: `${index}-${candidate.key}`,
        url: website ?? firstSource,
        favicon: website ? faviconFor(website) : faviconFor(firstSource ?? ""),
        cells,
        sources: [...candidate.sources],
      };

      return row;
    });

  return { rows, pagesRead };
}
