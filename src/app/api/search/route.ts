import { encodeEvent, type SearchEvent } from "@/lib/search/events";
import { exaSearch } from "@/lib/search/exa";
import { domainOf, mergeResults } from "@/lib/search/discover";
import { buildExtractionSchema, routeQuery, templateFor, type EntityKind } from "@/lib/search/schema";
import { toChart } from "@/lib/search/chart";
import type { Column, Row, TimelineEvent, WorkspaceData } from "@/lib/types";

export const maxDuration = 60;

const PAGES_TO_READ = 10;
const ROW_BATCH = 8;

type Body = {
  query?: string;
  /** column keys the user added via chips */
  extraColumns?: string[];
  /** layout override from the switcher */
  forceKind?: EntityKind;
};

export async function POST(request: Request) {
  const { query, extraColumns = [], forceKind } = (await request
    .json()
    .catch(() => ({}))) as Body;

  if (!query?.trim()) {
    return Response.json({ error: "Missing query" }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SearchEvent) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          // client went away
        }
      };

      try {
        await runSearch(query.trim(), extraColumns, forceKind, send);
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Search failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}

async function runSearch(
  query: string,
  extraColumns: string[],
  forceKind: EntityKind | undefined,
  send: (event: SearchEvent) => void,
) {
  const template = forceKind ? templateFor(forceKind) : routeQuery(query);

  // Columns the user added — either a known optional, or something they typed.
  const known = new Map(template.optional.map((col) => [col.key, col]));
  const chosen: Column[] = [];
  for (const key of extraColumns) {
    if (template.columns.some((col) => col.key === key)) continue;
    if (chosen.some((col) => col.key === key)) continue;
    chosen.push(known.get(key) ?? customColumn(key));
  }
  const columns: Column[] = [...template.columns, ...chosen];
  const suggestions = template.optional
    .filter((col) => !extraColumns.includes(col.key))
    .map((col) => col.key);

  // Six phases so the client can show honest progress.
  const TOTAL = 6;
  let phase = 0;
  const step = (label: string) => {
    phase += 1;
    send({ type: "step", label, index: phase, total: TOTAL });
  };

  const subtitle = template.preferDomains
    ? "Structured from community threads, GitHub issues, and forums"
    : `Structured from ${PAGES_TO_READ} sources across the web`;

  step(template.steps[0]);

  send({
    type: "schema",
    workspaceType: template.workspaceType,
    title: toTitle(query),
    subtitle,
    columns,
    suggestions,
  });

  step(template.steps[1]);

  const schema = buildExtractionSchema(columns);
  const summaryQuery =
    `Every ${template.itemNoun} mentioned on this page that is relevant to "${query}". ` +
    `Return one entry per item. Include the official website URL when stated. ` +
    `Leave a field empty rather than guessing.`;

  // Complaints and reviews live on Reddit and GitHub rather than vendor pages,
  // so ask there first and only widen if the haul is thin.
  let results = template.preferDomains
    ? await exaSearch({
        query: `${query} ${template.queryHint}`,
        numResults: PAGES_TO_READ,
        schema,
        summaryQuery,
        includeDomains: template.preferDomains,
      })
    : [];

  const preferredCount = results.length;

  if (results.length < 4) {
    step("Widening the search...");
    const open = await exaSearch({
      query: `${query} ${template.queryHint}`,
      numResults: PAGES_TO_READ,
      schema,
      summaryQuery,
    });

    // Keep the community sources on top; they carry the honest complaints.
    const seen = new Set(results.map((r) => r.url));
    results = [...results, ...open.filter((r) => !seen.has(r.url))];
  }

  if (results.length === 0) {
    send({ type: "error", message: `No sources found for "${query}".` });
    return;
  }

  const domains = [...new Set(results.map((r) => domainOf(r.url)).filter(Boolean))];
  step(`Reading ${domains.slice(0, 3).join(", ")}...`);
  step(template.steps[3]);

  const { rows } = mergeResults(results, columns);

  // The router guesses columns before seeing any data, so it sometimes asks for
  // a field nothing has — "equity" for university degrees, say. Rather than
  // show a column of dashes, drop what no source could fill.
  const usedColumns = columns.filter((col, i) => {
    if (i === 0) return true;

    const values = rows
      .map((row) => row.cells[col.key]?.value)
      .filter((value) => value !== undefined);

    if (values.length === 0) return false;

    // A ranking column has to actually rank something. Complaints are free
    // text, so two pages describing the same bug rarely merge into one row,
    // which leaves "Sources: 1" on every row — a column that explains nothing.
    if (col.computed && new Set(values).size < 2) return false;

    return true;
  });

  // Now that the data exists we can say what the order really means, instead
  // of promising a ranking the sources may not have supported.
  const ranked = usedColumns.some((col) => col.key === "mentions")
    ? "ranked by how many sources reported each one"
    : usedColumns.some((col) => col.key === "lastSeen")
      ? "newest first"
      : "in the order sources listed them";

  const finalSubtitle =
    template.kind === "issue"
      ? `From community threads and issue trackers, ${ranked}`
      : subtitle;

  if (usedColumns.length !== columns.length || finalSubtitle !== subtitle) {
    send({
      type: "schema",
      workspaceType: template.workspaceType,
      title: toTitle(query),
      subtitle: finalSubtitle,
      columns: usedColumns,
      suggestions,
    });
  }

  if (rows.length === 0) {
    send({
      type: "error",
      message: `Found ${results.length} pages but could not extract structured rows. Try rephrasing.`,
    });
    return;
  }

  step(template.steps[4]);

  // Timeline and knowledge layouts consume the same rows in a different shape.
  if (template.workspaceType === "timeline") {
    send({ type: "workspace", workspace: toTimeline(query, rows, suggestions) });
    send({ type: "done", found: rows.length });
    return;
  }

  if (template.workspaceType === "knowledge") {
    send({ type: "workspace", workspace: toKnowledge(query, rows, suggestions) });
    send({ type: "done", found: rows.length });
    return;
  }

  // A chart needs at least a couple of parseable figures to say anything.
  // When the sources only gave prose, fall back to the table rather than
  // drawing a line through one point.
  if (template.workspaceType === "chart") {
    const chart = toChart(query, rows, columns, suggestions, toTitle(query));

    if (chart.points.length >= 2) {
      send({ type: "workspace", workspace: chart });
      send({ type: "done", found: chart.points.length });
      return;
    }

    send({
      type: "workspace",
      workspace: {
        type: "spreadsheet",
        title: toTitle(query),
        subtitle: "Not enough comparable figures to chart — showing what was found",
        columns,
        rows,
        suggestions,
        found: rows.length,
      },
    });
    send({ type: "done", found: rows.length });
    return;
  }

  for (let i = 0; i < rows.length; i += ROW_BATCH) {
    send({
      type: "rows",
      rows: rows.slice(i, i + ROW_BATCH),
      found: rows.length,
    });
  }

  send({ type: "done", found: rows.length });
}

