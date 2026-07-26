"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, X } from "lucide-react";
import type { Column, Row } from "@/lib/types";

type EnrichedPage = {
  title?: string;
  description?: string;
  fields: Record<string, string>;
};

/**
 * Slides in over the table when a row is opened.
 * An overlay rather than a fixed rail so the table keeps the full width
 * whenever nothing is selected.
 */
export function DetailPanel({
  row,
  columns,
  onClose,
}: {
  row: Row | null;
  columns: Column[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, onClose]);

  return (
    <AnimatePresence>
      {row && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-[2px] dark:bg-black/40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l border-zinc-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950"
          >
            <Content row={row} columns={columns} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Content({
  row,
  columns,
  onClose,
}: {
  row: Row;
  columns: Column[];
  onClose: () => void;
}) {
  const [page, setPage] = useState<EnrichedPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(null);
    setError(null);
  }, [row.id]);

  const name = String(row.cells[columns[0]?.key ?? "name"]?.value ?? "Untitled");

  const enrich = useCallback(async () => {
    if (!row.url) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: row.url,
          fields: columns.map((c) => ({ key: c.key, label: c.label })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not read that page");
      setPage(json as EnrichedPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that page");
    } finally {
      setLoading(false);
    }
  }, [row.url, columns]);

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200/80 px-6 py-5 dark:border-white/10">
        <div className="flex min-w-0 items-start gap-2.5">
          {row.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.favicon} alt="" className="mt-1 h-5 w-5 rounded" />
          )}
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-xl leading-tight tracking-tight text-zinc-900 dark:text-white">
              {name}
            </h2>
            {row.url && (
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-500 underline-offset-4 transition hover:text-zinc-900 hover:underline dark:hover:text-white"
              >
                {hostOf(row.url)}
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <dl className="space-y-2.5">
          {columns.slice(1).map((col) => {
            const cell = row.cells[col.key];
            const value = cell?.value ?? page?.fields?.[col.key];
            if (!value) return null;

            return (
              <div
                key={col.key}
                className="rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  {col.label}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {String(value)}
                </dd>
                {cell?.url && (
                  <a
                    href={cell.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-zinc-400 underline-offset-2 transition hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
                  >
                    {cell.source}
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            );
          })}
        </dl>

        {page?.description && (
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {page.description}
          </p>
        )}

        {row.url && !page && (
          <button
            type="button"
            onClick={enrich}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reading page...
              </>
            ) : (
              "Read full page"
            )}
          </button>
        )}

        {error && (
          <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-500">
            {error}
          </p>
        )}

        {row.sources && row.sources.length > 0 && (
          <section>
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Mentioned by {row.sources.length}{" "}
              {row.sources.length === 1 ? "source" : "sources"}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {row.sources.map((source) => (
                <li key={source}>
                  <a
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-zinc-500 underline-offset-4 transition hover:text-zinc-900 hover:underline dark:hover:text-white"
                  >
                    {hostOf(source)}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
