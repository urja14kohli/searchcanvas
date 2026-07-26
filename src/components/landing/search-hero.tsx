"use client";

import { motion } from "framer-motion";
import { EXAMPLE_QUERIES } from "@/lib/query-router";
import { SearchInput } from "@/components/search/search-input";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
};

export function SearchHero({ value, onChange, onSearch }: Props) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
          Canvas
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl text-center"
        >
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-zinc-900 sm:text-6xl dark:text-white">
            Search anything.
          </h1>
          <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
            We organize it.
          </p>

          <div className="mt-10">
            <SearchInput
              value={value}
              onChange={onChange}
              onSubmit={() => onSearch(value)}
              autoFocus
              size="hero"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {EXAMPLE_QUERIES.map((q, i) => (
              <motion.button
                key={q}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04, duration: 0.35 }}
                onClick={() => {
                  onChange(q);
                  onSearch(q);
                }}
                className="rounded-full border border-zinc-200/80 bg-white/70 px-3.5 py-1.5 text-sm text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-zinc-900"
              >
                {q}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>

      <footer className="px-6 py-5 text-center text-xs text-zinc-400">
      Search anything. Get a table, timeline, board, or dashboard.
      </footer>
    </div>
  );
}
