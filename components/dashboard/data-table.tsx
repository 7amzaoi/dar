"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, ArrowDown, ArrowUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronBack, ChevronForward } from "@/components/shared/icons";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/states";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  loading,
  error,
  onRetry,
  empty,
  searchPlaceholder,
  searchText,
  toolbar,
  pageSize = 10,
  rowHref,
  className,
}: {
  rows: T[] | undefined;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: Error;
  onRetry?: () => void;
  /** shown when there are no rows at all */
  empty: { title: string; body?: string; action?: ReactNode };
  /** enables the search box; returns the text a row is matched against */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  pageSize?: number;
  rowHref?: (row: T) => string;
  className?: string;
}) {
  const { t, formatNumber } = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = rows ?? [];
    const q = query.trim().toLowerCase();
    if (q && searchText) list = list.filter((r) => searchText(r).toLowerCase().includes(q));
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sortValue && sort) {
      const sv = col.sortValue;
      list = [...list].sort((a, b) => {
        const x = sv(a);
        const y = sv(b);
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
      });
    }
    return list;
  }, [rows, query, searchText, sort, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
    setPage(0);
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-soft", className)}>
      {(searchText || toolbar) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline p-4">
          {searchText && (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.6} />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder ?? t("common.search")}
                aria-label={searchPlaceholder ?? t("common.search")}
                className="ps-9"
              />
            </div>
          )}
          {toolbar && <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{toolbar}</div>}
        </div>
      )}

      {error ? (
        <div className="p-6">
          <ErrorState onRetry={onRetry} />
        </div>
      ) : loading || !rows ? (
        <SkeletonRows className="p-4" />
      ) : rows.length === 0 ? (
        <div className="p-6">
          <EmptyState title={empty.title} body={empty.body} action={empty.action} className="border-0" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6">
          <EmptyState title={t("common.noResults")} className="border-0" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.key} className={cn("h-11 px-4 text-xs font-medium text-muted-foreground first:ps-6 last:pe-6", c.headerClassName)}>
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1.5 hover:text-foreground">
                        {c.header}
                        {sort?.key === c.key ? (
                          sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                        ) : (
                          <ArrowDownUp className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const href = rowHref?.(row);
                return (
                  <TableRow
                    key={getRowId(row)}
                    className={cn("border-hairline", href && "cursor-pointer")}
                    onClick={
                      href
                        ? (e) => {
                            // let interactive children (buttons, switches, links) handle their own clicks
                            if ((e.target as HTMLElement).closest("button, a, input, [role=switch], [role=menuitem]")) return;
                            router.push(href);
                          }
                        : undefined
                    }
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={cn("px-4 py-3.5 first:ps-6 last:pe-6", c.className)}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-hairline px-6 py-3 text-xs text-muted-foreground">
              <span>
                {formatNumber(current * pageSize + 1)}–{formatNumber(Math.min(filtered.length, (current + 1) * pageSize))} / {formatNumber(filtered.length)}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={t("common.back")}>
                  <ChevronBack className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next">
                  <ChevronForward className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
