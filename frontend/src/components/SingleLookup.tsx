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

export default function SingleLookup({ onSuccess }: { onSuccess?: () => void }) {
  const [domain, setDomain] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    if (!domain || !zoneId || !email || !apiKey) {
      toast.error("Please fill in all four fields");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetchARecords({ domain, zoneId, email, apiKey });
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to fetch records");
      toast.error(`Lookup failed for ${domain}`);
      return;
    }

    toast.success(`DNS records for ${domain} have been saved to the database.`);
    if (onSuccess) onSuccess();
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Single Domain Lookup</CardTitle>
        <CardDescription>
          Fetch and save A records for one Cloudflare zone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* ... existing inputs ... */}
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
              Saving to database...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Fetch & Save Records
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Operation failed</AlertTitle>
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
