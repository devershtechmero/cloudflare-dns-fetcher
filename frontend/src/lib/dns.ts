import { supabase } from "@/integrations/supabase/client";

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

export interface FetchRecordsResponse {
  success: boolean;
  domain: string;
  records: DnsRecord[];
  error?: string;
}

export async function fetchARecords(
  input: FetchRecordsInput,
): Promise<FetchRecordsResponse> {
  const { data, error } = await supabase.functions.invoke<FetchRecordsResponse>(
    "fetch-records",
    { body: input },
  );

  if (error) {
    return {
      success: false,
      domain: input.domain,
      records: [],
      error: error.message || "Network error",
    };
  }
  if (!data) {
    return {
      success: false,
      domain: input.domain,
      records: [],
      error: "Empty response from server",
    };
  }
  return data;
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
