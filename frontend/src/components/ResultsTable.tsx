import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BulkResultRow } from "@/lib/dns";

export default function ResultsTable({ rows }: { rows: BulkResultRow[] }) {
  if (rows.length === 0) return null;

  // Group consecutive rows by domain for alternating shading.
  const domains: string[] = [];
  rows.forEach((r) => {
    if (!domains.includes(r.domain)) domains.push(r.domain);
  });
  const domainShade = new Map<string, boolean>();
  domains.forEach((d, i) => domainShade.set(d, i % 2 === 1));

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>TTL</TableHead>
            <TableHead>Proxied</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const shaded = domainShade.get(r.domain);
            return (
              <TableRow
                key={`${r.domain}-${i}`}
                className={cn(shaded && "bg-muted/40 hover:bg-muted/60")}
              >
                <TableCell className="font-medium">{r.domain}</TableCell>
                <TableCell>
                  {r.type ? <Badge variant="outline">{r.type}</Badge> : "—"}
                </TableCell>
                <TableCell>{r.name || "—"}</TableCell>
                <TableCell className="font-mono text-sm">
                  {r.content || "—"}
                </TableCell>
                <TableCell>
                  {r.ttl === "" ? "—" : r.ttl === 1 ? "Auto" : r.ttl}
                </TableCell>
                <TableCell>
                  {r.proxied === "" ? (
                    "—"
                  ) : r.proxied === true ? (
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                      Proxied
                    </Badge>
                  ) : (
                    <Badge variant="outline">DNS only</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {r.status === "Success" ? (
                    <Badge className="bg-success text-success-foreground hover:bg-success/90">
                      Success
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      title={r.error}
                      className="cursor-help"
                    >
                      Error
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
