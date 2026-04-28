import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchHistory, clearHistory, type DnsRecord } from "@/lib/dns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface HistoryItem {
  _id: string;
  domain: string;
  zoneId: string;
  records: DnsRecord[];
  fetchedAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!confirm("Are you sure you want to clear all history?")) return;
    try {
      await clearHistory();
      setHistory([]);
      toast.success("History cleared");
    } catch (error) {
      toast.error("Failed to clear history");
    }
  }

  function downloadAll() {
    if (history.length === 0) return;

    const rows = history.flatMap((item) =>
      item.records.map((r) => ({
        Domain: item.domain,
        Type: r.type,
        Name: r.name,
        Content: r.content,
        TTL: r.ttl,
        Proxied: r.proxied,
        FetchedAt: new Date(item.fetchedAt).toLocaleString(),
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DNS History");
    XLSX.writeFile(wb, `dns_history_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Lookup History</h1>
            <p className="text-muted-foreground">
              Review and download your previous DNS A record lookups.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            {history.length > 0 && (
              <>
                <Button variant="outline" onClick={downloadAll}>
                  <Download className="mr-2 h-4 w-4" />
                  Download All
                </Button>
                <Button variant="destructive" onClick={handleClear}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear History
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Persisted Records</CardTitle>
            <CardDescription>
              All records stored in your MongoDB database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-md border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">No history found.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Records Found</TableHead>
                      <TableHead>Fetched At</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.domain}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.records.length} A records
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.fetchedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const ws = XLSX.utils.json_to_sheet(
                                item.records.map((r) => ({
                                  Type: r.type,
                                  Name: r.name,
                                  Content: r.content,
                                  TTL: r.ttl,
                                  Proxied: r.proxied,
                                }))
                              );
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, "DNS Records");
                              XLSX.writeFile(wb, `${item.domain}_dns.xlsx`);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
