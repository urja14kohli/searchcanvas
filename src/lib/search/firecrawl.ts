const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2";

export type EnrichedPage = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  fields: Record<string, string>;
  markdown?: string;
};

function apiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not set in .env.local");
  return key;
}

/**
 * Deep-read a single page on demand.
 *
 * Deliberately kept out of the search hot path — Exa already returns enough to
 * fill the table, so Firecrawl only runs when the user opens a row and wants
 * more than the table shows. Keeps search fast and credits low.
 */
export async function scrapePage({
  url,
  fields,
  signal,
}: {
  url: string;
  fields: { key: string; label: string }[];
  signal?: AbortSignal;
}): Promise<EnrichedPage> {
  const properties: Record<string, { type: string; description: string }> = {};
  for (const field of fields) {
    properties[field.key] = { type: "string", description: field.label };
  }

  const res = await fetch(`${FIRECRAWL_ENDPOINT}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      url,
      onlyMainContent: true,
      timeout: 25000,
      formats: [
        "markdown",
        {
          type: "json",
          prompt: "Extract the requested details about this page's main subject.",
          schema: { type: "object", properties },
        },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Firecrawl failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data?: {
      json?: Record<string, string>;
      markdown?: string;
      metadata?: Record<string, string>;
    };
  };

  const meta = json.data?.metadata ?? {};
  const extracted = json.data?.json ?? {};

  // Firecrawl says "Not specified" rather than omitting missing values.
  const fieldsOut: Record<string, string> = {};
  for (const [key, value] of Object.entries(extracted)) {
    if (!value) continue;
    if (/^(not specified|n\/a|unknown|none)$/i.test(String(value).trim())) continue;
    fieldsOut[key] = String(value);
  }

  return {
    url,
    title: meta.title ?? meta["og:title"],
    description: meta.description ?? meta["og:description"],
    image: meta["og:image"],
    favicon: meta.favicon,
    fields: fieldsOut,
    markdown: json.data?.markdown?.slice(0, 4000),
  };
}
