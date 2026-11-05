/**
 * Tiny pagination primitive used on long list sections.
 *
 *   const { page, setPage, slice, totalPages } = usePagination(items, 5);
 *   {slice.map(...)}
 *   <Pagination page={page} totalPages={totalPages} setPage={setPage} total={items.length} />
 *
 * When totalPages <= 1 the component renders nothing — safe to drop in
 * unconditionally on small datasets.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function usePagination<T>(items: T[], pageSize = 5) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Snap back to last page if items shrink (delete) past current page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const slice = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return { page, setPage, slice, totalPages, pageSize };
}

export function Pagination({
  page,
  totalPages,
  setPage,
  total,
  className,
}: {
  page: number;
  totalPages: number;
  setPage: (n: number) => void;
  total: number;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 pt-3 mt-2 border-t border-ink-700/60",
        className
      )}
    >
      <div className="text-[11px] font-mono text-ink-400">
        page <span className="text-ink-100">{page}</span> / {totalPages} ·{" "}
        <span className="text-ink-100">{total}</span> total
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className={cn(
            "w-7 h-7 rounded-md border flex items-center justify-center transition-colors",
            page <= 1
              ? "border-ink-700 text-ink-500 cursor-not-allowed"
              : "border-ink-600 text-ink-200 hover:border-cyan/40 hover:text-cyan"
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={cn(
            "w-7 h-7 rounded-md border flex items-center justify-center transition-colors",
            page >= totalPages
              ? "border-ink-700 text-ink-500 cursor-not-allowed"
              : "border-ink-600 text-ink-200 hover:border-cyan/40 hover:text-cyan"
          )}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
