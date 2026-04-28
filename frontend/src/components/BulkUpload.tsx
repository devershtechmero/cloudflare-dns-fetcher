import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Inbox,
  Loader2,
  Play,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchARecords, type BulkResultRow, type BulkRow } from "@/lib/dns";
import ResultsTable from "./ResultsTable";
import ExportButton from "./ExportButton";

const REQUIRED_COLUMNS = ["domain", "zone_id", "email", "api_key"] as const;

export default function BulkUpload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [results, setResults] = useState<BulkResultRow[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      toast.error("Please upload a .xlsx or .xls file");
      return;
    }
    setFile(f);
    setParseError(null);
    setResults([]);

    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: "",
      });

      if (raw.length === 0) {
        setParseError("The spreadsheet is empty.");
        setRows([]);
        return;
      }

      // Normalize keys: lowercase + trim + collapse spaces to underscore.
      const normalized = raw.map((row) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          const nk = String(k).trim().toLowerCase().replace(/\s+/g, "_");
          out[nk] = String(v ?? "").trim();
        }
        return out;
      });

      const firstKeys = Object.keys(normalized[0]);
      const missing = REQUIRED_COLUMNS.filter((c) => !firstKeys.includes(c));
      if (missing.length > 0) {
        setParseError(
          `Missing required column(s): ${missing.join(", ")}. Expected: domain, zone_id, email, api_key.`,
        );
        setRows([]);
        return;
      }

      const parsed: BulkRow[] = normalized
        .map((r) => ({
          domain: r.domain,
          zone_id: r.zone_id,
          email: r.email,
          api_key: r.api_key,
        }))
        .filter((r) => r.domain || r.zone_id || r.email || r.api_key);

      setRows(parsed);
      toast.success(`Parsed ${parsed.length} row${parsed.length === 1 ? "" : "s"}`);
    } catch {
      setParseError("Could not read the file. Is it a valid Excel workbook?");
      setRows([]);
    }
  }, []);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function processAll() {
    if (rows.length === 0) return;
    setProcessing(true);
    setResults([]);
    setProgressIdx(0);

    const aggregated: BulkResultRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      setProgressIdx(i + 1);
      const row = rows[i];

      if (!row.domain || !row.zone_id || !row.email || !row.api_key) {
        aggregated.push({
          domain: row.domain || `(row ${i + 1})`,
          type: "",
          name: "",
          content: "",
          ttl: "",
          proxied: "",
          status: "Error",
          error: "Missing one or more required values.",
        });
        setResults([...aggregated]);
        continue;
      }

      const res = await fetchARecords({
        domain: row.domain,
        zoneId: row.zone_id,
        email: row.email,
        apiKey: row.api_key,
      });

      if (!res.success) {
        aggregated.push({
          domain: row.domain,
          type: "",
          name: "",
          content: "",
          ttl: "",
          proxied: "",
          status: "Error",
          error: res.error || "Unknown error",
        });
      } else if (res.records.length === 0) {
        aggregated.push({
          domain: row.domain,
          type: "",
          name: "",
          content: "",
          ttl: "",
          proxied: "",
          status: "Success",
          error: "No A records found",
        });
      } else {
        for (const rec of res.records) {
          aggregated.push({
            domain: row.domain,
            type: rec.type,
            name: rec.name,
            content: rec.content,
            ttl: rec.ttl,
            proxied: rec.proxied,
            status: "Success",
          });
        }
      }
      setResults([...aggregated]);
    }

    setProcessing(false);
    const errors = aggregated.filter((r) => r.status === "Error").length;
    if (errors === 0) toast.success("All domains processed successfully");
    else toast.warning(`Completed with ${errors} error${errors === 1 ? "" : "s"}`);
  }

  const progressValue =
    rows.length > 0 ? Math.round((progressIdx / rows.length) * 100) : 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Bulk Excel Upload</CardTitle>
        <CardDescription>
          Upload an Excel file with multiple Cloudflare zones and fetch all A
          records at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-border bg-accent/40 p-3 text-xs text-accent-foreground">
          <span className="font-semibold">Expected columns:</span>{" "}
          <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono">
            domain
          </code>{" "}
          |{" "}
          <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono">
            zone_id
          </code>{" "}
          |{" "}
          <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono">
            email
          </code>{" "}
          |{" "}
          <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono">
            api_key
          </code>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background px-6 py-10 text-center transition-colors hover:border-primary hover:bg-accent/40",
            dragging && "drag-active",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <UploadCloud className="mb-3 h-10 w-10 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Drag & drop your Excel file here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse — .xlsx or .xls only
          </p>
        </div>

        {file && (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rows.length} valid row{rows.length === 1 ? "" : "s"} detected
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setRows([]);
                setResults([]);
                setParseError(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove
            </Button>
          </div>
        )}

        {parseError && (
          <Alert variant="destructive">
            <AlertTitle>Invalid file</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="cloudflare"
          className="w-full"
          disabled={rows.length === 0 || processing}
          onClick={processAll}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing {progressIdx} of {rows.length} domains...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Process All Domains
            </>
          )}
        </Button>

        {processing && (
          <div className="space-y-1.5">
            <Progress value={progressValue} />
            <p className="text-xs text-muted-foreground text-right">
              {progressValue}%
            </p>
          </div>
        )}

        {results.length > 0 ? (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {results.length}
                </span>{" "}
                result row{results.length === 1 ? "" : "s"} across{" "}
                <span className="font-medium text-foreground">
                  {new Set(results.map((r) => r.domain)).size}
                </span>{" "}
                domain(s).
              </p>
              <ExportButton rows={results} />
            </div>
            <ResultsTable rows={results} />
          </div>
        ) : (
          !processing && (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border p-8 text-center">
              <Inbox className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                No results yet
              </p>
              <p className="text-xs text-muted-foreground">
                Upload a spreadsheet and click Process All Domains to begin.
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
