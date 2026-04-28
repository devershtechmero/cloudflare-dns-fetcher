import type { FastifyPluginAsync } from "fastify";
import { getMongoDb } from "../db/mongodb.js";

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
};
