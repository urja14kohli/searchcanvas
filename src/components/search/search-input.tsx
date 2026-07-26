"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "hero" | "bar";
  className?: string;
};

/**
 * Shared search input — used on landing (hero) and inside the canvas (bar).
 */
export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Search anything...",
  autoFocus,
  size = "hero",
  className,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => ref.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [autoFocus]);

  // ⌘K focuses search anywhere this is mounted
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isHero = size === "hero";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit();
      }}
      className={cn("relative w-full", className)}
    >
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-zinc-400",
          isHero ? "left-5 h-5 w-5" : "left-4 h-4 w-4",
        )}
      />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-white text-zinc-900 outline-none placeholder:text-zinc-400",
          "border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
          "transition focus:border-zinc-300 focus:shadow-[0_12px_40px_rgb(0,0,0,0.06)]",
          "dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500",
          "dark:focus:border-white/20",
          isHero
            ? "h-16 rounded-2xl pl-14 pr-28 text-lg"
            : "h-12 rounded-xl pl-11 pr-24 text-[15px]",
        )}
      />
      <div
        className={cn(
          "absolute top-1/2 flex -translate-y-1/2 items-center gap-2",
          isHero ? "right-4" : "right-3",
        )}
      >
        <kbd className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-400 sm:inline dark:border-white/10 dark:bg-zinc-900">
          ⌘K
        </kbd>
        <button
          type="submit"
          className={cn(
            "rounded-xl bg-zinc-900 font-medium text-white transition hover:bg-zinc-800",
            "dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
            isHero ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs",
          )}
        >
          Search
        </button>
      </div>
    </form>
  );
}
