import { WAREHOUSE_URL } from "@/config/env";
import type { EventType, MapEntry, MappingEntry, MmrStats, OpenerReplaysRequest, OpenerReplaysResponse, OpenersParams, OpenersResponse, PlayerEntry, ReplayMetadata, SearchRequest, SearchResponse, SeasonEntry, WarehouseHealth, WarehouseStats } from "@/store/warehouse/types";

// WAREHOUSE_URL may carry a trailing slash; the API lives under <base>/v1.
const BASE = WAREHOUSE_URL.replace(/\/$/, "");
const API = `${BASE}/v1`;

// Static assets (icons) are served as root-relative paths like /static/icons/...
export function warehouseAssetUrl(path: string): string {
  if (!path) return "";
  return path.startsWith("http") ? path : `${BASE}${path}`;
}

export function downloadUrl(replayId: string): string {
  return `${API}/replays/${encodeURIComponent(replayId)}/download`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return await response.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    // JSON.stringify drops undefined keys, satisfying the extra="forbid" backend.
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return await response.json();
}

// Surface pydantic 422 detail messages instead of a generic HTTP error.
async function toError(response: Response): Promise<Error> {
  try {
    const data = await response.json();
    if (Array.isArray(data?.detail)) {
      const msg = data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ");
      if (msg) return new Error(msg);
    }
    if (typeof data?.detail === "string") return new Error(data.detail);
  } catch {
    // fall through to status text
  }
  return new Error(`Warehouse API error ${response.status}`);
}

export default class WarehouseService {
  public static getReplays(limit = 50, offset = 0): Promise<ReplayMetadata[]> {
    return getJson<ReplayMetadata[]>(`/replays?limit=${limit}&offset=${offset}`);
  }

  public static browse(req: SearchRequest): Promise<SearchResponse> {
    return postJson<SearchResponse>("/browse", req);
  }

  public static search(req: SearchRequest): Promise<SearchResponse> {
    return postJson<SearchResponse>("/search", req);
  }

  public static getMappings(eventType?: EventType): Promise<MappingEntry[]> {
    const q = eventType ? `?event_type=${eventType}` : "";
    return getJson<MappingEntry[]>(`/mappings${q}`);
  }

  public static getMaps(seasons?: number[]): Promise<MapEntry[]> {
    const q = seasons && seasons.length ? `?seasons=${seasons.join(",")}` : "";
    return getJson<MapEntry[]>(`/maps${q}`);
  }

  public static getSeasons(): Promise<SeasonEntry[]> {
    return getJson<SeasonEntry[]>("/seasons");
  }

  public static getMmrStats(): Promise<MmrStats> {
    return getJson<MmrStats>("/mmr-stats");
  }

  public static getHealth(): Promise<WarehouseHealth> {
    return getJson<WarehouseHealth>("/health");
  }

  public static getPlayers(): Promise<PlayerEntry[]> {
    return getJson<PlayerEntry[]>("/players");
  }

  public static getStats(): Promise<WarehouseStats> {
    return getJson<WarehouseStats>("/stats");
  }

  public static getOpeners(params: OpenersParams): Promise<OpenersResponse> {
    const q = new URLSearchParams();
    q.set("race", params.race);
    if (params.opponent_race) q.set("opponent_race", params.opponent_race);
    if (params.map_name) q.set("map_name", params.map_name);
    if (params.sort) q.set("sort", params.sort);
    if (params.prefix && params.prefix.length) q.set("prefix", params.prefix.join(","));
    if (params.min_mmr != null) q.set("min_mmr", String(params.min_mmr));
    if (params.max_mmr != null) q.set("max_mmr", String(params.max_mmr));
    if (params.players && params.players.length) q.set("players", params.players.join(","));
    return getJson<OpenersResponse>(`/openers?${q.toString()}`);
  }

  public static getOpenerReplays(body: OpenerReplaysRequest): Promise<OpenerReplaysResponse> {
    return postJson<OpenerReplaysResponse>("/openers/replays", body);
  }
}
