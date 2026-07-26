import type { Column, WorkspaceData } from "@/lib/types";

/**
 * Deterministic query router.
 *
 * An LLM would guess columns once, silently, and you would live with it.
 * This guesses instantly and for free, then lets the user correct it in one
 * click via `optional` columns and the layout switcher. Misclassification is
 * cheap, so being dumb here is an acceptable trade.
 */
export type EntityKind =
  | "program"
  | "company"
  | "issue"
  | "person"
  | "event"
  | "resource"
  | "topic"
  | "metric";

export type Template = {
  kind: EntityKind;
  workspaceType: WorkspaceData["type"];
  /** plural noun used when asking Exa what to pull off each page */
  itemNoun: string;
  columns: Column[];
  /** offered as chips; clicking one adds it and re-extracts */
  optional: Column[];
  /** appended to the user's words to bias Exa toward list-shaped pages */
  queryHint: string;
  /**
   * Restrict the first pass to these domains. Complaints live on Reddit and
   * GitHub, not on vendor marketing pages, so it is worth asking there first.
   * The route falls back to an open search if this returns too little.
   */
  preferDomains?: string[];
  steps: string[];
};

const TEMPLATES: Record<EntityKind, Template> = {
  program: {
    kind: "program",
    workspaceType: "comparison",
    itemNoun: "accelerator or program",
    columns: [
      { key: "name", label: "Name", sortType: "text" },
      { key: "equity", label: "Equity", sortType: "text" },
      { key: "funding", label: "Funding", sortType: "text" },
      { key: "location", label: "Location", sortType: "text" },
      { key: "focus", label: "Focus", sortType: "text" },
    ],
    optional: [
      { key: "deadline", label: "Deadline", sortType: "date" },
      { key: "duration", label: "Duration", sortType: "text" },
      { key: "batchSize", label: "Batch size", sortType: "number" },
      { key: "remote", label: "Remote policy", sortType: "text" },
      { key: "notableAlumni", label: "Notable alumni", sortType: "text" },
    ],
    queryHint: "list of programs with details",
    steps: [
      "Searching accelerator directories...",
      "Reading program pages...",
      "Pulling equity and funding terms...",
      "Merging duplicate listings...",
      "Building workspace...",
    ],
  },

  company: {
    kind: "company",
    workspaceType: "comparison",
    itemNoun: "company or product",
    columns: [
      { key: "name", label: "Name", sortType: "text" },
      { key: "description", label: "What it does", sortType: "text" },
      { key: "funding", label: "Funding", sortType: "text" },
      { key: "stage", label: "Stage", sortType: "text" },
      { key: "location", label: "Location", sortType: "text" },
    ],
    optional: [
      { key: "founded", label: "Founded", sortType: "date" },
      { key: "founders", label: "Founders", sortType: "text" },
      { key: "employees", label: "Employees", sortType: "number" },
      { key: "pricing", label: "Pricing", sortType: "text" },
      { key: "investors", label: "Investors", sortType: "text" },
    ],
    queryHint: "list of companies with details",
    steps: [
      "Searching the web...",
      "Finding official sources...",
      "Reading company pages...",
      "Collecting structured information...",
      "Building workspace...",
    ],
  },

  issue: {
    kind: "issue",
    workspaceType: "spreadsheet",
    itemNoun: "distinct complaint, issue, or criticism",
    columns: [
      { key: "issue", label: "Issue", sortType: "text" },
      { key: "detail", label: "Detail", sortType: "text" },
      /**
       * The ranking, made legible. Severity is deliberately not the sort key:
       * it is the extractor's judgement and comes back as "high", "High",
       * "Bug", "Critical" from different pages. Source count and dates are
       * things the reader can check.
       */
      { key: "mentions", label: "Sources", sortType: "number", computed: true },
      { key: "lastSeen", label: "Last seen", sortType: "date", computed: true },
      { key: "severity", label: "Severity", sortType: "text" },
      { key: "platform", label: "Reported on", sortType: "text" },
    ],
    optional: [
      { key: "frequency", label: "How often", sortType: "text" },
      { key: "version", label: "Version", sortType: "text" },
      { key: "workaround", label: "Workaround", sortType: "text" },
      { key: "status", label: "Status", sortType: "text" },
    ],
    queryHint: "complaints problems issues discussion thread",
    /**
     * Community sources only. Reddit is deliberately absent, not forgotten:
     * Exa has no Reddit coverage and Firecrawl refuses the domain outright,
     * so listing it would only produce a step label that never finds anything.
     */
    preferDomains: [
      "news.ycombinator.com",
      "github.com",
      "stackoverflow.com",
      "lobste.rs",
      "discourse.group",
    ],
    steps: [
      "Searching community discussions...",
      "Searching GitHub issues...",
      "Reading threads...",
      "Grouping similar complaints...",
      "Building workspace...",
    ],
  },

  person: {
    kind: "person",
    workspaceType: "comparison",
    itemNoun: "person",
    columns: [
      { key: "name", label: "Name", sortType: "text" },
      { key: "role", label: "Role", sortType: "text" },
      { key: "organization", label: "Organization", sortType: "text" },
      { key: "focus", label: "Focus", sortType: "text" },
    ],
    optional: [
      { key: "education", label: "Education", sortType: "text" },
      { key: "notableWork", label: "Notable work", sortType: "text" },
      { key: "location", label: "Location", sortType: "text" },
    ],
    queryHint: "people list",
    steps: [
      "Searching the web...",
      "Finding profiles...",
      "Reading bios...",
      "Collecting structured information...",
      "Building workspace...",
    ],
  },

  event: {
    kind: "event",
    workspaceType: "timeline",
    itemNoun: "dated event or announcement",
    columns: [
      { key: "date", label: "Date", sortType: "date" },
      { key: "title", label: "Event", sortType: "text" },
      { key: "description", label: "Detail", sortType: "text" },
    ],
    optional: [
      { key: "impact", label: "Impact", sortType: "text" },
      { key: "amount", label: "Amount", sortType: "text" },
    ],
    queryHint: "timeline history news announcements by date",
    steps: [
      "Searching recent coverage...",
      "Finding primary sources...",
      "Extracting dates...",
      "Ordering chronologically...",
      "Building workspace...",
    ],
  },

  resource: {
    kind: "resource",
    workspaceType: "knowledge",
    itemNoun: "resource, guide, or reference",
    columns: [
      { key: "title", label: "Title", sortType: "text" },
      { key: "category", label: "Category", sortType: "text" },
      { key: "description", label: "Description", sortType: "text" },
    ],
    optional: [
      { key: "level", label: "Level", sortType: "text" },
      { key: "format", label: "Format", sortType: "text" },
    ],
    queryHint: "guide documentation resources overview",
    steps: [
      "Searching the web...",
      "Finding official docs...",
      "Looking at discussions...",
      "Grouping by topic...",
      "Building workspace...",
    ],
  },

  /**
   * Numbers rather than entities. The primary column is the period so that
   * merging across sources lines figures up by quarter or year, and the
   * value column carries its own source URL — that is what makes each dot on
   * the chart clickable back to the page it came from.
   */
  metric: {
    kind: "metric",
    workspaceType: "chart",
    itemNoun: "reported figure with the period it belongs to",
    columns: [
      {
        key: "period",
        label: "Period",
        sortType: "text",
        hint:
          "The period or category this figure belongs to, exactly as written " +
          'on the page — e.g. "Q3 2025", "2024", "FY2025", "June 2026", or a ' +
          'segment name like "Enterprise". One entry per period.',
      },
      {
        key: "value",
        label: "Value",
        sortType: "number",
        hint:
          "The figure itself, with its unit as written — e.g. \"$500M ARR\", " +
          '"$3.4 billion", "12.5%", "1.2M users". Numbers only, no commentary.',
      },
      {
        key: "note",
        label: "Context",
        sortType: "text",
        hint: "One short phrase of context for this figure, if the page gives one",
      },
    ],
    optional: [
      { key: "growth", label: "Growth", sortType: "text" },
      { key: "metric", label: "Metric", sortType: "text" },
    ],
    queryHint: "figures by year and quarter reported numbers",
    steps: [
      "Searching for reported figures...",
      "Finding primary sources...",
      "Reading financial coverage...",
      "Matching figures to periods...",
      "Plotting the chart...",
    ],
  },

  topic: {
    kind: "topic",
    workspaceType: "knowledge",
    itemNoun: "key aspect, concept, or resource",
    columns: [
      { key: "title", label: "Title", sortType: "text" },
      { key: "category", label: "Category", sortType: "text" },
      { key: "description", label: "Description", sortType: "text" },
    ],
    optional: [
      { key: "example", label: "Example", sortType: "text" },
      { key: "level", label: "Level", sortType: "text" },
    ],
    queryHint: "overview explanation key concepts",
    steps: [
      "Searching the web...",
      "Finding official sources...",
      "Looking at discussions...",
      "Collecting structured information...",
      "Building workspace...",
    ],
  },
};

