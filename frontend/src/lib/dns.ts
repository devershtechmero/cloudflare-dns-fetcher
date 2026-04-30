export interface DnsRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

export interface FetchRecordsInput {
  domain: string;
  zoneId: string;
  email: string;
  apiKey: string;
}
export interface ReplaceARecordInput extends FetchRecordsInput {
  ip: string;
}

export interface FetchRecordsResponse {
  success: boolean;
  domain: string;
  records: DnsRecord[];
  error?: string;
}
export interface ReplaceARecordResponse {
  success: boolean;
  domain: string;
  ip: string;
  proxied?: boolean;
  updatedCount: number;
  error?: string;
}

const API_BASE = "/api/dns";

export async function fetchARecords(
  input: FetchRecordsInput | FetchRecordsInput[],
): Promise<FetchRecordsResponse | FetchRecordsResponse[]> {
  try {
    const response = await fetch(`${API_BASE}/fetch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (Array.isArray(input)) {
      return input.map((i) => ({
        success: false,
        domain: i.domain,
        records: [],
        error: error.message || "Network error",
      }));
    }
    return {
      success: false,
      domain: (input as FetchRecordsInput).domain,
      records: [],
      error: error.message || "Network error",
    };
  }
}

export async function replaceARecords(
  input: ReplaceARecordInput[],
): Promise<ReplaceARecordResponse[]> {
  try {
    const response = await fetch(`${API_BASE}/replace-a-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    return input.map((i) => ({
      success: false,
      domain: i.domain,
      ip: i.ip,
      updatedCount: 0,
      error: error.message || "Network error",
    }));
  }
}

export async function fetchHistory() {
  const response = await fetch(`${API_BASE}/history`);
  return await response.json();
}

export async function clearHistory() {
  const response = await fetch(`${API_BASE}/history`, {
    method: "DELETE",
  });
  return await response.json();
}

export interface BulkRow {
  domain: string;
  zone_id: string;
  email: string;
  api_key: string;
}

export interface BulkResultRow {
  domain: string;
  type: string;
  name: string;
  content: string;
  ttl: number | string;
  proxied: boolean | string;
  status: "Success" | "Error";
  error?: string;
}
