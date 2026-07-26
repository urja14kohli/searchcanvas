import { scrapePage } from "@/lib/search/firecrawl";

export const maxDuration = 60;

type Body = {
  url?: string;
  fields?: { key: string; label: string }[];
};

/**
 * Deep-reads one page for the Inspector panel.
 * Runs only when a row is opened, never during search.
 */
export async function POST(request: Request) {
  const { url, fields = [] } = (await request.json().catch(() => ({}))) as Body;

  if (!url) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const page = await scrapePage({ url, fields });
    return Response.json(page);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Enrich failed" },
      { status: 502 },
    );
  }
}
