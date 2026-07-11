import { WAREHOUSE_URL } from "@/config/env";
import type { EventType, MapEntry, MappingEntry, MmrStats, ReplayMetadata, SearchRequest, SearchResponse, SeasonEntry, WarehouseHealth } from "@/store/warehouse/types";

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
}
