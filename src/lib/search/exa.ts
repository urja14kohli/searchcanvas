const EXA_ENDPOINT = "https://api.exa.ai";

export type ExaResult = {
  id: string;
  url: string;
  title?: string;
  publishedDate?: string;
  author?: string;
  favicon?: string;
  image?: string;
  text?: string;
  /** JSON string when a summary schema was supplied */
  summary?: string;
};

type SearchArgs = {
  query: string;
  numResults?: number;
  /** JSON Schema; Exa returns `summary` as a JSON string matching it */
  schema?: object;
  /** natural-language instruction paired with the schema */
  summaryQuery?: string;
  /** restrict results to these hostnames */
  includeDomains?: string[];
  signal?: AbortSignal;
};

function apiKey(): string {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY is not set in .env.local");
  return key;
}

/**
 * One call does both jobs: finds pages and extracts structured items from each.
 * Asking for an array in the schema is what lets a single listicle yield
 * ten rows instead of one.
 */
export async function exaSearch({
  query,
  numResults = 10,
  schema,
  summaryQuery,
  includeDomains,
  signal,
}: SearchArgs): Promise<ExaResult[]> {
  const body: Record<string, unknown> = {
    query,
    numResults,
    type: "auto",
  };

  if (includeDomains?.length) {
    body.includeDomains = includeDomains;
  }

  if (schema) {
    body.contents = {
      summary: { query: summaryQuery ?? query, schema },
      livecrawl: "fallback",
    };
  } else {
    body.contents = { text: { maxCharacters: 2000 } };
  }

  const res = await fetch(`${EXA_ENDPOINT}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Exa search failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { results?: ExaResult[] };
  return json.results ?? [];
}

/** Parses the JSON string Exa puts in `summary` when a schema was used. */
export function parseItems(result: ExaResult): Record<string, string>[] {
  if (!result.summary) return [];

  try {
    const parsed = JSON.parse(result.summary) as {
      items?: Record<string, string>[];
    };
    if (Array.isArray(parsed.items)) return parsed.items;
    // A page describing a single entity comes back as a bare object.
    if (parsed && typeof parsed === "object") {
      return [parsed as Record<string, string>];
    }
    return [];
  } catch {
    return [];
  }
}
