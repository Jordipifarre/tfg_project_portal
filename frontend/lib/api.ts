import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export interface ChatResponse { user: string; ai: string; }
export interface dbChatResponse { user: string; ai_analyst: string; }
export interface TableListResponse { tables: string[]; }
export interface TableDataResponse {
  columns: string[]; data: any[]; total: number;
  page: number; page_size: number; total_pages: number;
}

// --- Stats interfaces ---
export interface OverviewStats {
  tables: { penal: string | null; airports: string | null; hate_crimes: string | null; transport: string | null };
  penal?: { total_known: number; total_resolved: number; total_arrests: number };
  airports?: { total: number };
  hate_crimes?: { total_incidents: number; total_victims: number };
  transport?: { total: number };
}
export interface PenalStats {
  trend: { year: string; known: number; resolved: number; arrests: number }[];
  top_crimes: { type: string; total: number }[];
}
export interface AirportStats {
  trend: { year: string; total: number }[];
  by_airport: { airport: string; total: number }[];
  by_type: { type: string; total: number }[];
}
export interface HateCrimesStats {
  trend: { year: string; incidents: number; victims: number }[];
  by_channel: { channel: string; total: number }[];
  by_scope: { scope: string; total: number }[];
}
export type MapGranularity = "provincia" | "comarca";
export interface HateCrimesMapStats {
  regions: { name: string; incidents: number; victims: number }[];
  granularity: MapGranularity;
}
export interface PenalMapRegion {
  name: string;
  known: number;
  resolved: number;
  arrests: number;
}
export interface PenalMapStats {
  regions: PenalMapRegion[];
  filter_options: {
    years: string[];
    months: { num: number; name: string }[];
    crime_types: string[];
  };
}
export interface TransportMapRegion {
  name: string;
  bus: number;
  metro: number;
  taxi: number;
  train: number;
  total: number;
}
export interface TransportMapStats {
  regions: TransportMapRegion[];
  filter_options: { years: string[] };
}
export interface TransportStats {
  trend: { year: string; bus?: number; metro?: number; taxi?: number; train?: number }[];
  by_mode: { mode: string; total: number }[];
}

export async function askAI(message: string): Promise<ChatResponse> {
  const r = await api.post("/chat/ask", { message }); return r.data;
}
export async function queryDatabase(message: string): Promise<dbChatResponse> {
  const r = await api.post("/chat/query-db", { message }); return r.data;
}
export async function fetchTables(): Promise<TableListResponse> {
  const r = await api.get("/data/tables"); return r.data;
}
export async function fetchTableData(tableName: string, page = 1, pageSize = 20): Promise<TableDataResponse> {
  const r = await api.get(`/data/tables/${tableName}`, { params: { page, page_size: pageSize } });
  return r.data;
}

// --- Stats API calls ---
export async function fetchOverviewStats(): Promise<OverviewStats> {
  const r = await api.get("/data/stats/overview"); return r.data;
}
export async function fetchPenalStats(): Promise<PenalStats> {
  const r = await api.get("/data/stats/penal"); return r.data;
}
export async function fetchAirportStats(): Promise<AirportStats> {
  const r = await api.get("/data/stats/airports"); return r.data;
}
export async function fetchHateCrimesStats(): Promise<HateCrimesStats> {
  const r = await api.get("/data/stats/hate-crimes"); return r.data;
}
export async function fetchHateCrimesMapStats(granularity: MapGranularity = "comarca"): Promise<HateCrimesMapStats> {
  const r = await api.get("/data/stats/hate-crimes/map", { params: { granularity } });
  return r.data;
}
export async function fetchPenalMapStats(params?: {
  year?: string;
  month?: string;
  crime_type?: string;
}): Promise<PenalMapStats> {
  const r = await api.get("/data/stats/penal/map", { params });
  return r.data;
}
export async function fetchTransportMapStats(year?: string): Promise<TransportMapStats> {
  const r = await api.get("/data/stats/transport/map", { params: year ? { year } : {} });
  return r.data;
}
export async function fetchTransportStats(): Promise<TransportStats> {
  const r = await api.get("/data/stats/transport"); return r.data;
}
