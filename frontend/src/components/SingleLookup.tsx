import { useState } from "react";
import { Eye, EyeOff, Loader2, Search, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { fetchARecords, type DnsRecord } from "@/lib/dns";

export default function SingleLookup() {
  const [domain, setDomain] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<DnsRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  async function handleFetch() {
    if (!domain || !zoneId || !email || !apiKey) {
      toast.error("Please fill in all four fields");
      return;
    }
    setLoading(true);
    setError(null);
    setRecords(null);
    setTouched(true);

    const res = await fetchARecords({ domain, zoneId, email, apiKey });
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to fetch records");
      toast.error(`Lookup failed for ${domain}`);
      return;
    }
    setRecords(res.records);
    toast.success(
      `Fetched ${res.records.length} A record${res.records.length === 1 ? "" : "s"} for ${domain}`,
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Single Domain Lookup</CardTitle>
        <CardDescription>
          Fetch A records for one Cloudflare zone using your credentials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain name</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zoneId">Zone ID</Label>
            <Input
              id="zoneId"
              placeholder="e.g. 023e105f4ecef8ad9ca31a8372d0c353"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfEmail">Email</Label>
            <Input
              id="cfEmail"
              type="email"
              placeholder="account@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (Global)</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                placeholder="Your Cloudflare Global API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your credentials are never stored or logged.
            </p>
          </div>
        </div>

        <Button
          variant="cloudflare"
          className="w-full"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching A records...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Fetch A Records
            </>
          )}
        </Button>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {records && records.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="font-normal">
                {records.length} A record{records.length === 1 ? "" : "s"} found
              </Badge>
              <span className="text-xs text-muted-foreground">
                Domain: <span className="font-medium text-foreground">{domain}</span>
              </span>
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Content (IP)</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead>Proxied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, i) => (
                    <TableRow key={`${r.name}-${i}`}>
                      <TableCell>
                        <Badge variant="outline">{r.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-sm">{r.content}</TableCell>
                      <TableCell>{r.ttl === 1 ? "Auto" : r.ttl}</TableCell>
                      <TableCell>
                        {r.proxied ? (
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                            Proxied
                          </Badge>
                        ) : (
                          <Badge variant="outline">DNS only</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {touched && !loading && !error && records && records.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No A records found for this zone.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
