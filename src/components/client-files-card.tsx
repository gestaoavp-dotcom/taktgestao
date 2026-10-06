"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import type { ClientFile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { deleteFile, getFileUrl, registerFile } from "@/app/(dashboard)/clientes/[id]/actions";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ClientFilesCard({
  clientId,
  files,
}: {
  clientId: string;
  files: ClientFile[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const path = `${clientId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("client-files")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await registerFile({
      clientId,
      name: file.name,
      path,
      size: file.size,
    });

    if (result && "error" in result) setError(result.error);
    if (inputRef.current) inputRef.current.value = "";
    setUploading(false);
  }

  async function handleDownload(path: string) {
    const url = await getFileUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else setError("Não consegui gerar o link do arquivo.");
  }

  return (
    <section className="rounded-lg bg-panel p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-ink">Arquivos</h2>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line py-4 text-sm font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent-ink">
        <Upload className="h-4 w-4" />
        {uploading ? "Enviando..." : "Enviar arquivo"}
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="sr-only"
        />
      </label>

      {error && (
        <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      )}

      {files.length > 0 ? (
        <ul className="mt-4 divide-y divide-navy/[.06]">
          {files.map((file) => (
            <li key={file.id} className="group flex items-center gap-3 py-2.5">
              <FileText className="h-4 w-4 flex-shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-ink-3">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(file.path)}
                aria-label={`Baixar ${file.name}`}
                className="rounded p-1.5 text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
              >
                <Download className="h-4 w-4" />
              </button>
              <form action={deleteFile}>
                <input type="hidden" name="id" value={file.id} />
                <input type="hidden" name="path" value={file.path} />
                <input type="hidden" name="client_id" value={clientId} />
                <button
                  type="submit"
                  aria-label={`Excluir ${file.name}`}
                  className="rounded p-1.5 text-ink-3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-3">Nenhum arquivo enviado ainda.</p>
      )}
    </section>
  );
}
