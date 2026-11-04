import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { cn } from "../../lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Provide to make the column sortable (client-side, presentational only) */
  sortValue?: (row: T) => number | string;
  /** Hide on narrow viewports to keep tables readable */
  hideBelow?: "sm" | "md" | "lg" | "xl";
  className?: string;
  width?: string;
}

const hideClass = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  caption,
  onRowClick,
  selectedId,
  empty,
  className,
  footer,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  caption: string;
  onRowClick?: (row: T) => void;
  selectedId?: string;
  empty?: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key !== key ? { key, dir: "desc" } : s.dir === "desc" ? { key, dir: "asc" } : null));
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-y border-border bg-surface-sunken/60">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={{ width: c.width }}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "px-4 py-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground first:pl-5 last:pr-5",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.align !== "right" && c.align !== "center" && "text-left",
                      c.hideBelow && hideClass[c.hideBelow],
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded hover:text-foreground",
                          active && "text-foreground",
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const id = getRowId(row);
              const selected = id === selectedId;
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  aria-selected={onRowClick ? selected : undefined}
                  className={cn(
                    "border-b border-border transition-colors last:border-b-0",
                    onRowClick && "cursor-pointer hover:bg-surface-sunken/70 focus-visible:bg-surface-sunken",
                    selected && "bg-primary-soft/50 hover:bg-primary-soft/60",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-3 align-middle first:pl-5 last:pr-5",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.hideBelow && hideClass[c.hideBelow],
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && empty}
      {footer}
    </div>
  );
}
