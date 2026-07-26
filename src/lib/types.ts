/**
 * Core types for the search canvas.
 * Keep these simple — everything else plugs into them.
 */

export type WorkspaceType =
  | "company"
  | "comparison"
  | "spreadsheet"
  | "timeline"
  | "knowledge"
  | "chart";

/**
 * A single table value plus where it came from.
 * `url` is what makes the table traceable instead of something we appear to invent.
 */
export type Cell = {
  value: string | number;
  /** the page this specific fact was read from */
  url?: string;
  /** display domain, e.g. "ycombinator.com" */
  source?: string;
};

export type Row = {
  id: string;
  /** the entity's own site — turns the first column into a link */
  url?: string;
  favicon?: string;
  cells: Record<string, Cell>;
  /** every page that contributed a value to this row */
  sources?: string[];
};

export type Column = {
  key: string;
  label: string;
  sortType?: "text" | "number" | "date";
  /** extra instruction for the extractor; the label alone is often too terse */
  hint?: string;
  /**
   * Derived from the search itself rather than read off a page, so it is never
   * sent to the extractor. These are the columns that show why a row ranks
   * where it does.
   */
  computed?: boolean;
};

/** One clickable section on a company/knowledge overview */
export type WorkspaceCard = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  badge?: string;
  meta?: string;
};

export type CompanyWorkspaceData = {
  type: "company";
  title: string;
  subtitle: string;
  website?: string;
  cards: WorkspaceCard[];
  news: { id: string; title: string; date: string; source: string; url?: string }[];
  pricing?: { plan: string; price: string; note?: string }[];
  funding?: { round: string; amount: string; date: string }[];
  competitors?: string[];
  suggestions?: string[];
};

/**
 * Both the comparison and spreadsheet layouts share this shape.
 * They differ only in which toolbar affordances they show.
 */
export type TableWorkspaceData = {
  type: "comparison" | "spreadsheet";
  title: string;
  subtitle: string;
  columns: Column[];
  rows: Row[];
  /** extra columns the user can add as chips, which re-runs extraction */
  suggestions?: string[];
  /** total candidates found before the display cap */
  found?: number;
};

export type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  source: string;
  url?: string;
};

export type TimelineWorkspaceData = {
  type: "timeline";
  title: string;
  subtitle: string;
  events: TimelineEvent[];
  suggestions?: string[];
};

export type KnowledgeGroup = {
  id: string;
  category: string;
  cards: WorkspaceCard[];
};

export type KnowledgeWorkspaceData = {
  type: "knowledge";
  title: string;
  subtitle: string;
  groups: KnowledgeGroup[];
  suggestions?: string[];
};

/**
 * One plotted point. `value` is what we draw, `display` is what the page
 * actually said, and `url` is where we read it — so every dot on the chart
 * stays clickable back to its own source rather than the chart as a whole.
 */
export type ChartPoint = {
  id: string;
  /** x-axis label or slice name, e.g. "Q3 2025" or "Enterprise" */
  label: string;
  value: number;
  /** the source's own wording, e.g. "about $500M ARR" */
  display: string;
  url?: string;
  /** display domain, e.g. "reuters.com" */
  source?: string;
  favicon?: string;
  note?: string;
};

export type ChartKind = "line" | "bar" | "pie";

export type ChartWorkspaceData = {
  type: "chart";
  title: string;
  subtitle: string;
  /** which shape the query asked for; the user can switch it in the toolbar */
  chartKind: ChartKind;
  /** what the numbers measure, e.g. "Revenue" */
  valueLabel: string;
  /** "$", "%", or "" — drives axis and tooltip formatting */
  unit: string;
  points: ChartPoint[];
  /** every page that contributed a point */
  sources?: string[];
  suggestions?: string[];
  /** rows kept aside so the chart can fall back to a table view */
  table?: { columns: Column[]; rows: Row[] };
};

export type WorkspaceData =
  | CompanyWorkspaceData
  | TableWorkspaceData
  | TimelineWorkspaceData
  | KnowledgeWorkspaceData
  | ChartWorkspaceData;

/** Full canvas payload for a query */
export type CanvasResult = {
  query: string;
  workspace: WorkspaceData;
  loadingSteps: string[];
};
