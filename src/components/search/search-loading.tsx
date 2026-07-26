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

/** Soft ceiling while work is still in flight — never claim 100% early. */
const CAP = 96;

/**
 * Loading experience between search and workspace.
 *
 * Server phases set a floor. Between phases the ticker keeps climbing
 * toward the cap so it never freezes at e.g. 50% during a long Exa call.
 */
export function SearchLoading({ query, steps, progress }: Props) {
  const [shown, setShown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const shownRef = useRef(0);
  const progressRef = useRef(progress);

  progressRef.current = progress;

  useEffect(() => {
    const tick = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);

      const floor = Math.max(shownRef.current, progressRef.current);
      const remaining = CAP - floor;

      // Asymptotic creep: always move a little, slower near the top.
      // At 100ms ticks this reaches the high 90s over ~45–60s without stalling.
      const creep =
        remaining <= 0 ? 0 : Math.max(0.12, remaining * 0.018);

      const next = Math.min(CAP, floor + creep);
      shownRef.current = next;
      setShown(next);
    }, 100);

    return () => clearInterval(tick);
  }, []);

  // Snap up immediately when the server reports a higher phase.
  useEffect(() => {
    if (progress > shownRef.current) {
      shownRef.current = progress;
      setShown(progress);
    }
  }, [progress]);

  const seconds = Math.max(1, Math.round((CAP - shown) * 0.55));
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
            {shown >= 94
              ? "Almost there"
              : elapsed > 50_000
                ? "still working"
                : `about ${seconds}s left`}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <motion.div
            className="h-full rounded-full bg-zinc-900 dark:bg-white"
            animate={{ width: `${shown}%` }}
            transition={{ duration: 0.15, ease: "linear" }}
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
