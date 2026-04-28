import { useMemo } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { BulkResultRow } from "@/lib/dns";

export default function ExportButton({ rows }: { rows: BulkResultRow[] }) {
  const disabled = rows.length === 0;

  const filename = useMemo(() => {
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    return `dns-results-${ts}.xlsx`;
  }, [rows.length]);

  function handleExport() {
    const exportRows = rows.map((r) => ({
      Domain: r.domain,
      "Record Type": r.type,
      Name: r.name,
      IP: r.content,
      TTL: r.ttl,
      Proxied: r.proxied,
      Status: r.status,
      Error: r.error ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 28 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DNS Results");
    XLSX.writeFile(wb, filename);
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Download Results as Excel
    </Button>
  );
}
