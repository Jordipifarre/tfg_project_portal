"use client";

import { useState, useEffect } from "react";
import { fetchStorageFiles, getStorageSignedUrl, StorageFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ExternalLink, Download } from "lucide-react";

export default function ArticlesPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStorageFiles()
      .then((res) =>
        setFiles(res.files.filter((f) => f.name.toLowerCase().endsWith(".pdf")))
      )
      .catch(() =>
        toast({
          title: "Error de connexió",
          description: "No s'han pogut obtenir els documents.",
          variant: "destructive",
        })
      )
      .finally(() => setLoading(false));
  }, [toast]);

  const handleAction = async (file: StorageFile, download: boolean) => {
    setLoadingFile(file.name);
    try {
      const { signed_url } = await getStorageSignedUrl(file.name);
      if (download) {
        const a = document.createElement("a");
        a.href = signed_url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(signed_url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast({
        title: "Error",
        description: "No s'ha pogut obtenir l'URL del fitxer.",
        variant: "destructive",
      });
    } finally {
      setLoadingFile(null);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ca-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
        <div className="p-2 bg-[#1a3a52]/10 rounded-lg">
          <FileText size={18} className="text-[#1a3a52]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Articles i Informes</h1>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Documents i informes de referència — visualitza&apos;ls o descarrega&apos;ls.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-28 flex flex-col items-center gap-4 bg-white border border-[#e5e5e5] rounded-lg shadow-sm">
          <Loader2 className="animate-spin text-[#1a3a52] w-8 h-8" />
          <p className="text-[#6b7280] text-sm">Carregant documents…</p>
        </div>
      ) : files.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-[#e5e5e5] rounded-lg bg-white">
          <FileText size={32} className="mx-auto text-[#d1d5db] mb-3" />
          <p className="text-[#6b7280] text-sm">Cap document PDF trobat al bucket.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[#6b7280]">
            {files.length} document{files.length !== 1 ? "s" : ""} trobat{files.length !== 1 ? "s" : ""}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => {
              const busy = loadingFile === file.name;
              return (
                <div
                  key={file.name}
                  className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3"
                >
                  {/* Icon + filename */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-50 rounded-lg shrink-0">
                      <FileText size={20} className="text-red-500" />
                    </div>
                    <p className="text-sm font-medium text-[#1f2937] break-words leading-snug line-clamp-3">
                      {file.name}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-[#9ca3af] space-y-0.5">
                    <p>{formatSize(file.metadata?.size)}</p>
                    <p>{formatDate(file.updated_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs border-[#e5e5e5] text-[#475569] hover:bg-gray-50"
                      onClick={() => handleAction(file, false)}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 size={12} className="animate-spin mr-1" />
                      ) : (
                        <ExternalLink size={12} className="mr-1" />
                      )}
                      Visualitza
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-[#1a3a52] hover:bg-[#0f2d42] text-white border-0"
                      onClick={() => handleAction(file, true)}
                      disabled={busy}
                    >
                      <Download size={12} className="mr-1" />
                      Descarrega
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
