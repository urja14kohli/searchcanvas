"use client";

import { motion } from "framer-motion";
import { RotateCw, SearchX } from "lucide-react";

type Props = {
  query: string;
  message: string;
  onRetry: () => void;
  onHome: () => void;
};

/**
 * Shown when a search genuinely fails.
 * Deliberately never falls back to sample data — a table that looks real but
 * is not is worse than an honest empty state.
 */
export function SearchError({ query, message, onRetry, onHome }: Props) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
          <SearchX className="h-5 w-5 text-zinc-400" />
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl tracking-tight text-zinc-900 dark:text-white">
          No workspace for “{query}”
        </h1>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
          {message}
        </p>

        <div className="mt-7 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
          >
            New search
          </button>
        </div>
      </motion.div>
    </div>
  );
}
