// Shared icon lookup for WC3 entities (units, buildings, heroes, items,
// upgrades, abilities) across the Analytics tabs. One /v1/mappings fetch per
// page life feeds two dictionaries: canonical 4-char code → icon URL, and
// lowercased display name → icon URL (for rows that only carry a name, e.g.
// kills-by-unit). Stat-events-only codes (morphed hero forms etc.) never
// appear in mappings — callers must render gracefully without an icon.
import { ref } from "vue";
import WarehouseService from "@/services/WarehouseService";

const byCode = ref<Record<string, string>>({});
const byName = ref<Record<string, string>>({});
const loaded = ref(false);
let inflight: Promise<void> | null = null;

export function ensureIconIndex(): Promise<void> {
  if (loaded.value) return Promise.resolve();
  if (inflight) return inflight;
  inflight = WarehouseService.getMappings()
    .then((entries) => {
      const codeMap: Record<string, string> = {};
      const nameMap: Record<string, string> = {};
      for (const e of entries) {
        if (!e.icon_url) continue;
        if (e.code && !(e.code in codeMap)) codeMap[e.code] = e.icon_url;
        const key = e.name?.toLowerCase();
        if (key && !(key in nameMap)) nameMap[key] = e.icon_url;
      }
      byCode.value = codeMap;
      byName.value = nameMap;
      loaded.value = true;
    })
    .catch(() => {
      // Icons are progressive enhancement — a failed fetch just means text-only rows.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Fallback resolutions scan the whole name index — memoize per (code, name).
const resolved = new Map<string, string | null>();

export function iconUrlFor(code?: string | null, name?: string | null): string | null {
  if (code && byCode.value[code]) return byCode.value[code];
  const key = name?.toLowerCase().trim();
  if (!key) return null;
  if (byName.value[key]) return byName.value[key];
  const memoKey = `${code ?? ""}|${key}`;
  const memo = resolved.get(memoKey);
  if (memo !== undefined) return memo;
  // Stat-events names drift from the canonical mappings names: summons carry
  // a level suffix ("Water Elemental Level 1"), morphs append the form
  // ("Druid Of The Claw Bear Form"), creep heroes drop a prefix ("Sea Witch"
  // vs "Naga Sea Witch"). Try, in order: strip the level suffix, then the
  // longest containment match in either direction (≥ 5 chars, so "farm"-sized
  // fragments can't hijack).
  const stripped = key.replace(/ level \d+$/, "");
  if (stripped !== key && byName.value[stripped]) return byName.value[stripped];
  let best: { len: number; url: string } | null = null;
  for (const [candidate, url] of Object.entries(byName.value)) {
    if (candidate.length < 5) continue;
    if (stripped.includes(candidate) || candidate.includes(stripped)) {
      if (!best || candidate.length > best.len) best = { len: candidate.length, url };
    }
  }
  const url = best?.url ?? null;
  if (loaded.value) resolved.set(memoKey, url);
  return url;
}
