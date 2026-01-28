"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"; // 1. Eliminat ListFilter

// Definim un tipus per a les files de la taula
type TableRowData = Record<string, string | number | boolean | null>;

export default function ExplorerPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData] = useState<TableRowData[]>([]); // 2. Canviat any[] per TableRowData[]
  const [columns, setColumns] = useState<string[]>([]);
  
  // ESTATS DE CONTROL
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 20; // 3. Canviat a constant ja que no usem setPageSize de moment
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/data/tables")
      .then(res => setTables(res.data.tables))
      .catch(err => console.error("Error carregant taules", err));
  }, []);

  const fetchTableData = async (tableName: string, pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8000/data/tables/${tableName}`, {
        params: { page: pageNum, page_size: pageSize }
      });
      
      setData(res.data.data);
      setColumns(res.data.columns);
      setTotalPages(res.data.total_pages);
      setTotalRows(res.data.total);
      setPage(pageNum);
      setSelectedTable(tableName);
    } catch (error) {
      console.error("Error carregant dades", error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Explorador de Dades</h1>
          <p className="text-slate-500 text-sm">Consulta les taules de Supabase en temps real.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tables.map(t => (
          <Button 
            key={t} 
            variant={selectedTable === t ? "default" : "outline"}
            onClick={() => fetchTableData(t, 1)}
            className="capitalize"
          >
            {t.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {selectedTable && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden border-slate-200">
          <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>Total: <b className="text-slate-900">{totalRows}</b> registres</span>
              <span className="w-px h-4 bg-slate-300"></span>
              <span>Pàgina <b>{page}</b> de <b>{totalPages}</b></span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" size="sm" 
                disabled={page <= 1 || loading}
                onClick={() => fetchTableData(selectedTable, page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button 
                variant="outline" size="sm" 
                disabled={page >= totalPages || loading}
                onClick={() => fetchTableData(selectedTable, page + 1)}
              >
                Següent <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="relative overflow-x-auto max-h-[600px]">
            {loading ? (
               <div className="p-32 flex flex-col items-center gap-2">
                 <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                 <p className="text-slate-400 text-sm font-medium">Sincronitzant amb la DB...</p>
               </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    {columns.map(col => (
                      <TableHead key={col} className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">
                        {col.replace(/_/g, " ")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                      {columns.map(col => (
                        <TableCell key={col} className="text-sm py-3 text-slate-600">
                          {row[col]?.toString() || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}