function toTitle(query: string): string {
  return query.charAt(0).toUpperCase() + query.slice(1);
}

/** Turns a typed key like "funding_amount" into a real Column the extractor can fill. */
function customColumn(key: string): Column {
  const label = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    key,
    label,
    sortType: "text",
    hint: `${label} for this item, if stated on the page`,
  };
}

function cellText(row: Row, key: string): string {
  const cell = row.cells[key];
  return cell ? String(cell.value) : "";
}

/**
 * Sources phrase dates every way imaginable ("2020", "Jul 24, 2026", "Q3 2025").
 * Parse what we can, fall back to a bare year, and sink anything unreadable.
 */
function dateRank(raw: string): number {
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return parsed;

  const year = raw.match(/\b(19|20)\d{2}\b/);
  if (year) return Date.parse(`${year[0]}-01-01`);

  return Number.NEGATIVE_INFINITY;
}

function toTimeline(
  query: string,
  rows: Row[],
  suggestions: string[],
): WorkspaceData {
  const events: TimelineEvent[] = rows
    .map((row, index) => ({
      id: row.id || String(index),
      date: cellText(row, "date") || "Undated",
      title: cellText(row, "title") || cellText(row, "name"),
      description: cellText(row, "description"),
      source: row.cells.title?.source ?? domainOf(row.url ?? ""),
      url: row.url,
    }))
    .filter((event) => event.title)
    .sort((a, b) => dateRank(b.date) - dateRank(a.date));

  return {
    type: "timeline",
    title: toTitle(query),
    subtitle: `${events.length} events, newest first`,
    events,
    suggestions,
  };
}

function toKnowledge(
  query: string,
  rows: Row[],
  suggestions: string[],
): WorkspaceData {
  const groups = new Map<string, { id: string; category: string; cards: WorkspaceCardLike[] }>();

  rows.forEach((row, index) => {
    const category = cellText(row, "category") || "Overview";
    const key = category.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, { id: key, category, cards: [] });
    }

    groups.get(key)?.cards.push({
      id: row.id || String(index),
      title: cellText(row, "title") || cellText(row, "name"),
      subtitle: cellText(row, "description"),
      href: row.url,
      badge: row.cells.title?.source ?? domainOf(row.url ?? ""),
    });
  });

  return {
    type: "knowledge",
    title: toTitle(query),
    subtitle: `${rows.length} resources grouped by category`,
    groups: [...groups.values()].filter((group) =>
      group.cards.some((card) => card.title),
    ),
    suggestions,
  };
}

type WorkspaceCardLike = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  badge?: string;
};
