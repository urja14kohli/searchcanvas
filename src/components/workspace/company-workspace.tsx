"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import type { CompanyWorkspaceData } from "@/lib/types";

type Props = {
  data: CompanyWorkspaceData;
};

export function CompanyWorkspace({ data }: Props) {
  return (
    <div className="space-y-10">
      <Header title={data.title} subtitle={data.subtitle} website={data.website} />

      <section>
        <SectionLabel>Overview</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.cards.map((card, i) => (
            <motion.a
              key={card.id}
              href={card.href ?? "#"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {card.badge && (
                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      {card.badge}
                    </span>
                  )}
                  <h3 className="mt-1 text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="mt-1 text-sm text-zinc-500">{card.subtitle}</p>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-300 transition group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {data.pricing && (
        <section>
          <SectionLabel>Pricing</SectionLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.pricing.map((p) => (
              <div
                key={p.plan}
                className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/10 dark:bg-zinc-900"
              >
                <div className="text-sm text-zinc-500">{p.plan}</div>
                <div className="mt-1 text-2xl font-medium tracking-tight text-zinc-900 dark:text-white">
                  {p.price}
                </div>
                {p.note && <p className="mt-2 text-sm text-zinc-500">{p.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {data.news && (
          <section>
            <SectionLabel>Latest News</SectionLabel>
            <ul className="mt-4 space-y-2">
              {data.news.map((n) => (
                <li
                  key={n.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-3 transition hover:border-zinc-200 hover:bg-white dark:hover:border-white/10 dark:hover:bg-zinc-900"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {n.title}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {n.source} · {n.date}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.competitors && (
          <section>
            <SectionLabel>Competitors</SectionLabel>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.competitors.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {c}
                </span>
              ))}
            </div>
            {data.funding && (
              <div className="mt-8">
                <SectionLabel>Funding</SectionLabel>
                <ul className="mt-4 space-y-2">
                  {data.funding.map((f) => (
                    <li
                      key={f.round}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-900 dark:text-zinc-100">{f.round}</span>
                      <span className="text-zinc-500">
                        {f.amount} · {f.date}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Header({
  title,
  subtitle,
  website,
}: {
  title: string;
  subtitle: string;
  website?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-zinc-500">{subtitle}</p>
      </div>
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
        >
          Official website
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
      {children}
    </h2>
  );
}
