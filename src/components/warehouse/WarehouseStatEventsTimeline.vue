<template>
  <div>
    <div class="d-flex align-center flex-wrap ga-1 mb-1">
      <span class="text-caption text-medium-emphasis mr-1">
        {{ $t("components_warehouse_statevents.layersLabel") }}
      </span>
      <v-chip-group v-model="activeLayers" multiple column>
        <v-chip
          v-for="opt in layerOptions"
          :key="opt.value"
          :value="opt.value"
          filter
          size="small"
          variant="tonal"
        >
          {{ opt.title }}
        </v-chip>
      </v-chip-group>
    </div>

    <div class="wh-tl elevation-1">
      <div v-for="slot in slots" :key="slot" class="wh-tl-lane">
        <div class="wh-tl-name text-caption">
          <span class="wh-tl-swatch" :style="{ background: slotColor(slot) }"></span>
          <race-icon :key="raceOf(slot)" :race="raceEnum(raceOf(slot))" />
          {{ slotName(slot) }}
        </div>
        <div v-for="layer in shownLayers" :key="layer" class="wh-tl-row">
          <div class="wh-tl-rowlabel text-medium-emphasis">{{ layerTitle(layer) }}</div>
          <div class="wh-tl-track">
            <span
              v-for="tick in axisTicks"
              :key="tick.pct"
              class="wh-tl-gridline"
              :style="{ left: tick.pct + '%' }"
            ></span>
            <div
              v-for="(m, mi) in layerMarkers[layer]?.[slot] ?? []"
              :key="'m' + mi"
              class="wh-tl-marker"
              :style="{ left: m.pct + '%' }"
              :title="m.title"
            >
              <div class="wh-tl-stem" :style="{ height: 5 + m.tier * 28 + 'px', background: slotColor(slot) }"></div>
              <img v-if="m.icon" :src="assetUrl(m.icon)" class="wh-tl-icon" :class="{ 'wh-tl-bad': m.bad }" alt="" />
              <span v-else class="wh-tl-noicon" :class="{ 'wh-tl-bad': m.bad }">{{ m.fallback }}</span>
              <span v-if="m.badge" class="wh-tl-badge number-text">{{ m.badge }}</span>
            </div>
          </div>
        </div>
        <!-- Baseline pulse: every build start, whatever layers are on. -->
        <div class="wh-tl-row">
          <div class="wh-tl-rowlabel text-medium-emphasis">
            {{ $t("components_warehouse_statevents.layerStarts") }}
          </div>
          <div class="wh-tl-track wh-tl-track--dots">
            <div class="wh-tl-line" :style="{ background: slotColor(slot) }"></div>
            <span
              v-for="(dot, di) in dotsBySlot[slot] ?? []"
              :key="'d' + di"
              class="wh-tl-dot"
              :style="{ left: dot.pct + '%', background: slotColor(slot) }"
              :title="dot.title"
            ></span>
          </div>
        </div>
      </div>
      <div class="wh-tl-row">
        <div class="wh-tl-rowlabel"></div>
        <div class="wh-tl-axis">
          <span
            v-for="tick in axisTicks"
            :key="tick.pct"
            class="wh-tl-tick number-text text-medium-emphasis"
            :style="{ left: tick.pct + '%' }"
          >{{ tick.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import RaceIcon from "@/components/player/RaceIcon.vue";
import { ERaceEnum } from "@/store/types";
import { raceToEnum } from "@/components/warehouse/warehouse-helpers";
import { iconUrlFor } from "@/components/warehouse/warehouse-icons";
import { warehouseAssetUrl } from "@/services/WarehouseService";
import type { StatEventsDetail } from "@/store/warehouse/types";

// wc3.no-style match timeline, multi-layer: one lane per player, and inside
// each lane one sub-track per toggled event layer, all visible at once, plus
// a baseline dot row of every build start. Pure HTML/absolute positioning —
// no chart lib.
const { detail, slotColor } = defineProps<{
  detail: StatEventsDetail;
  slotColor: (slot: number) => string;
}>();

const { t } = useI18n();

type Layer = "heroes" | "skills" | "tech" | "research" | "items" | "cancels" | "herokills";
const activeLayers = ref<Layer[]>(["tech", "heroes", "herokills"]);

const layerOptions: { value: Layer; title: string }[] = [
  { value: "tech", title: t("components_warehouse_statevents.catTech") },
  { value: "heroes", title: t("components_warehouse_statevents.catHeroes") },
  { value: "skills", title: t("components_warehouse_statevents.catSkills") },
  { value: "research", title: t("components_warehouse_statevents.catResearch") },
  { value: "items", title: t("components_warehouse_statevents.catItems") },
  { value: "cancels", title: t("components_warehouse_statevents.catCancels") },
  { value: "herokills", title: t("components_warehouse_statevents.catHeroKills") },
];

// Canonical layer order regardless of toggle order.
const shownLayers = computed<Layer[]>(() => layerOptions.map((o) => o.value).filter((v) => activeLayers.value.includes(v)));

function layerTitle(layer: Layer): string {
  return layerOptions.find((o) => o.value === layer)?.title ?? layer;
}

const slots = computed<number[]>(() => (detail.replay.players ?? []).map((p) => p.slot));
const duration = computed<number>(() => Math.max(detail.replay.duration_s, 1));

function slotName(slot: number): string {
  return detail.slot_names?.[String(slot)] ?? `slot ${slot}`;
}

function raceOf(slot: number): string {
  return detail.replay.players.find((p) => p.slot === slot)?.race ?? "";
}

function raceEnum(race: string): ERaceEnum {
  return raceToEnum(race);
}

function pctOf(t_s: number): number {
  return Math.min(100, Math.max(0, (t_s / duration.value) * 100));
}

function assetUrl(path: string): string {
  return warehouseAssetUrl(path);
}

interface Marker {
  pct: number;
  tier: number;
  icon: string | null;
  fallback: string;
  title: string;
  badge?: string;
  bad?: boolean;
}

interface RawMarker extends Omit<Marker, "tier"> {
  t: number;
}

// Collision handling like wc3.no: markers close in time climb to a higher
// stem tier instead of overlapping. Percent-based threshold (~icon width on
// a typical viewport); wraps back down once horizontal space frees up.
// Layers separate the categories now, so two tiers per track suffice.
const TIER_GAP_PCT = 2.4;
const TIERS = 2;
function tiered(raw: RawMarker[]): Marker[] {
  const sorted = [...raw].sort((a, b) => a.t - b.t);
  const lastAt: number[] = Array(TIERS).fill(-Infinity);
  return sorted.map((m) => {
    let tier = lastAt.findIndex((last) => m.pct - last >= TIER_GAP_PCT);
    if (tier === -1) tier = lastAt.indexOf(Math.min(...lastAt));
    lastAt[tier] = m.pct;
    const { t: _t, ...rest } = m;
    return { ...rest, tier };
  });
}

function fallbackText(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}

function mk(t_s: number, clock: string, code: string | null, name: string, extra: Partial<RawMarker> = {}): RawMarker {
  return {
    t: t_s,
    pct: pctOf(t_s),
    icon: iconUrlFor(code, name),
    fallback: fallbackText(name),
    title: `${clock} — ${name}`,
    ...extra,
  };
}

const isHeroCode = (code: string) => /^[A-Z]/.test(code);

function markersFor(layer: Layer): Record<number, RawMarker[]> {
  const out: Record<number, RawMarker[]> = {};
  const push = (slot: number, m: RawMarker) => (out[slot] ??= []).push(m);

  if (layer === "tech" || layer === "research" || layer === "heroes") {
    for (const [slot, rows] of Object.entries(detail.build_by_slot ?? {})) {
      for (const r of rows) {
        if (r.phase !== "complete") continue;
        const hero = r.kind === "unit" && isHeroCode(r.type_code);
        if (layer === "tech" && r.kind !== "structure") continue;
        if (layer === "research" && r.kind !== "research" && r.kind !== "upgrade") continue;
        if (layer === "heroes" && !hero) continue;
        push(Number(slot), mk(r.t, r.clock, r.type_code, r.name));
      }
    }
  }
  if (layer === "cancels") {
    for (const [slot, rows] of Object.entries(detail.build_by_slot ?? {})) {
      for (const r of rows) {
        if (r.phase !== "cancel") continue;
        const started = r.start_clock ? ` (${t("components_warehouse_statevents.cancelledOfStart", { clock: r.start_clock })})` : "";
        push(Number(slot), { ...mk(r.t, r.clock, r.type_code, r.name), bad: true, title: `${r.clock} — ${r.name}${started}` });
      }
    }
  }
  if (layer === "heroes" || layer === "skills" || layer === "items") {
    for (const [slot, rows] of Object.entries(detail.heroes_by_slot ?? {})) {
      for (const r of rows) {
        if (layer === "heroes" && r.event === "HeroLevel") {
          push(Number(slot), {
            ...mk(r.game_time_s, r.clock, r.hero_code, `${r.hero} — level ${r.amount}`),
            icon: iconUrlFor(r.hero_code, r.hero),
            badge: String(r.amount),
          });
        } else if (layer === "skills" && r.event === "HeroSkill") {
          push(Number(slot), mk(r.game_time_s, r.clock, null, r.detail, { title: `${r.clock} — ${r.hero}: ${r.detail}` }));
        } else if (layer === "items" && (r.event === "HeroItemPickup" || r.event === "HeroItemBought")) {
          push(Number(slot), mk(r.game_time_s, r.clock, null, r.detail));
        }
      }
    }
  }
  if (layer === "herokills") {
    // Hero deaths drawn on the VICTIM's lane; the tooltip names the killer.
    for (const r of detail.deaths) {
      if (!r.is_hero) continue;
      const by = r.killer_name ? ` — ${t("components_warehouse_statevents.killedBy").toLowerCase()} ${r.killer_name}${r.killer ? ` (${r.killer})` : ""}` : "";
      push(r.victim_slot, { ...mk(r.game_time_s, r.clock, r.type_code, r.name), bad: true, title: `${r.clock} — ${r.name}${by}` });
    }
  }

  return out;
}

const layerMarkers = computed<Record<string, Record<number, Marker[]>>>(() => {
  const out: Record<string, Record<number, Marker[]>> = {};
  for (const layer of shownLayers.value) {
    const raw = markersFor(layer);
    out[layer] = Object.fromEntries(Object.entries(raw).map(([slot, ms]) => [slot, tiered(ms)]));
  }
  return out;
});

// Every build start as a small dot on the lane, whatever the layers —
// the "pulse" of the game, like wc3.no's baseline dots.
const dotsBySlot = computed<Record<number, { pct: number; title: string }[]>>(() => {
  const out: Record<number, { pct: number; title: string }[]> = {};
  for (const [slot, rows] of Object.entries(detail.build_by_slot ?? {})) {
    out[Number(slot)] = rows
      .filter((r) => r.phase === "start")
      .map((r) => ({ pct: pctOf(r.t), title: `${r.clock} — ${r.name}` }));
  }
  return out;
});

const axisTicks = computed<{ pct: number; label: string }[]>(() => {
  const total = duration.value;
  const stepS = total > 1800 ? 300 : total > 900 ? 120 : 60;
  const ticks: { pct: number; label: string }[] = [];
  for (let s = 0; s <= total; s += stepS) {
    ticks.push({ pct: pctOf(s), label: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` });
  }
  return ticks;
});
</script>

<style scoped>
.wh-tl {
  padding: 10px 24px 12px 12px;
  overflow: hidden;
}

.wh-tl-lane {
  margin-bottom: 10px;
}

.wh-tl-lane + .wh-tl-lane {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-top: 8px;
}

.wh-tl-name {
  margin-bottom: 4px;
  font-weight: 500;
}

.wh-tl-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 6px;
}

.wh-tl-row {
  display: flex;
  align-items: flex-end;
}

.wh-tl-rowlabel {
  flex: 0 0 92px;
  padding: 0 8px 4px 0;
  text-align: right;
  font-size: 0.7rem;
  line-height: 1.2;
}

.wh-tl-track {
  position: relative;
  flex: 1;
  height: 62px;
  min-width: 0;
}

.wh-tl-track--dots {
  height: 16px;
}

.wh-tl-gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(var(--v-theme-on-surface), 0.07);
}

.wh-tl-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 7px;
  height: 2px;
  opacity: 0.8;
}

.wh-tl-dot {
  position: absolute;
  bottom: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transform: translateX(-50%);
}

.wh-tl-marker {
  position: absolute;
  bottom: 2px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
}

.wh-tl-stem {
  width: 2px;
  opacity: 0.55;
}

.wh-tl-icon,
.wh-tl-noicon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.wh-tl-bad {
  border: 2px solid rgba(var(--v-theme-lost), 0.9);
}

.wh-tl-badge {
  position: absolute;
  right: -6px;
  top: -6px;
  min-width: 15px;
  padding: 0 3px;
  border-radius: 8px;
  font-size: 0.65rem;
  text-align: center;
  color: #fff;
  background: rgba(var(--v-theme-primary), 0.95);
}

.wh-tl-axis {
  position: relative;
  flex: 1;
  height: 16px;
  margin-top: 2px;
}

.wh-tl-tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.7rem;
}
</style>