type Rule = { kind: EntityKind; patterns: RegExp[]; weight: number };

const RULES: Rule[] = [
  /**
   * First and heaviest. "Chart the revenue growth of Cursor" also trips the
   * company rule, and a table of look-alike companies is not what was asked
   * for — naming a shape wins over naming a subject.
   */
  {
    kind: "metric",
    weight: 4,
    patterns: [
      /\b(chart|charts|graph|graphs|plot|plotted|pie|bar chart|line chart|visuali[sz]e|visuali[sz]ation)\b/,
      /\b(revenue|arr|mrr|sales|valuation|market cap|market share|headcount|users|downloads|adoption)\b.*\b(growth|trend|trends|trajectory|over time|by year|by quarter|by month|history|last \d+)\b/,
      /\b(growth|trend|trends|trajectory)\b.*\b(revenue|arr|mrr|sales|valuation|users|customers|employees)\b/,
      /\b(over time|by year|by quarter|by month|year over year|yoy|quarterly|annually|per year)\b/,
      /\b(breakdown|distribution|split|share of|percentage of|proportion of)\b/,
    ],
  },
  {
    kind: "issue",
    weight: 3,
    patterns: [
      /\b(complaint|complaints|complain)\b/,
      /\b(review|reviews)\b/,
      /\b(problem|problems|issue|issues|bug|bugs)\b/,
      /\b(criticism|downside|downsides|drawback|drawbacks)\b/,
      /\b(hate|sucks|bad about|wrong with)\b/,
    ],
  },
  {
    kind: "program",
    weight: 3,
    patterns: [
      /\b(accelerator|accelerators|incubator|incubators)\b/,
      /\b(fellowship|fellowships|grant|grants|bootcamp|bootcamps)\b/,
      /\b(program|programs|residency|cohort)\b/,
      /\b(scholarship|scholarships)\b/,
    ],
  },
  {
    kind: "event",
    weight: 3,
    patterns: [
      /\b(timeline|history of|chronology)\b/,
      /\b(stock|share price|earnings|ipo)\b/,
      /\b(latest news|recent news|news about|what happened)\b/,
      /\b(launch|launches|releases|announcements)\b/,
      /\b(funding rounds?)\b/,
    ],
  },
  {
    kind: "person",
    weight: 3,
    patterns: [
      /\b(professors?|founders?|researchers?|investors?)\b/,
      /\b(people|who is|who are|team behind)\b/,
      /\b(ceo|cto|executives?)\b/,
    ],
  },
  {
    kind: "company",
    weight: 2,
    patterns: [
      /\b(startups?|companies|company|products?|tools?|apps?)\b/,
      /\b(alternatives? to|competitors? (of|to)|vs\.?|versus)\b/,
      /\b(yc|y combinator|s\d{2}|w\d{2})\b/,
      /\b(saas|platforms?|vendors?)\b/,
    ],
  },
  {
    kind: "resource",
    weight: 2,
    patterns: [
      /\b(docs?|documentation|tutorials?|courses?|guides?)\b/,
      /\b(learn|learning|curriculum|syllabus)\b/,
      /\b(resources?|reading list|books?)\b/,
    ],
  },
];

