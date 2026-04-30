import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import BulkUpload from "@/components/BulkUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchHistory, type DnsRecord } from "@/lib/dns";
import * as XLSX from "xlsx";

type Mode = "bulk" | null;
type BulkMode = "fetch" | "replace";

interface HistoryItem {
  _id: string;
  domain: string;
  zoneId: string;
  records: DnsRecord[];
  fetchedAt: string;
}

export default function Dashboard() {
  const [mode, setMode] = useState<Mode>(null);
  const [bulkMode, setBulkMode] = useState<BulkMode>("fetch");
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === null) {
      loadRecentHistory();
    }
  }, [mode]);

  async function loadRecentHistory() {
    try {
      const data = await fetchHistory();
      setRecentHistory(data.slice(0, 5)); // Show only top 5 recent ones
    } catch (error) {
      console.error("Failed to load recent history", error);
    }
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              DNS A Record Fetcher
            </h1>
            <p className="text-muted-foreground">
              {mode === null
                ? "Upload a spreadsheet to process many zones at once."
                : "Upload a spreadsheet to process many zones at once."}
            </p>
          </div>
          <div className="flex gap-2">
            {mode === null && (
              <>
                <Button
                  variant="cloudflare"
                  onClick={() => {
                    setBulkMode("fetch");
                    setMode("bulk");
                  }}
                >
                  Fetch A Records
                </Button>
                <Button
                  variant="cloudflare"
                  onClick={() => {
                    setBulkMode("replace");
                    setMode("bulk");
                  }}
                >
                  Update A Records
                </Button>
              </>
            )}
            {mode !== null && (
              <Button variant="ghost" onClick={() => setMode(null)}>
                <ArrowLeft className="h-4 w-4" />
                Back to options
              </Button>
            )}
          </div>
        </div>

        {mode === null && (
          <>
            {recentHistory.length > 0 && (
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-xl">Recent Activity</CardTitle>
                  <CardDescription>
                    Your latest lookups stored in the database.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Fetched At</TableHead>
                          <TableHead className="text-right">Export</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentHistory.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell className="font-medium">{item.domain}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {item.records.length} A records
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(item.fetchedAt).toLocaleDateString()}
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
                </CardContent>
              </Card>
            )}
          </>
        )}

        {mode === "bulk" && (
          <div className="animate-fade-in">
            <BulkUpload initialMode={bulkMode} onSuccess={loadRecentHistory} />
          </div>
        )}
      </div>
    </Layout>
  );
}
