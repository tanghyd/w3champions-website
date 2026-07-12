<template>
  <div v-if="sides" class="wh-ov mb-4">
    <!-- Hero portraits with final levels, mirrored like the match page -->
    <div class="d-flex justify-space-between align-start mb-2">
      <div v-for="(side, si) in sides" :key="si" class="d-flex ga-2" :class="{ 'flex-row-reverse': si === 1 }">
        <div v-for="h in sideHeroes(side)" :key="h.code" class="text-center">
          <warehouse-entity-icon :code="h.code" :name="h.name" :size="36" />
          <div class="wh-ov-level number-text" :title="h.name">{{ h.level }}</div>
        </div>
      </div>
    </div>

    <!-- Mirrored stat rows, center-labeled; better value highlighted -->
    <div v-for="row in statRows" :key="row.label" class="wh-ov-row">
      <span class="number-text" :class="valueClass(row, 0)">{{ row.values[0].toLocaleString() }}</span>
      <span class="text-medium-emphasis text-center">{{ row.label }}</span>
      <span class="number-text text-end" :class="valueClass(row, 1)">{{ row.values[1].toLocaleString() }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import WarehouseEntityIcon from "@/components/warehouse/WarehouseEntityIcon.vue";
import type { StatEventsDetail, StatEventsPlayer } from "@/store/warehouse/types";

// The match page's per-match overview, derived from stat events: mirrored
// team totals around center labels. Only rendered for two-team games.
const { detail } = defineProps<{ detail: StatEventsDetail }>();

const { t } = useI18n();

const sides = computed<StatEventsPlayer[][] | null>(() => {
  const players = detail.replay.players ?? [];
  const byTeam = new Map<number, StatEventsPlayer[]>();
  for (const p of players) byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p]);
  const teams = [...byTeam.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
  return teams.length === 2 ? teams : null;
});

function slotsOf(side: StatEventsPlayer[]): Set<number> {
  return new Set(side.map((p) => p.slot));
}

interface SideHero {
  code: string;
  name: string;
  level: number;
}

// Final hero level = highest HeroLevel amount seen (a hero starts at 1).
function sideHeroes(side: StatEventsPlayer[]): SideHero[] {
  const out: SideHero[] = [];
  for (const p of side) {
    const seen = new Map<string, SideHero>();
    for (const r of detail.heroes_by_slot?.[String(p.slot)] ?? []) {
      if (!r.hero_code) continue;
      const h = seen.get(r.hero_code) ?? { code: r.hero_code, name: r.hero, level: 1 };
      if (r.event === "HeroLevel" && r.amount > h.level) h.level = r.amount;
      if (!seen.has(r.hero_code)) seen.set(r.hero_code, h);
    }
    out.push(...seen.values());
  }
  return out;
}

interface StatRow {
  label: string;
  values: [number, number];
  lowerIsBetter?: boolean;
}

const statRows = computed<StatRow[]>(() => {
  const s = sides.value;
  if (!s) return [];
  const slotSets = s.map(slotsOf);

  const perSide = (fn: (slots: Set<number>) => number): [number, number] => [fn(slotSets[0]), fn(slotSets[1])];

  const buildRows = Object.values(detail.build_by_slot ?? {}).flat();
  const heroRows = Object.values(detail.heroes_by_slot ?? {}).flat();
  const isHeroCode = (code: string) => /^[A-Z]/.test(code);

  return [
    {
      label: t("components_warehouse_statevents.heroesKilled"),
      values: perSide((sl) => detail.deaths.filter((d) => !!d.is_hero && sl.has(d.killer_slot)).length),
    },
    {
      label: t("components_warehouse_statevents.unitsKilled"),
      values: perSide((sl) => detail.kd_by_player.filter((r) => sl.has(r.slot)).reduce((a, r) => a + r.kills, 0)),
    },
    {
      label: t("components_warehouse_statevents.unitsLost"),
      values: perSide((sl) => detail.kd_by_player.filter((r) => sl.has(r.slot)).reduce((a, r) => a + r.deaths, 0)),
      lowerIsBetter: true,
    },
    {
      label: t("components_warehouse_statevents.unitsProduced"),
      values: perSide(
        (sl) =>
          buildRows.filter(
            (r) => sl.has(r.player_slot) && r.kind === "unit" && r.phase === "complete" && !isHeroCode(r.type_code)
          ).length
      ),
    },
    {
      label: t("components_warehouse_statevents.buildingsBuilt"),
      values: perSide(
        (sl) => buildRows.filter((r) => sl.has(r.player_slot) && r.kind === "structure" && r.phase === "complete").length
      ),
    },
    {
      label: t("components_warehouse_statevents.cancels"),
      values: perSide((sl) => buildRows.filter((r) => sl.has(r.player_slot) && r.phase === "cancel").length),
      lowerIsBetter: true,
    },
    {
      label: t("components_warehouse_statevents.creepsKilled"),
      values: perSide((sl) => detail.creep_rows.filter((r) => sl.has(Number(r.player_slot))).length),
    },
    {
      label: t("components_warehouse_statevents.largestArmy"),
      values: perSide((sl) =>
        detail.econ_rows.filter((r) => sl.has(r.player_slot)).reduce((a, r) => Math.max(a, r.food_used), 0)
      ),
    },
    {
      label: t("components_warehouse_statevents.damageDealt"),
      values: perSide((sl) =>
        Math.round(
          detail.combat_rows.filter((r) => sl.has(Number(r.player_slot))).reduce((a, r) => a + Number(r.damage), 0)
        )
      ),
    },
    {
      label: t("components_warehouse_statevents.itemsCollected"),
      values: perSide(
        (sl) =>
          heroRows.filter(
            (r) => sl.has(r.player_slot) && (r.event === "HeroItemPickup" || r.event === "HeroItemBought")
          ).length
      ),
    },
  ];
});

function valueClass(row: StatRow, side: 0 | 1): string {
  const [a, b] = row.values;
  if (a === b) return "";
  const mineHigher = side === 0 ? a > b : b > a;
  const better = row.lowerIsBetter ? !mineHigher : mineHigher;
  return better ? "w3-won" : "w3-lost";
}
</script>

<style scoped>
.wh-ov {
  max-width: 560px;
  margin: 0 auto;
}

.wh-ov-row {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  padding: 2px 0;
}

.wh-ov-level {
  font-size: 0.75rem;
  background: rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 0 0 4px 4px;
  margin-top: -2px;
}
</style>
