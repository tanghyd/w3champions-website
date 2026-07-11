// Types mirroring the w3warehouse JSON API (WAREHOUSE_URL + /v1).
// The backend is pydantic extra="forbid": request bodies must omit unset keys
// entirely (JSON.stringify drops `undefined` values; never send `null`).

export type Race = "Orc" | "Human" | "NightElf" | "Undead" | "Random";

export type EventType =
  | "building"
  | "unit"
  | "item"
  | "upgrade"
  | "hero_skill"
  | "hero_trained";

export interface SequenceStep {
  event_type: EventType;
  // Exactly one of subject / subject_code. UX uses subject (case-insensitive name).
  subject?: string;
  subject_code?: string;
  within_previous_seconds?: number; // 1-3600, ignored on the first step
  time_from_seconds?: number;
  time_to_seconds?: number;
}

export interface SequenceGroup {
  race: Race;
  player?: string;
  result?: "won" | "lost";
  steps?: SequenceStep[]; // <= 8
}

export interface SearchRequest {
  matchup?: Race[]; // <= 2: empty = any, 1 = involving, 2 = exact pair
  groups?: SequenceGroup[]; // <= 2
  limit?: number; // 1-1000, default 100
  map_name?: string;
  min_minutes?: number;
  max_minutes?: number;
  min_mmr?: number; // 0-4000
  max_mmr?: number; // 0-4000
  player_names?: string[];
  players_match_all?: boolean;
  seasons?: number[];
  w3c_linked_only?: boolean;
}

export interface HeroMetadata {
  hero_id: string;
  hero_name: string;
  final_level: number;
  icon_url: string | null;
}

export interface PlayerMetadata {
  player_id: number;
  name: string;
  race: string;
  team_id: number;
  apm: number;
  won: boolean;
  old_mmr: number | null;
  heroes: HeroMetadata[];
  annotations: Record<string, string>;
}

export interface ReplayMetadata {
  replay_id: string;
  api_id: number;
  file_path: string | null;
  w3c_ongoing_match_id: string | null;
  w3c_match_id: string | null;
  map: string;
  played_at: string | null;
  gamename: string;
  matchup: string;
  duration_ms: number;
  winning_team_id: number;
  season: number | null;
  players: PlayerMetadata[];
}

export interface SearchResponse {
  count: number;
  replay_ids: string[];
  replays: ReplayMetadata[];
  sql: string;
  params: Record<string, unknown>;
  warnings: string[];
}

export interface MappingEntry {
  event_type: EventType;
  name: string;
  code: string;
  hero: string;
  icon_url: string | null;
}

export interface MapEntry {
  name: string;
  replays: number;
}

export interface SeasonEntry {
  season: number;
  replays: number;
}

export interface MmrStats {
  p5: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
  n: number;
}

export interface WarehouseHealth {
  events: number;
  replays: number;
  w3c_replays: number;
  duration_minutes: { min: number; max: number };
}
