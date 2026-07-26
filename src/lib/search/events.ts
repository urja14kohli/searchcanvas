import type { Column, Row, WorkspaceData } from "@/lib/types";

/**
 * Wire protocol between /api/search and the client.
 * Newline-delimited JSON so the UI can paint rows as they are found
 * instead of waiting for the whole search to finish.
 */
export type SearchEvent =
  | { type: "step"; label: string; index: number; total: number }
  | {
      type: "schema";
      workspaceType: WorkspaceData["type"];
      title: string;
      subtitle: string;
      columns: Column[];
      suggestions: string[];
    }
  | { type: "rows"; rows: Row[]; found: number }
  | { type: "workspace"; workspace: WorkspaceData }
  | { type: "done"; found: number }
  | { type: "error"; message: string };

export function encodeEvent(event: SearchEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

/** Reads an NDJSON response body and yields one event at a time. */
export async function* readEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SearchEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // last element is an incomplete line, keep it for the next chunk
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line) as SearchEvent;
      } catch {
        // a partial write we can safely skip
      }
    }
  }

  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer) as SearchEvent;
    } catch {
      // ignore trailing garbage
    }
  }
}
