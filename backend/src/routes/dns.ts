import type { FastifyPluginAsync } from "fastify";

interface DnsRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

interface FetchInput {
  domain: string;
  zoneId: string;
  email: string;
  apiKey: string;
}

interface ReplaceInput extends FetchInput {
  ip: string;
}

function isValidIpv4(value: string): boolean {
  const ipv4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;
  return ipv4.test(value.trim());
}

export const dnsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/fetch", async (request, reply) => {
    const body = request.body as any;
    const inputs = Array.isArray(body) ? body : [body];

    const results = [];

    for (const input of inputs) {
      const { domain, zoneId, email, apiKey } = input as FetchInput;

      if (!domain || !zoneId || !email || !apiKey) {
        results.push({ success: false, domain: domain || "unknown", error: "Missing required fields" });
        continue;
      }

      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(domain)}`,
          {
            headers: {
              "X-Auth-Email": email,
              "X-Auth-Key": apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json() as any;

        if (!data.success) {
          const errorMsg = data.errors?.[0]?.message || "Cloudflare API error";
          results.push({ success: false, domain, error: errorMsg });
          continue;
        }

        const records: DnsRecord[] = data.result.map((r: any) => ({
          type: r.type,
          name: r.name,
          content: r.content,
          ttl: r.ttl,
          proxied: r.proxied,
        }));

        results.push({ success: true, domain, records });
      } catch (error: any) {
        results.push({
          success: false,
          domain,
          error: error.message || "Failed to fetch records",
        });
      }
    }

    return Array.isArray(body) ? results : results[0];
  });

  fastify.get("/history", async () => {
    return [];
  });

  fastify.delete("/history", async () => {
    return { success: true };
  });

  fastify.post("/replace-a-records", async (request) => {
    const body = request.body as any;
    const inputs = Array.isArray(body) ? body : [body];
    const results = [];

    for (const input of inputs) {
      const { domain, zoneId, email, apiKey, ip } = input as ReplaceInput;

      if (!domain || !zoneId || !email || !apiKey || !ip) {
        results.push({
          success: false,
          domain: domain || "unknown",
          ip: ip || "",
          updatedCount: 0,
          error: "Missing required fields",
        });
        continue;
      }

      if (!isValidIpv4(ip)) {
        results.push({
          success: false,
          domain,
          ip,
          updatedCount: 0,
          error: "Invalid IPv4 address",
        });
        continue;
      }

      try {
        const listResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(domain)}`,
          {
            headers: {
              "X-Auth-Email": email,
              "X-Auth-Key": apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        const listData = await listResponse.json() as any;
        if (!listData.success) {
          results.push({
            success: false,
            domain,
            ip,
            updatedCount: 0,
            error: listData.errors?.[0]?.message || "Cloudflare API error",
          });
          continue;
        }

        const records = Array.isArray(listData.result) ? listData.result : [];
        if (records.length === 0) {
          results.push({
            success: false,
            domain,
            ip,
            updatedCount: 0,
            error: "No A records found for this domain",
          });
          continue;
        }

        let updatedCount = 0;
        let lastKnownProxied: boolean | null = null;

        for (const record of records) {
          const updateResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`,
            {
              method: "PUT",
              headers: {
                "X-Auth-Email": email,
                "X-Auth-Key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "A",
                name: record.name,
                content: ip.trim(),
                ttl: record.ttl,
                proxied: Boolean(record.proxied),
              }),
            }
          );

          const updateData = await updateResponse.json() as any;
          if (updateData.success) {
            updatedCount += 1;
            lastKnownProxied =
              typeof updateData?.result?.proxied === "boolean"
                ? updateData.result.proxied
                : Boolean(record.proxied);
          }
        }

        if (updatedCount === 0) {
          results.push({
            success: false,
            domain,
            ip,
            updatedCount,
            error: "Failed to update A records",
          });
          continue;
        }

        results.push({
          success: true,
          domain,
          ip,
          proxied: lastKnownProxied ?? false,
          updatedCount,
        });
      } catch (error: any) {
        results.push({
          success: false,
          domain,
          ip,
          updatedCount: 0,
          error: error.message || "Failed to replace A records",
        });
      }
    }

    return results;
  });
};
