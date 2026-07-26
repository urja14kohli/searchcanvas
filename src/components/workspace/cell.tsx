"use client";

import { ArrowUpRight } from "lucide-react";
import type { Cell } from "@/lib/types";

/**
 * Renders one table value along with where it came from.
 * The visible source line is the whole point: it turns the table from
 * something we appear to have invented into something checkable.
 */
export function CellValue({
  cell,
  primary = false,
  favicon,
}: {
  cell?: Cell;
  primary?: boolean;
  favicon?: string;
}) {
  if (!cell || cell.value === "" || cell.value == null) {
    return <span className="text-zinc-300 dark:text-zinc-700">—</span>;
  }

  const text = String(cell.value);

  if (!cell.url) {
    return (
      <span
        title={text}
        className={`line-clamp-2 ${primary ? "font-medium text-zinc-900 dark:text-zinc-100" : ""}`}
      >
        {text}
      </span>
    );
  }

  return (
    <a
      href={cell.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={text}
      className="group/cell flex max-w-full flex-col gap-0.5"
    >
      <span className="flex items-start gap-1.5">
        {primary && favicon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={favicon}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        )}
        <span
          className={`line-clamp-2 ${
            primary
              ? "font-medium text-zinc-900 decoration-zinc-300 underline-offset-4 group-hover/cell:underline dark:text-zinc-100 dark:decoration-zinc-600"
              : "text-zinc-600 decoration-zinc-300 underline-offset-4 group-hover/cell:underline dark:text-zinc-400 dark:decoration-zinc-600"
          }`}
        >
          {text}
        </span>
        <ArrowUpRight className="mt-1 h-3 w-3 shrink-0 text-zinc-300 opacity-0 transition group-hover/cell:opacity-100 dark:text-zinc-600" />
      </span>

      {cell.source && (
        <span className="truncate text-[11px] text-zinc-400 dark:text-zinc-600">
          {cell.source}
        </span>
      )}
    </a>
  );
}
