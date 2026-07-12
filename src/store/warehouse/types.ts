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
  hero_ordinal?: number; // 1-3, hero_trained steps only: the player's Nth distinct hero
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
  // Replays inside the current filter scope (whole 1on1 corpus when unfiltered).
  scope_count: number;
}

export interface StatsParams {
  matchup?: Race[]; // sent as csv; /search semantics (1 = involving, 2 = exact pair)
  map_name?: string;
  seasons?: number[]; // sent as csv
  min_mmr?: number;
  max_mmr?: number;
  w3c_linked_only?: boolean; // Analytics forces true
}

// GET /beta/stat-events/* — instrumented-replay data. /beta contract: shapes
// may change without notice, so fields the UI doesn't render stay untyped.
export interface StatEventsPlayer {
  slot: number;
  name: string;
  race: string;
  team: number;
}

export interface StatEventsReplay {
  replay_id: string;
  map?: string;
  played_at?: string | null;
  duration_s: number;
  events: number;
  cancels?: number;
  players: StatEventsPlayer[];
}

export interface StatEventsBuildRow {
  t: number;
  clock: string;
  sequence: number;
  player_slot: number;
  kind: string; // unit | structure | upgrade | research
  phase: string; // start | cancel | complete
  name: string;
  type_code: string;
  x: number;
  y: number;
  food_used: number;
  food_cap: number;
  // Exact-cancel attribution (position join, see the API): a start that was
  // later cancelled, and on the cancel row, when its start happened.
  cancelled?: boolean;
  cancelled_clock?: string;
  start_clock?: string;
  // Multi-level research/upgrades: 1-based occurrence per player+code.
  level?: number;
}

export interface StatEventsEconRow {
  game_time_s: number;
  player_slot: number;
  gold: number;
  wood: number;
  food_used: number;
  food_cap: number;
  gold_upkeep: number;
  wood_upkeep: number;
}

export interface StatEventsHeroRow {
  game_time_s: number;
  clock: string;
  player_slot: number;
  event: string; // trained | level | item | ability...
  hero: string;
  hero_code: string;
  detail: string;
  amount: number;
  target: string;
  [k: string]: unknown;
}

export interface StatEventsDeathRow {
  game_time_s: number;
  clock: string;
  category: string;
  name: string; // the unit that died
  type_code: string;
  is_hero: boolean | number;
  victim_slot: number;
  killer_slot: number;
  killer: string; // resolved player name ('' when environment/unknown)
  killer_name: string; // the killing unit
  level: number;
  point_value: number;
  is_deny: boolean | number; // killed by its own side — granted the opponent no XP
  xp_value: number; // kill XP the unit would have granted (0 for structures/heroes)
  [k: string]: unknown;
}

export interface StatEventsKdRow {
  slot: number;
  name: string;
  kills: number;
  deaths: number;
  denies: number;
  xp_denied: number;
}

export interface StatEventsDamageRow {
  source_name: string;
  target_name: string;
  source_code?: string;
  target_code?: string;
  damage: number;
  hits: number;
  source_is_hero: boolean;
  target_is_hero: boolean;
}

export interface StatEventsQaRow {
  sender_slot: number;
  events: number;
  max_sequence: number;
  missing_sequences: number;
  checksums: number;
  game_end_checks: number;
}

export interface StatEventsMinimap {
  url: string;
  bounds: [number, number, number, number]; // left, bottom, right, top (world coords)
}

export interface StatEventsDetail {
  replay: StatEventsReplay;
  slot_names: Record<string, string>;
  minimap: StatEventsMinimap | null;
  duration_clock: string;
  build_by_slot: Record<string, StatEventsBuildRow[]>;
  cancels: StatEventsBuildRow[];
  econ_rows: StatEventsEconRow[];
  heroes_by_slot: Record<string, StatEventsHeroRow[]>;
  deaths: StatEventsDeathRow[];
  qa_rows: StatEventsQaRow[];
  qa_ok: boolean;
  kills_by_unit: { name: string; code?: string; count: number; is_hero: boolean }[];
  kd_by_player: StatEventsKdRow[];
  damage_by_matchup: StatEventsDamageRow[];
  creep_rows: Record<string, unknown>[];
  creep_by_slot: Record<string, Record<string, unknown>[]>;
  spell_rows: Record<string, unknown>[];
  spell_by_slot: Record<string, Record<string, unknown>[]>;
  summon_rows: Record<string, unknown>[];
  combat_rows: Record<string, unknown>[];
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
  w3c_linked_only?: boolean; // Analytics forces true: aggregate + list only match-linked replays
  // With race=Random: only games where the Random player ROLLED this race
  // (inferred from their building codes — rawcode first letters are race-pure).
  rolled_race?: Race;
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
  w3c_linked_only?: boolean;
  rolled_race?: Race;
}

export interface OpenerReplaysResponse {
  count: number;
  replays: ReplayMetadata[]; // <= 50
}
