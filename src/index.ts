#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const RATE_LIMIT_MS = 100;
let last = 0;

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) required");
  return { url, key };
}

async function sbFetch(path: string, method = "GET", body?: any, extra?: Record<string, string>): Promise<any> {
  const now = Date.now(); if (now - last < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  last = Date.now();
  const { url, key } = getConfig();
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${url}${path}`, opts);
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

const server = new McpServer({ name: "mcp-supabase", version: "1.0.0" });

server.tool("query", "Query rows from a table using PostgREST syntax.", {
  table: z.string(), select: z.string().default("*"),
  filter: z.string().optional().describe("PostgREST filter (e.g. 'id=eq.5', 'name=ilike.*test*')"),
  order: z.string().optional().describe("e.g. 'created_at.desc'"),
  limit: z.number().min(1).max(1000).default(20),
}, async ({ table, select, filter, order, limit }) => {
  const p = new URLSearchParams({ select, limit: String(limit) });
  if (filter) { const [k, v] = filter.split("=", 2); p.set(k, v); }
  if (order) p.set("order", order);
  const d = await sbFetch(`/rest/v1/${table}?${p}`, "GET", undefined, { Prefer: "count=exact" });
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

server.tool("insert", "Insert rows into a table.", {
  table: z.string(), rows: z.string().describe("JSON array of row objects"),
}, async ({ table, rows }) => {
  const d = await sbFetch(`/rest/v1/${table}`, "POST", JSON.parse(rows), { Prefer: "return=representation" });
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

server.tool("update", "Update rows in a table.", {
  table: z.string(), filter: z.string().describe("PostgREST filter (e.g. 'id=eq.5')"),
  data: z.string().describe("JSON object with fields to update"),
}, async ({ table, filter, data }) => {
  const [k, v] = filter.split("=", 2);
  const d = await sbFetch(`/rest/v1/${table}?${k}=${v}`, "PATCH", JSON.parse(data), { Prefer: "return=representation" });
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

server.tool("delete", "Delete rows from a table.", {
  table: z.string(), filter: z.string().describe("PostgREST filter"),
}, async ({ table, filter }) => {
  const [k, v] = filter.split("=", 2);
  const d = await sbFetch(`/rest/v1/${table}?${k}=${v}`, "DELETE", undefined, { Prefer: "return=representation" });
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

server.tool("rpc", "Call a Postgres function.", {
  functionName: z.string(), params: z.string().default("{}").describe("JSON params"),
}, async ({ functionName, params }) => {
  const d = await sbFetch(`/rest/v1/rpc/${functionName}`, "POST", JSON.parse(params));
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

server.tool("list_tables", "List tables (requires service key with pg_catalog access).", {}, async () => {
  const d = await sbFetch(`/rest/v1/rpc/`, "GET");
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
