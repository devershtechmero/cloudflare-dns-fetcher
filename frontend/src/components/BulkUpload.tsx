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
import { fetchARecords, type BulkRow, type FetchRecordsResponse } from "@/lib/dns";

interface ExportRow {
  domain: string;
  zone_id: string;
  email: string;
  api_key: string;
  IP: string;
}

export default function BulkUpload({ onSuccess }: { onSuccess?: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setParseError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setFile(f);
    setParseError(null);

    try {
      const data = await f.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(worksheet, {
        header: 1,
      });

      if (rawRows.length === 0) {
        setParseError("The Excel file is empty.");
        return;
      }

      const parsed: BulkRow[] = rawRows
        .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
        .map((row, index) => {
          if (row.length < 4) {
            throw new Error(`Row ${index + 1} is missing required values.`);
          }
          return {
            domain: String(row[0] ?? "").trim(),
            zone_id: String(row[1] ?? "").trim(),
            email: String(row[2] ?? "").trim(),
            api_key: String(row[3] ?? "").trim(),
          };
        })
        .filter((r) => r.domain || r.zone_id || r.email || r.api_key);

      if (parsed.length === 0) {
        setParseError("No valid rows found in the uploaded file.");
        return;
      }

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
    setProgressIdx(0);

    const inputs: BulkRow[] = rows.map((row) => ({
      domain: row.domain,
      zoneId: row.zone_id,
      email: row.email,
      apiKey: row.api_key,
    })) as any;

    try {
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

      const worksheet = XLSX.utils.json_to_sheet(outputRows, {
        header: ["domain", "zone_id", "email", "api_key", "IP"],
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "results");
      XLSX.writeFile(workbook, `cloudflare_a_records_${Date.now()}.xlsx`);

      const errors = responses.filter(r => !r.success).length;
      if (errors === 0) {
        toast.success(`All ${rows.length} domains processed. Output file downloaded.`);
      } else {
        toast.warning(`Processed with ${errors} errors. Check the last row in the downloaded file.`);
      }

      setProgressIdx(rows.length);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Bulk processing failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card transition-all hover:shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Bulk Import</CardTitle>
              <CardDescription>
                Upload a headerless Excel file in this exact order: domain, zone_id, email, api_key.
              </CardDescription>
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
                accept=".xlsx,.xls"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="mb-4 rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
                <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="mb-1 text-sm font-medium">Click or drag Excel file here</p>
              <p className="text-xs text-muted-foreground">.xlsx or .xls up to 10MB</p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setRows([]);
                }}
                disabled={processing}
              >
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
            onClick={processAll}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing {progressIdx}/{rows.length}...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Process {rows.length} Domains
              </>
            )}
          </Button>

          {processing && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Bulk operation in progress...</span>
                <span>{Math.round((progressIdx / rows.length) * 100)}%</span>
              </div>
              <Progress value={(progressIdx / rows.length) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
