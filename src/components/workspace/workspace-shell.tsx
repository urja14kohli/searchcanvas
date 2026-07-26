"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Column, Row, WorkspaceData } from "@/lib/types";
import { SearchInput } from "@/components/search/search-input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DetailPanel } from "@/components/workspace/detail-panel";
import { WorkspaceRenderer } from "@/components/workspace/workspace-renderer";
import { OPTIONAL_COLUMN_LABELS } from "@/lib/search/columns";

type Props = {
  workspace: WorkspaceData;
  loading: boolean;
  progress: number;
  draft: string;
  onDraftChange: (value: string) => void;
  onRefine: () => void;
  onAddColumn: (key: string) => void;
  history: string[];
};

/**
 * The canvas shell. Search stays put so a workspace can be replaced without
 * going home, the structured output gets the full width, and row detail
 * arrives as an overlay only when asked for.
 */
export function WorkspaceShell({
  workspace,
  loading,
  progress,
  draft,
  onDraftChange,
  onRefine,
  onAddColumn,
  history,
}: Props) {
  const [selected, setSelected] = useState<Row | null>(null);

  // A new search invalidates whatever row was open.
  useEffect(() => {
    setSelected(null);
  }, [workspace.title, workspace.type]);

  const columns: Column[] = useMemo(
    () => ("columns" in workspace ? workspace.columns : []),
    [workspace],
  );

  const suggestions: Column[] = useMemo(
    () =>
      (workspace.suggestions ?? []).map((key) => ({
        key,
        label: OPTIONAL_COLUMN_LABELS[key] ?? key,
      })),
    [workspace],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="shrink-0 text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            Canvas
          </Link>
          <div className="min-w-0 flex-1">
            <SearchInput
              value={draft}
              onChange={onDraftChange}
              onSubmit={onRefine}
              size="bar"
              placeholder="Search again..."
            />
          </div>
          <ThemeToggle />
        </div>

        {history.length > 1 && (
          <div className="mx-auto flex max-w-[1400px] gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
            {history.map((h, i) => (
              <span
                key={`${h}-${i}`}
                className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-8 lg:px-10"
      >
        <WorkspaceRenderer
          data={workspace}
          loading={loading}
          progress={progress}
          selectedId={selected?.id ?? null}
          onSelect={(row) => setSelected((prev) => (prev?.id === row.id ? null : row))}
          addColumnOptions={suggestions}
          onAddColumn={onAddColumn}
        />
      </motion.main>

      <DetailPanel
        row={selected}
        columns={columns}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
