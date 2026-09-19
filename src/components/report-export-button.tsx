"use client";

import { Download } from "lucide-react";

export function ReportExportButton({
  rows,
  filename,
}: {
  rows: Record<string, string | number>[];
  filename: string;
}) {
  function handleExport() {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(";"),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(";")),
    ].join("\n");

    // BOM so Excel opens the accents correctly.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!rows.length}
      className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </button>
  );
}
