"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchTables, fetchTableData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Table2 } from "lucide-react";
import { DynamicDataTable } from "@/components/tables/DynamicDataTable";
import { ColumnDef } from "@tanstack/react-table";

const PAGE_SIZE = 50;

export default function ExplorerPage() {
  const [tables, setTables]           = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData]               = useState<any[]>([]);
  const [columns, setColumns]         = useState<string[]>([]);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalRows, setTotalRows]     = useState(0);
  const [loading, setLoading]         = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const { toast } = useToast();

  /* Load table list once */
  useEffect(() => {
    fetchTables()
      .then((res) => setTables(res.tables))
      .catch(() =>
        toast({ title: "Error de connexió", description: "No s'han pogut obtenir les taules.", variant: "destructive" })
      );
  }, [toast]);

  /* Fetch one page of data from the backend */
  const loadPage = useCallback(
    async (tableName: string, pageNum: number) => {
      setLoading(true);
      try {
        const res = await fetchTableData(tableName, pageNum, PAGE_SIZE);
        setData(res.data);
        setColumns(res.columns);
        setTotalPages(res.total_pages);
        setTotalRows(res.total);
        setPage(pageNum);
        setGlobalFilter("");
      } catch {
        toast({ title: "Error de dades", description: "No s'han pogut obtenir els registres.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    loadPage(tableName, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    loadPage(selectedTable, newPage);
  };

  /* Build TanStack column definitions from column names */
  const tableColumns = useMemo<ColumnDef<any, any>[]>(
    () =>
      columns.map((col) => ({
        accessorKey: col,
        header: col.length > 40 ? col.slice(0, 38) + "…" : col,
        enableSorting: true,
      })),
    [columns]
  );

  /* Pretty-print table name */
  const prettyName = (t: string) =>
    t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <div className="p-2 bg-slate-800 rounded-lg">
          <Table2 size={18} className="text-slate-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Data Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Navega directament les taules de Supabase — paginació al servidor, {PAGE_SIZE} files per pàgina.
          </p>
        </div>
      </div>

      {/* Table selector */}
      <div className="flex gap-2 flex-wrap">
        {tables.length === 0 && !loading && (
          <p className="text-xs text-slate-500 bg-slate-800 px-3 py-2 rounded-lg">
            Cap taula trobada. Assegura't que el backend està actiu.
          </p>
        )}
        {tables.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={selectedTable === t ? "default" : "outline"}
            onClick={() => handleSelectTable(t)}
            className={
              selectedTable === t
                ? "bg-cyan-600 hover:bg-cyan-500 text-white border-0 text-xs h-8"
                : "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs h-8"
            }
          >
            <Database size={13} className="mr-1.5" />
            {prettyName(t)}
          </Button>
        ))}
      </div>

      {/* Content area */}
      {loading ? (
        <div className="py-28 flex flex-col items-center gap-4 bg-slate-900/40 border border-slate-800 rounded-xl">
          <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
          <p className="text-slate-400 text-sm">Sincronitzant amb Postgres…</p>
        </div>
      ) : selectedTable ? (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-medium text-slate-300">{prettyName(selectedTable)}</span>
            <span>·</span>
            <span>{totalRows.toLocaleString()} files totals</span>
            <span>·</span>
            <span>{columns.length} columnes</span>
            <span>·</span>
            <span>Pàgina {page} de {totalPages}</span>
          </div>

          <DynamicDataTable
            columns={tableColumns}
            data={data}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            serverPagination={{
              page,
              totalPages,
              totalRows,
              onPageChange: handlePageChange,
            }}
          />
        </>
      ) : (
        <div className="py-24 text-center border border-dashed border-slate-800 rounded-xl">
          <Database size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">Selecciona una taula per veure les dades.</p>
        </div>
      )}
    </div>
  );
}
