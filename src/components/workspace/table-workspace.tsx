"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, Check, Copy, Download, Search } from "lucide-react";
import type { Column, Row, TableWorkspaceData } from "@/lib/types";
import { CellValue } from "@/components/workspace/cell";
import { RowSkeleton } from "@/components/workspace/row-skeleton";
import { AddColumnMenu } from "@/components/workspace/add-column-menu";

type Props = {
  data: TableWorkspaceData;
  loading?: boolean;
  /** 0-100 while rows are still streaming in */
  progress?: number;
  selectedId?: string | null;
  onSelect?: (row: Row) => void;
  addColumnOptions?: Column[];
  onAddColumn?: (key: string) => void;
};

const PAGE_SIZE = 25;

export function TableWorkspace({
  data,
  loading,
  progress = 0,
  selectedId,
  onSelect,
  addColumnOptions = [],
  onAddColumn,
}: Props) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(true);
  const [copied, setCopied] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const text = (row: Row, key: string) => String(row.cells[key]?.value ?? "");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle
      ? data.rows.filter((row) =>
          Object.values(row.cells)
            .map((cell) => String(cell.value))
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : data.rows;

    if (!sortKey) return base;

    const column = data.columns.find((c) => c.key === sortKey);
    return [...base].sort((a, b) => {
      const av = text(a, sortKey);
      const bv = text(b, sortKey);

      if (column?.sortType === "number") {
        const an = Number(av.replace(/[^0-9.-]/g, ""));
        const bn = Number(bv.replace(/[^0-9.-]/g, ""));
        if (Number.isFinite(an) && Number.isFinite(bn)) {
          return asc ? an - bn : bn - an;
        }
      }

      if (column?.sortType === "date") {
        const ad = Date.parse(av);
        const bd = Date.parse(bv);
        if (!Number.isNaN(ad) && !Number.isNaN(bd)) {
          return asc ? ad - bd : bd - ad;
        }
      }

      // Empty cells always sink, regardless of direction.
      if (!av) return 1;
      if (!bv) return -1;
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [data.rows, data.columns, q, sortKey, asc]);

  const visible = filtered.slice(0, limit);

  function exportCsv() {
    const header = data.columns.map((c) => c.label).join(",");
    const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const body = filtered
      .map((row) =>
        [
          ...data.columns.map((c) => escape(text(row, c.key))),
          escape(row.url ?? ""),
        ].join(","),
      )
      .join("\n");

    const blob = new Blob([`${header},Link\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title.replaceAll(" ", "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyTable() {
    const lines = [
      [...data.columns.map((c) => c.label), "Link"].join("\t"),
      ...filtered.map((row) =>
        [...data.columns.map((c) => text(row, c.key)), row.url ?? ""].join("\t"),
      ),
    ].join("\n");

    await navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            {data.title}
          </h1>
          <p className="mt-2 text-zinc-500">{data.subtitle}</p>
        </div>

        {/* ml-auto keeps the group right-aligned even after wrapping, which is
            what the dropdown's right-edge anchoring depends on. */}
        <div className="ml-auto flex items-center gap-2">
          {onAddColumn && (
            <AddColumnMenu options={addColumnOptions} onAdd={onAddColumn} />
          )}
          <ToolbarButton onClick={copyTable}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </ToolbarButton>
          <ToolbarButton onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </ToolbarButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter rows..."
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-300 dark:border-white/10 dark:bg-zinc-900"
          />
        </div>

        {loading ? (
          <div className="flex min-w-[180px] items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-zinc-900 dark:bg-white"
                animate={{ width: `${Math.max(8, progress)}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-zinc-400">
              {Math.round(progress)}%
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">
            {filtered.length} of {data.found ?? data.rows.length} found
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur dark:bg-zinc-950/95">
            <tr>
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap border-b border-zinc-200 px-4 py-3 font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-300"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === col.key) setAsc((v) => !v);
                      else {
                        setSortKey(col.key);
                        setAsc(true);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 transition hover:text-zinc-900 dark:hover:text-white"
                  >
                    {col.label}
                    <ArrowDownUp
                      className={`h-3 w-3 transition ${
                        sortKey === col.key ? "opacity-100" : "opacity-30"
                      }`}
                    />
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect?.(row)}
                className={`cursor-pointer border-b border-zinc-100 transition last:border-0 dark:border-white/5 ${
                  selectedId === row.id
                    ? "bg-zinc-50 dark:bg-white/[0.06]"
                    : "hover:bg-zinc-50/80 dark:hover:bg-white/[0.03]"
                }`}
              >
                {data.columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 align-top ${
                      i === 0 ? "min-w-[180px] max-w-[240px]" : "max-w-[200px]"
                    }`}
                  >
                    <CellValue
                      cell={row.cells[col.key]}
                      primary={i === 0}
                      favicon={i === 0 ? row.favicon : undefined}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {loading &&
              Array.from({ length: filtered.length === 0 ? 6 : 2 }).map((_, i) => (
                <RowSkeleton key={`skeleton-${i}`} columns={data.columns.length} />
              ))}
          </tbody>
        </table>
      </div>

      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.04]"
        >
          Load {Math.min(PAGE_SIZE, filtered.length - limit)} more
        </button>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
    >
      {children}
    </button>
  );
}
