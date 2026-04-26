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
  page: number;
  totalPages: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
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
    manualPagination: !!serverPagination,
    pageCount: serverPagination ? serverPagination.totalPages : undefined,
    state: { globalFilter, sorting },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] h-4 w-4" />
          <Input
            placeholder={sp ? "Cerca a la pàgina actual…" : "Cerca totes les columnes…"}
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9 bg-white border-[#e5e5e5] text-[#1f2937] placeholder:text-[#9ca3af] focus-visible:ring-[#1a3a52]/20 focus-visible:border-[#1a3a52]/40"
          />
        </div>
        {sp && (
          <span className="text-xs text-[#9ca3af] hidden sm:block">
            La cerca opera sobre la pàgina actual. Usa el SQL Chat per a cerques globals.
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          className="gap-1.5 border-[#e5e5e5] bg-white hover:bg-gray-50 text-[#475569] text-xs h-9 shadow-none"
        >
          <Download size={14} /> Exporta CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#e5e5e5] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-[#e5e5e5] hover:bg-transparent">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className="text-[#ffffff] text-xs font-semibold uppercase tracking-wide px-4 py-3 bg-[#1a3a52] whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={`flex items-center gap-1 ${canSort ? "cursor-pointer hover:text-white/80" : ""}`}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <ArrowUpDown size={12} className={
                              header.column.getIsSorted()
                                ? "text-[#d97706]"
                                : "text-white/40"
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
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  className={`border-[#e5e5e5] hover:bg-[#1a3a52]/5 transition-colors ${rowIndex % 2 === 0 ? "bg-white" : "bg-[#f5f5f5]"}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-2.5 text-sm text-[#1f2937] max-w-[220px] truncate"
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
                  className="h-32 text-center text-[#9ca3af] text-sm"
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
        <p className="text-xs text-[#6b7280]">{rowLabel}</p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-[#e5e5e5] bg-white hover:bg-gray-50 text-[#475569] disabled:opacity-30 shadow-none"
            onClick={goFirst}
            disabled={!canPrev}
            title="Primera pàgina"
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-[#e5e5e5] bg-white hover:bg-gray-50 text-[#475569] disabled:opacity-30 shadow-none"
            onClick={goPrev}
            disabled={!canPrev}
            title="Pàgina anterior"
          >
            <ChevronLeft size={14} />
          </Button>

          <span className="text-xs text-[#6b7280] px-3 tabular-nums">
            {currentPage.toLocaleString()} / {pageCount.toLocaleString()}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-[#e5e5e5] bg-white hover:bg-gray-50 text-[#475569] disabled:opacity-30 shadow-none"
            onClick={goNext}
            disabled={!canNext}
            title="Pàgina següent"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 border-[#e5e5e5] bg-white hover:bg-gray-50 text-[#475569] disabled:opacity-30 shadow-none"
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