/** Signals that the user wants many things rather than one thing. */
const LIST_SIGNALS =
  /\b(best|top|list|all|compare|comparison|vs\.?|versus|alternatives?|options?|examples?)\b|\d+\s|\bs\d{2}\b/;

export function routeQuery(rawQuery: string): Template {
  const q = rawQuery.trim().toLowerCase();

  const scores = new Map<EntityKind, number>();
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(q)) {
        scores.set(rule.kind, (scores.get(rule.kind) ?? 0) + rule.weight);
      }
    }
  }

  let best: EntityKind | null = null;
  let bestScore = 0;
  for (const [kind, score] of scores) {
    if (score > bestScore) {
      best = kind;
      bestScore = score;
    }
  }

  // Nothing matched. One named thing ("MCP", "Stanford MS&E") deserves an
  // overview of cards, not a table of look-alikes. Only reach for a table when
  // the wording asks for many things.
  if (!best) {
    best = LIST_SIGNALS.test(q) ? "company" : "topic";
  }

  return TEMPLATES[best];
}

export function templateFor(kind: EntityKind): Template {
  return TEMPLATES[kind];
}

/** Builds the JSON Schema handed to Exa for array extraction. */
export function buildExtractionSchema(columns: Column[]) {
  const properties: Record<string, { type: "string"; description: string }> = {};

  for (const col of columns) {
    // Computed columns are counted by us, not found on the page.
    if (col.computed) continue;

    properties[col.key] = {
      type: "string",
      description: col.hint ?? col.label,
    };
  }

  // Always ask for the entity's own site so the first column can link out.
  properties.website = {
    type: "string",
    description: "Official website URL of this item, if stated",
  };

  return {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        items: { type: "object" as const, properties },
      },
    },
  };
}
