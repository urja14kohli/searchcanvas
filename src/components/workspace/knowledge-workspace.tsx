"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Search } from "lucide-react";
import type { KnowledgeWorkspaceData } from "@/lib/types";

type Props = {
  data: KnowledgeWorkspaceData;
};

export function KnowledgeWorkspace({ data }: Props) {
  const allGroups = data.groups ?? [];
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allGroups.map((g) => [g.id, true])),
  );

  const groups = useMemo(() => {
    if (!q.trim()) return allGroups;
    const needle = q.toLowerCase();
    return allGroups
      .map((g) => ({
        ...g,
        cards: g.cards.filter(
          (c) =>
            c.title.toLowerCase().includes(needle) ||
            c.subtitle?.toLowerCase().includes(needle) ||
            g.category.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.cards.length > 0);
  }, [allGroups, q]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
          {data.title}
        </h1>
        <p className="mt-2 text-zinc-500">{data.subtitle}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search knowledge..."
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-300 dark:border-white/10 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.id}>
            <button
              type="button"
              onClick={() =>
                setOpen((s) => ({ ...s, [group.id]: !s[group.id] }))
              }
              className="flex w-full items-center justify-between text-left"
            >
              <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                {group.category}
              </h2>
              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition ${
                  open[group.id] ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {open[group.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.cards.map((card, i) => (
                      <motion.a
                        key={card.id}
                        href={card.href}
                        target={card.href ? "_blank" : undefined}
                        rel={card.href ? "noopener noreferrer" : undefined}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20"
                      >
                        <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                          {card.title}
                        </div>
                        {card.subtitle && (
                          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-zinc-500">
                            {card.subtitle}
                          </p>
                        )}
                        {card.badge && (
                          <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                            {card.badge}
                            <ArrowUpRight className="h-3 w-3" />
                          </span>
                        )}
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        ))}
      </div>
    </div>
  );
}
