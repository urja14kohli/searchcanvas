"use client";

import { useCallback, useState } from "react";
import { SearchHero } from "@/components/landing/search-hero";
import { SearchLoading } from "@/components/search/search-loading";
import { SearchError } from "@/components/search/search-error";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useSearchStream } from "@/hooks/use-search-stream";

/**
 * App brain — owns the one flow:
 * landing -> loading -> workspace -> refine
 */
export function CanvasApp() {
  const { phase, query, steps, progress, workspace, error, search, reset } =
    useSearchStream();
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);

  const startSearch = useCallback(
    (next: string) => {
      const q = next.trim();
      if (!q) return;

      setExtraColumns([]);
      setHistory((h) => (h[h.length - 1] === q ? h : [...h, q]));
      setDraft("");
      void search(q);
    },
    [search],
  );

  const refine = useCallback(() => {
    if (draft.trim()) startSearch(draft);
  }, [draft, startSearch]);

  // Adding a column re-runs the same query with a wider extraction schema.
  const addColumn = useCallback(
    (key: string) => {
      const next = [...extraColumns, key];
      setExtraColumns(next);
      void search(query, { extraColumns: next });
    },
    [extraColumns, query, search],
  );

  const goHome = useCallback(() => {
    reset();
    setDraft("");
    setHistory([]);
    setExtraColumns([]);
  }, [reset]);

  if (phase === "idle") {
    return <SearchHero value={draft} onChange={setDraft} onSearch={startSearch} />;
  }

  // Keep the loading screen up until the first rows actually exist.
  if (phase === "loading" && !workspace) {
    return <SearchLoading query={query} steps={steps} progress={progress} />;
  }

  if (phase === "error" || !workspace) {
    return (
      <SearchError
        query={query}
        message={error ?? "Something went wrong"}
        onRetry={() => search(query)}
        onHome={goHome}
      />
    );
  }

  return (
    <WorkspaceShell
      workspace={workspace}
      loading={phase === "loading"}
      progress={progress}
      draft={draft}
      onDraftChange={setDraft}
      onRefine={refine}
      onAddColumn={addColumn}
      history={history}
    />
  );
}
