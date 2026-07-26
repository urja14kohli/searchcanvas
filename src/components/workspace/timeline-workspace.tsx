"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { TimelineWorkspaceData } from "@/lib/types";

const CARD =
  "group block rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition dark:border-white/10 dark:bg-zinc-900";

/** Events with a source page become clickable; the rest stay plain cards. */
function Wrapper({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <div className={CARD}>{children}</div>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${CARD} hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:hover:border-white/20`}
    >
      {children}
    </a>
  );
}

type Props = {
  data: TimelineWorkspaceData;
};

export function TimelineWorkspace({ data }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
          {data.title}
        </h1>
        <p className="mt-2 text-zinc-500">{data.subtitle}</p>
      </div>

      <ol className="relative ml-3 space-y-6 border-l border-zinc-200 pl-8 dark:border-white/10">
        {data.events.map((event, i) => (
          <motion.li
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative"
          >
            <span className="absolute -left-[39px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-zinc-900 shadow dark:border-zinc-950 dark:bg-white" />
            <Wrapper href={event.url}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  {event.date}
                </span>
                {event.source && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                      {event.source}
                      {event.url && <ArrowUpRight className="h-3 w-3" />}
                    </span>
                  </>
                )}
              </div>
              <h3 className="mt-2 text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                {event.title}
              </h3>
              {event.description && (
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                  {event.description}
                </p>
              )}
            </Wrapper>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
