import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  FileSpreadsheet,
  Inbox,
  Loader2,
  Play,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  fetchARecords,
  replaceARecords,
  type BulkRow,
  type FetchRecordsResponse,
} from "@/lib/dns";

type Mode = "fetch" | "replace";

type UploadRow = BulkRow & { ip?: string };

interface ExportRow {
  domain: string;
  zone_id: string;
  email: string;
  api_key: string;
  IP: string;
  proxied?: string;
}

function splitSingleCellRow(value: string): string[] {
  if (value.includes(",")) return value.split(",").map((v) => v.trim());
  if (value.includes(";")) return value.split(";").map((v) => v.trim());
  if (value.includes("\t")) return value.split("\t").map((v) => v.trim());
  if (value.includes("|")) return value.split("|").map((v) => v.trim());
  return [value.trim()];
}

export default function BulkUpload({
  onSuccess,
  initialMode = "fetch",
}: {
  onSuccess?: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [previewRows, setPreviewRows] = useState<ExportRow[]>([]);
  const [downloadFileName, setDownloadFileName] = useState("cloudflare_a_records");

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const lowerName = f.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls") && !lowerName.endsWith(".csv")) {
      setParseError("Please upload .xlsx, .xls, or .csv file.");
      return;
    }

    setFile(f);
    setParseError(null);
    setPreviewRows([]);
    setProgressIdx(0);
    setDownloadFileName(`cloudflare_a_records_${Date.now()}`);

    try {
      let workbook: XLSX.WorkBook;
      if (lowerName.endsWith(".csv")) {
        workbook = XLSX.read(await f.text(), { type: "string" });
      } else {
        workbook = XLSX.read(await f.arrayBuffer(), { type: "array" });
      }

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setParseError("No worksheet found in uploaded file.");
        setRows([]);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(worksheet, {
        header: 1,
      });

      if (rawRows.length === 0) {
        setParseError("The file is empty.");
        setRows([]);
        return;
      }

      let skippedRows = 0;
      const parsed: UploadRow[] = rawRows
        .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
        .map((row) => row.map((cell) => String(cell ?? "").trim()))
        .map((cells) => (cells.length === 1 ? splitSingleCellRow(cells[0]) : cells))
        .filter((cells) => {
          const minCols = mode === "replace" ? 5 : 4;
          const ok = cells.length >= minCols;
          if (!ok) skippedRows += 1;
          return ok;
        })
        .map((cells) => ({
          domain: cells[0] ?? "",
          zone_id: cells[1] ?? "",
          email: cells[2] ?? "",
          api_key: cells[3] ?? "",
          ip: mode === "replace" ? (cells[4] ?? "") : undefined,
        }))
        .filter((r) => (mode === "replace"
          ? r.domain || r.zone_id || r.email || r.api_key || r.ip
          : r.domain || r.zone_id || r.email || r.api_key));

      if (parsed.length === 0) {
        setParseError(
          mode === "replace"
            ? "No valid rows found. Expected: domain, zone_id, email, api_key, IP"
            : "No valid rows found. Expected: domain, zone_id, email, api_key",
        );
        setRows([]);
        return;
      }

      setRows(parsed);
      toast.success(`Parsed ${parsed.length} row${parsed.length === 1 ? "" : "s"}.`);
      if (skippedRows > 0) {
        toast.warning(`Skipped ${skippedRows} invalid row${skippedRows === 1 ? "" : "s"}.`);
      }
    } catch (error: any) {
      setParseError(`Could not read file${error?.message ? ` (${error.message})` : ""}`);
      setRows([]);
    }
  }, [mode]);

  function resetUpload() {
    setFile(null);
    setRows([]);
    setPreviewRows([]);
    setParseError(null);
    setProgressIdx(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function runBulk() {
    if (rows.length === 0) return;
    setProcessing(true);
    setProgressIdx(0);

    try {
      if (mode === "fetch") {
        const inputs = rows.map((row) => ({
          domain: row.domain,
          zoneId: row.zone_id,
          email: row.email,
          apiKey: row.api_key,
        }));

        const responses = (await fetchARecords(inputs as any)) as FetchRecordsResponse[];
        const outputRows: ExportRow[] = responses.map((response, index) => {
          const source = rows[index];
          const ipOrError =
            response.success && response.records.length > 0
              ? response.records.map((record) => record.content).join(", ")
              : response.error || "Cloudflare API error";

          return {
            domain: source.domain,
            zone_id: source.zone_id,
            email: source.email,
            api_key: source.api_key,
            IP: ipOrError,
          };
        });

        setPreviewRows(outputRows);

        const errors = responses.filter((r) => !r.success).length;
        if (errors === 0) toast.success(`Fetched A records for all ${rows.length} domains.`);
        else toast.warning(`Fetch completed with ${errors} errors.`);
      } else {
        const responses = await replaceARecords(
          rows.map((row) => ({
            domain: row.domain,
            zoneId: row.zone_id,
            email: row.email,
            apiKey: row.api_key,
            ip: row.ip || "",
          })),
        );

        const outputRows: ExportRow[] = responses.map((response, index) => {
          const source = rows[index];
          return {
            domain: source.domain,
            zone_id: source.zone_id,
            email: source.email,
            api_key: source.api_key,
            IP: response.success ? response.ip : response.error || "Cloudflare API error",
            proxied: response.success ? String(response.proxied ?? false) : "unknown",
          };
        });

        setPreviewRows(outputRows);

        const errors = responses.filter((r) => !r.success).length;
        if (errors === 0) toast.success(`Updated A records for all ${rows.length} domains.`);
        else toast.warning(`Update completed with ${errors} errors.`);
      }

      setProgressIdx(rows.length);
      if (onSuccess) onSuccess();
    } catch {
      toast.error(mode === "fetch" ? "Bulk fetch failed" : "Bulk update failed");
    } finally {
      setProcessing(false);
    }
  }

  function downloadPreview() {
    if (previewRows.length === 0) return;
    const sanitized = downloadFileName.trim() || "cloudflare_a_records";
    const finalName = sanitized.toLowerCase().endsWith(".xlsx") ? sanitized : `${sanitized}.xlsx`;

    const header = mode === "replace"
      ? ["domain", "zone_id", "email", "api_key", "IP", "proxied"]
      : ["domain", "zone_id", "email", "api_key", "IP"];

    const worksheet = XLSX.utils.json_to_sheet(previewRows, { header });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "results");
    XLSX.writeFile(workbook, finalName);

    resetUpload();
    setDownloadFileName("cloudflare_a_records");
    toast.success("Sheet downloaded.");
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card transition-all hover:shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>Bulk DNS Operations</CardTitle>
              <CardDescription>
                {mode === "fetch"
                  ? "Feature 1: Upload headerless rows as domain, zone_id, email, api_key to fetch current A record IPs."
                  : "Feature 2: Upload headerless rows as domain, zone_id, email, api_key, IP to update A records and return proxied."}
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant={mode === "fetch" ? "cloudflare" : "outline"}
                  size="sm"
                  disabled={processing}
                  onClick={() => {
                    setMode("fetch");
                    resetUpload();
                  }}
                >
                  1. Fetch A Records
                </Button>
                <Button
                  variant={mode === "replace" ? "cloudflare" : "outline"}
                  size="sm"
                  disabled={processing}
                  onClick={() => {
                    setMode("replace");
                    resetUpload();
                  }}
                >
                  2. Update A Records
                </Button>
              </div>
            </div>
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50",
              )}
            >
              <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="mb-4 rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
                <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="mb-1 text-sm font-medium">Click or drag file here</p>
              <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv</p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {rows.length} rows found
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetUpload} disabled={processing}>
                Change
              </Button>
            </div>
          )}

          {parseError && (
            <Alert variant="destructive" className="animate-in fade-in zoom-in-95 duration-200">
              <Inbox className="h-4 w-4" />
              <AlertTitle>Parse error</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          <Button
            variant="cloudflare"
            className="w-full"
            disabled={rows.length === 0 || processing}
            onClick={runBulk}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing {progressIdx}/{rows.length}...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {mode === "fetch" ? `Fetch ${rows.length} Domains` : `Update ${rows.length} Domains`}
              </>
            )}
          </Button>

          {processing && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mode === "fetch" ? "Bulk fetch in progress..." : "Bulk update in progress..."}</span>
                <span>{Math.round((progressIdx / rows.length) * 100)}%</span>
              </div>
              <Progress value={(progressIdx / rows.length) * 100} className="h-2" />
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full sm:max-w-sm space-y-1.5">
                  <p className="text-sm font-medium">Preview before download</p>
                  <Input
                    value={downloadFileName}
                    onChange={(e) => setDownloadFileName(e.target.value)}
                    placeholder="Enter file name"
                  />
                </div>
                <Button variant="cloudflare" onClick={downloadPreview}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Sheet
                </Button>
              </div>
              <div className="max-h-80 overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Zone ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>IP</TableHead>
                      {mode === "replace" && <TableHead>Proxied</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, index) => (
                      <TableRow key={`${row.domain}-${index}`}>
                        <TableCell>{row.domain}</TableCell>
                        <TableCell>{row.zone_id}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell className="font-mono text-xs">{row.api_key}</TableCell>
                        <TableCell>{row.IP}</TableCell>
                        {mode === "replace" && <TableCell>{row.proxied}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
