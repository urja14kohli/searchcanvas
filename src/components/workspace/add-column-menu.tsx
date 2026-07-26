"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Column } from "@/lib/types";

/**
 * Compact toolbar dropdown of columns the router did not pick by default,
 * plus a free-text field for anything the suggestions missed.
 */
export function AddColumnMenu({
  options,
  onAdd,
}: {
  options: Column[];
  onAdd: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && options.length === 0) {
      // Nothing suggested — jump straight to typing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, options.length]);

  const submitCustom = (e?: FormEvent) => {
    e?.preventDefault();
    const key = slugify(custom);
    if (!key) return;
    setCustom("");
    setOpen(false);
    onAdd(key);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add column
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-1.5 shadow-[0_16px_50px_rgb(0,0,0,0.10)] dark:border-white/10 dark:bg-zinc-900"
          >
            {options.length > 0 && (
              <>
                <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Suggested
                </p>
                {options.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onAdd(col.key);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
                  >
                    <Plus className="h-3.5 w-3.5 text-zinc-400" />
                    {col.label}
                  </button>
                ))}
                <div className="my-1.5 border-t border-zinc-100 dark:border-white/[0.06]" />
              </>
            )}

            <form onSubmit={submitCustom} className="px-1.5 pb-1 pt-0.5">
              <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Or type your own
              </p>
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="e.g. deadline"
                  className="h-8 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-white/20"
                />
                <button
                  type="submit"
                  disabled={!custom.trim()}
                  className="inline-flex h-8 shrink-0 items-center rounded-lg bg-zinc-900 px-2.5 text-xs font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-30 dark:bg-white dark:text-zinc-900 dark:enabled:hover:bg-zinc-100"
                >
                  Add
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "Funding amount" / "funding-amount" -> "funding_amount" */
function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
