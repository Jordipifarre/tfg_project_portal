"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchTables, fetchTableData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Table2 } from "lucide-react";
import { DynamicDataTable } from "@/components/tables/DynamicDataTable";
import { ColumnDef } from "@tanstack/react-table";

const PAGE_SIZE = 50;

export default function TablesPage() {
  const [tables, setTables]             = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData]                 = useState<any[]>([]);
  const [columns, setColumns]           = useState<string[]>([]);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalRows, setTotalRows]       = useState(0);
  const [loading, setLoading]           = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchTables()
      .then((res) => setTables(res.tables.filter((t: string) => !["documents", "document_chunks"].includes(t))))
      .catch(() =>
        toast({ title: "Error de connexió", description: "No s'han pogut obtenir les taules.", variant: "destructive" })
      );
  }, [toast]);

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

  const tableColumns = useMemo<ColumnDef<any, any>[]>(
    () =>
      columns.map((col) => ({
        accessorKey: col,
        header: col.length > 40 ? col.slice(0, 38) + "…" : col,
        enableSorting: true,
      })),
    [columns]
  );

  const prettyName = (t: string) =>
    t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
        <div className="p-2 bg-[#1a3a52]/10 rounded-lg">
          <Table2 size={18} className="text-[#1a3a52]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Taules de Dades</h1>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Consulta les dades de seguretat disponibles — selecciona una taula per veure els registres.
          </p>
        </div>
      </div>

      {/* Table selector */}
      <div className="flex gap-2 flex-wrap">
        {tables.length === 0 && !loading && (
          <p className="text-xs text-[#6b7280] bg-white border border-[#e5e5e5] px-3 py-2 rounded-lg">
            Cap taula trobada. Assegura&apos;t que el backend està actiu.
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
                ? "bg-[#1a3a52] hover:bg-[#0f2d42] text-white border-0 text-xs h-8"
                : "border-[#e5e5e5] bg-white hover:bg-gray-50 text-[#475569] text-xs h-8"
            }
          >
            <Database size={13} className="mr-1.5" />
            {prettyName(t)}
          </Button>
        ))}
      </div>

      {/* Content area */}
      {loading ? (
        <div className="py-28 flex flex-col items-center gap-4 bg-white border border-[#e5e5e5] rounded-lg shadow-sm">
          <Loader2 className="animate-spin text-[#1a3a52] w-8 h-8" />
          <p className="text-[#6b7280] text-sm">Sincronitzant amb Postgres…</p>
        </div>
      ) : selectedTable ? (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-3 text-xs text-[#6b7280]">
            <span className="font-semibold text-[#1f2937]">{prettyName(selectedTable)}</span>
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
        <div className="py-24 text-center border border-dashed border-[#e5e5e5] rounded-lg bg-white">
          <Database size={32} className="mx-auto text-[#d1d5db] mb-3" />
          <p className="text-[#6b7280] text-sm">Selecciona una taula per veure les dades.</p>
        </div>
      )}
    </div>
  );
}
