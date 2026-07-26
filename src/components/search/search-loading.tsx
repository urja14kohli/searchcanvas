"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Props = {
  query: string;
  /** real progress reported by the server, appended as it arrives */
  steps: string[];
  /** 0-100 from the server's phase count */
  progress: number;
};

/** Typical end-to-end search, used only to estimate the seconds remaining. */
const EXPECTED_MS = 14000;

/**
 * Loading experience between search and workspace.
 *
 * Every line corresponds to work the server actually did. The percentage is
 * driven by real phases, then eased forward between them so the bar never
 * appears frozen while a slow network call is in flight.
 */
export function SearchLoading({ query, steps, progress }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [smooth, setSmooth] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const tick = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);

      // Drift toward the next phase so the bar keeps breathing, but never
      // overtake what the server has actually confirmed.
      const timeBased = Math.min(95, (ms / EXPECTED_MS) * 100);
      setSmooth((prev) => Math.max(prev, Math.min(progress + 12, timeBased)));
    }, 100);

    return () => clearInterval(tick);
  }, [progress]);

  const shown = Math.max(smooth, progress);
  const seconds = Math.max(0, Math.round((EXPECTED_MS - elapsed) / 1000));
  const visibleSteps = steps.length > 0 ? steps : ["Searching the web..."];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="truncate font-[family-name:var(--font-display)] text-2xl tracking-tight text-zinc-900 dark:text-white">
          {query}
        </p>

        <div className="mt-6 flex items-baseline justify-between">
          <span className="font-[family-name:var(--font-display)] text-5xl tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {Math.round(shown)}
            <span className="text-2xl text-zinc-400">%</span>
          </span>
          <span className="text-sm tabular-nums text-zinc-400">
            {shown >= 99
              ? "Almost there"
              : seconds > 0
                ? `about ${seconds}s left`
                : "finishing up"}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <motion.div
            className="h-full rounded-full bg-zinc-900 dark:bg-white"
            animate={{ width: `${shown}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <ul className="mt-8 space-y-3">
          {visibleSteps.map((step, i) => {
            const done = i < visibleSteps.length - 1;

            return (
              <motion.li
                key={`${step}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    done
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  }`}
                >
                  {done ? (
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  ) : (
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-current"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  )}
                </span>

                <span
                  className={`text-[15px] ${
                    done
                      ? "text-zinc-400"
                      : "font-medium text-zinc-900 dark:text-white"
                  }`}
                >
                  {step}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
