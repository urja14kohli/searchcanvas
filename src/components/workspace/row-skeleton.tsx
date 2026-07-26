/** Placeholder row shown while more results are still streaming in. */
export function RowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-white/5">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3 animate-pulse rounded-full bg-zinc-100 dark:bg-white/[0.06]"
            style={{ width: i === 0 ? "70%" : `${45 + ((i * 13) % 30)}%` }}
          />
        </td>
      ))}
    </tr>
  );
}
