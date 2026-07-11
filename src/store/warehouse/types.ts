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

// GET /v1/players
export interface PlayerEntry {
  name: string;
  replays: number;
}

// GET /v1/stats
export interface MatchupStat {
  race_a: string;
  race_b: string;
  games: number;
  pct_a: number; // winrate % of race_a in that pairing (decided games)
}

export interface HeroPickrate {
  race: string;
  hero: string;
  picks: number;
  pct: number;
}

export interface HeroPickrateGroup {
  race: string;
  heroes: HeroPickrate[];
}

export interface HistogramBucket {
  bucket: string;
  n: number;
  pct: number; // bar height scaled to the max bucket, NOT a probability
}

export interface WarehouseStats {
  matchups: MatchupStat[];
  hero_pickrates: HeroPickrateGroup[];
  durations: HistogramBucket[];
  apm: HistogramBucket[];
  mmr: HistogramBucket[];
}

// GET /v1/openers
export interface OpenerChild {
  prefix: string[];
  depth: number;
  matches: number;
  wins: number;
  avg_duration_min: number;
  branch_factor: number;
  sample_replays: string[];
}

export interface OpenerCode {
  name: string;
  icon_url: string | null;
}

export interface OpenersResponse {
  totals: { matches: number };
  children: OpenerChild[];
  codes: Record<string, OpenerCode>;
}

export interface OpenersParams {
  race: Race; // required, full name
  opponent_race?: Race;
  map_name?: string;
  sort?: "popular" | "winrate";
  prefix?: string[]; // sent as csv
  min_mmr?: number;
  max_mmr?: number;
  players?: string[]; // sent as csv
}

// POST /v1/openers/replays
export interface OpenerReplaysRequest {
  race: Race;
  opponent_race?: Race;
  map_name?: string;
  prefix: string[];
  min_mmr?: number;
  max_mmr?: number;
  players?: string[];
}

export interface OpenerReplaysResponse {
  count: number;
  replays: ReplayMetadata[]; // <= 50
}
