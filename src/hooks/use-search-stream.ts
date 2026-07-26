"use client";

import { useCallback, useRef, useState } from "react";
import { readEvents } from "@/lib/search/events";
import type { EntityKind } from "@/lib/search/schema";
import type { Row, WorkspaceData } from "@/lib/types";

export type SearchPhase = "idle" | "loading" | "ready" | "error";

export type SearchState = {
  phase: SearchPhase;
  query: string;
  /** loading lines, appended as the server reports real progress */
  steps: string[];
  /** 0-100, driven by real server phases rather than a timer */
  progress: number;
  workspace: WorkspaceData | null;
  found: number;
  error: string | null;
};

const INITIAL: SearchState = {
  phase: "idle",
  query: "",
  steps: [],
  progress: 0,
  workspace: null,
  found: 0,
  error: null,
};

export function useSearchStream() {
  const [state, setState] = useState<SearchState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (
      query: string,
      options: { extraColumns?: string[]; forceKind?: EntityKind } = {},
    ) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        phase: "loading",
        query: trimmed,
        steps: [],
        progress: 0,
        workspace: null,
        found: 0,
        error: null,
      });

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, ...options }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Search failed with status ${res.status}`);
        }

        for await (const event of readEvents(res.body)) {
          if (controller.signal.aborted) return;

          switch (event.type) {
            case "step":
              setState((s) => ({
                ...s,
                steps: [...s.steps, event.label],
                progress: Math.round((event.index / event.total) * 100),
              }));
              break;

            case "schema":
              // A chart cannot be drawn one point at a time, so it keeps the
              // loading screen until its `workspace` event lands.
              if (event.workspaceType === "chart") break;

              // Only table layouts can render before their content arrives.
              // Timeline and knowledge show a table skeleton, then get
              // replaced wholesale by the later `workspace` event.
              setState((s) => ({
                ...s,
                workspace: {
                  type:
                    event.workspaceType === "spreadsheet"
                      ? "spreadsheet"
                      : "comparison",
                  title: event.title,
                  subtitle: event.subtitle,
                  columns: event.columns,
                  rows: [],
                  suggestions: event.suggestions,
                } as WorkspaceData,
              }));
              break;

            case "rows":
              setState((s) => {
                const current = s.workspace;
                if (!current || !("rows" in current)) return s;
                const merged: Row[] = [...current.rows, ...event.rows];
                return {
                  ...s,
                  phase: "ready",
                  found: event.found,
                  workspace: { ...current, rows: merged, found: event.found },
                };
              });
              break;

            case "workspace":
              setState((s) => ({
                ...s,
                phase: "ready",
                workspace: event.workspace,
              }));
              break;

            case "done":
              setState((s) => ({
                ...s,
                phase: s.workspace ? "ready" : "error",
                progress: 100,
                found: event.found,
                error: s.workspace ? null : "No results",
              }));
              break;

            case "error":
              setState((s) => ({ ...s, phase: "error", error: event.message }));
              break;
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((s) => ({
          ...s,
          phase: "error",
          error: error instanceof Error ? error.message : "Something went wrong",
        }));
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  return { ...state, search, reset };
}
