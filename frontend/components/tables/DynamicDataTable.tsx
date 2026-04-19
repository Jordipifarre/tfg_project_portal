"use client";

import * as React from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Search, Download, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ArrowUpDown,
} from "lucide-react";

/* ── Props ───────────────────────────────────────────────────────────────── */

interface ServerPagination {
  /** 1-based current page */
  page: number;
  totalPages: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Local filter text (operates on the current page only in server mode) */
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  /** When provided the table delegates pagination to the server */
  serverPagination?: ServerPagination;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export function DynamicDataTable<TData, TValue>({
  columns,
  data,
  globalFilter,
  setGlobalFilter,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Pagination is always manual when serverPagination is supplied
    manualPagination: !!serverPagination,
    pageCount: serverPagination ? serverPagination.totalPages : undefined,
    state: { globalFilter, sorting },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

  /* CSV export — exports the rows currently visible (current server page) */
  const exportToCSV = () => {
    const rows = table.getRowModel().rows;
    if (rows.length === 0) return;
    const headers = columns.map((c) => (c as any).accessorKey ?? (c as any).id ?? "");
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => {
          const val = (r.original as any)[h];
          return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : (val ?? "");
        }).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* Pagination helpers */
  const sp = serverPagination;
  const currentPage = sp ? sp.page : table.getState().pagination.pageIndex + 1;
  const pageCount   = sp ? sp.totalPages : (table.getPageCount() || 1);
  const canPrev     = currentPage > 1;
  const canNext     = currentPage < pageCount;

  const goPrev  = () => sp ? sp.onPageChange(sp.page - 1) : table.previousPage();
  const goNext  = () => sp ? sp.onPageChange(sp.page + 1) : table.nextPage();
  const goFirst = () => sp ? sp.onPageChange(1) : table.setPageIndex(0);
  const goLast  = () => sp ? sp.onPageChange(sp.totalPages) : table.setPageIndex(table.getPageCount() - 1);

  const rowLabel = sp
    ? `${((sp.page - 1) * 50 + 1).toLocaleString()}–${Math.min(sp.page * 50, sp.totalRows).toLocaleString()} de ${sp.totalRows.toLocaleString()} files`
    : `${table.getFilteredRowModel().rows.length.toLocaleString()} files`;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
          <Input
            placeholder={sp ? "Cerca a la pàgina actual…" : "Cerca totes les columnes…"}
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-600/40"
          />
        </div>
        {sp && (
          <span className="text-xs text-slate-500 hidden sm:block">
            La cerca opera sobre la pàgina actual. Usa el SQL Chat per a cerques globals.
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          className="gap-1.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs h-9"
        >
          <Download size={14} /> Exporta CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-slate-800 hover:bg-transparent">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className="text-slate-400 text-xs font-semibold uppercase tracking-wide px-4 py-3 bg-slate-950/60 whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={`flex items-center gap-1 ${canSort ? "cursor-pointer hover:text-slate-200" : ""}`}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <ArrowUpDown size={12} className={
                              header.column.getIsSorted()
                                ? "text-cyan-400"
                                : "text-slate-600"
                            } />
                          )}
                        </button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-slate-800 hover:bg-slate-800/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-2.5 text-sm text-slate-300 max-w-[220px] truncate"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-slate-500 text-sm"
                >
                  Sense resultats.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination bar */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-500">{rowLabel}</p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
            onClick={goFirst}
            disabled={!canPrev}
            title="Primera pàgina"
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
            onClick={goPrev}
            disabled={!canPrev}
            title="Pàgina anterior"
          >
            <ChevronLeft size={14} />
          </Button>

          <span className="text-xs text-slate-400 px-3 tabular-nums">
            {currentPage.toLocaleString()} / {pageCount.toLocaleString()}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
            onClick={goNext}
            disabled={!canNext}
            title="Pàgina següent"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
            onClick={goLast}
            disabled={!canNext}
            title="Última pàgina"
          >
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
