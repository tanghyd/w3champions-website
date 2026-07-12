<template>
  <div>
    <v-alert v-if="apiError" type="error" variant="tonal" density="compact" class="mb-3">
      {{ apiError }}
    </v-alert>

    <div class="matches-filter-scroll mb-2">
      <div class="matches-filter-row d-flex align-center">
        <warehouse-race-select
          :model-value="myRace"
          :label="$t('views_warehouse.race')"
          :allow-any="false"
          @update:model-value="(v) => setFilter('myRace', v ?? 'Human')"
        />
        <warehouse-option-select
          v-if="myRace === 'Random'"
          :model-value="rolledRace"
          :label="$t('components_warehouse_openers.rolled')"
          :options="rolledOptions"
          @update:model-value="onRolled"
        />
        <warehouse-race-select
          :model-value="opponentRace"
          :label="$t('views_warehouse.opponent')"
          @update:model-value="(v) => setFilter('opponentRace', v)"
        />
        <warehouse-map-select
          :model-value="mapName"
          :label="$t('views_warehouse.map')"
          :maps="maps"
          @update:model-value="(v) => setFilter('mapName', v)"
        />
        <mmr-select :mmr="mmr" @mmrFilterChanged="onMmr" />
        <warehouse-option-select
          :model-value="sort"
          :label="$t('components_warehouse_openers.sortBy')"
          :icon="mdiSort"
          :options="sortOptions"
          @update:model-value="onSort"
        />
        <span class="text-caption text-medium-emphasis ml-2 text-no-wrap">
          {{ $t("components_warehouse_openers.winrateNote") }}
        </span>
      </div>
    </div>

    <div class="text-caption text-medium-emphasis mb-2">
      {{ $t("components_warehouse_openers.scopeNote") }}
    </div>

    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="40" />
    </div>

    <template v-else>
      <div class="text-caption text-medium-emphasis mb-2">
        {{ $t("components_warehouse_openers.totalMatches", { n: totals }) }}
      </div>

      <div class="elevation-1 overflow-x-auto overflow-y-hidden">
        <table class="custom-table">
          <thead>
            <tr>
              <td class="text-medium-emphasis" style="min-width: 220px">{{ $t("components_warehouse_openers.opener") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_openers.matches") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_openers.winrate") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_openers.avgDuration") }}</td>
              <td class="text-medium-emphasis text-center">{{ $t("components_warehouse_openers.next") }}</td>
              <td class="text-medium-emphasis text-center">{{ $t("components_matches_matchesgrid.replay") }}</td>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="child in rows"
              :key="child.prefix.join(',')"
              :class="{ 'cursor-pointer': child.branch_factor > 0 }"
              @click="toggle(child)"
            >
              <td>
                <div class="d-flex align-center flex-nowrap ga-1">
                  <warehouse-code-chip
                    v-for="(code, cIdx) in child.prefix"
                    :key="cIdx"
                    :code="code"
                    :codes="codes"
                    :class="{ 'wh-chain-dim': cIdx < child.prefix.length - 1 }"
                  />
                  <v-btn
                    v-if="child.branch_factor > 0"
                    size="x-small"
                    variant="outlined"
                    class="wh-expand-tile number-text"
                    @click.stop="toggle(child)"
                  >
                    <template v-if="child.expanded">
                      <v-icon size="small">{{ mdiChevronDown }}</v-icon>
                    </template>
                    <template v-else>+{{ child.branch_factor }}</template>
                  </v-btn>
                </div>
              </td>
              <td class="text-end number-text">{{ child.matches }}</td>
              <td class="text-end number-text" :class="winrateClass(child)">{{ winrate(child) }}%</td>
              <td class="text-end number-text">{{ avgDuration(child) }}</td>
              <td class="text-center">
                <v-chip v-if="child.branch_factor > 0" size="x-small" variant="tonal">
                  +{{ child.branch_factor }}
                </v-chip>
                <span v-else class="text-disabled">&mdash;</span>
              </td>
              <td class="text-center" @click.stop>
                <v-tooltip location="top" content-class="w3-tooltip elevation-1">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      class="w3-gray-gold-text"
                      icon
                      variant="text"
                      size="small"
                      v-bind="props"
                      @click="showReplays(child)"
                    >
                      <v-icon>{{ mdiPlayBoxMultiple }}</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ $t("components_warehouse_openers.showReplays") }}</span>
                </v-tooltip>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="text-center text-medium-emphasis">
                {{ $t("components_warehouse_openers.noOpeners") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Replays for a chosen opener prefix. -->
    <v-dialog v-model="dialogOpen" max-width="1100">
      <v-card tile>
        <v-card-title class="pt-3 d-flex align-center flex-wrap ga-2">
          <span>{{ $t("components_warehouse_openers.replaysFor") }}</span>
          <warehouse-code-chip
            v-for="(code, idx) in dialogPrefix"
            :key="idx"
            :code="code"
            :codes="codes"
          />
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="dialogOpen = false">
            <v-icon>{{ mdiClose }}</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="dialogLoading" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate color="primary" size="40" />
          </div>
          <template v-else>
            <div class="text-caption text-medium-emphasis mb-2">
              {{ $t("components_warehouse_search.matchingReplays", { n: dialogCount }) }}
            </div>
            <warehouse-replays-table :replays="dialogReplays" />
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import WarehouseRaceSelect from "@/components/warehouse/filters/WarehouseRaceSelect.vue";
import WarehouseOptionSelect from "@/components/warehouse/filters/WarehouseOptionSelect.vue";
import WarehouseMapSelect from "@/components/warehouse/filters/WarehouseMapSelect.vue";
import MmrSelect from "@/components/common/MmrSelect.vue";
import WarehouseCodeChip from "@/components/warehouse/WarehouseCodeChip.vue";
import WarehouseReplaysTable from "@/components/warehouse/WarehouseReplaysTable.vue";
import WarehouseService from "@/services/WarehouseService";
import type { Mmr } from "@/store/match/types";
import { formatSecondsToDuration } from "@/helpers/date-functions";
import type {
  MapEntry,
  OpenerChild,
  OpenerCode,
  OpenersParams,
  Race,
  ReplayMetadata,
} from "@/store/warehouse/types";
import { useI18n } from "vue-i18n";
import { mdiChevronDown, mdiClose, mdiPlayBoxMultiple, mdiSort } from "@mdi/js";

const { t } = useI18n();

const maps = ref<MapEntry[]>([]);

const myRace = ref<Race>("Human");
const rolledRace = ref<string>("any");
const opponentRace = ref<Race | null>(null);
const mapName = ref<string | null>(null);
const mmr = ref<Mmr>({ min: 0, max: 3000 });
const sort = ref<"popular" | "winrate">("popular");

// The visible tree, flattened in render order. Expanding a node fetches its
// children (one trie level) and inserts them right below it — sibling paths
// stay visible, unlike a drill-down that replaces the whole view.
interface TreeRow extends OpenerChild {
  expanded?: boolean;
}
const rows = ref<TreeRow[]>([]);
const codes = ref<Record<string, OpenerCode>>({});
const totals = ref(0);
const loading = ref(false);
const apiError = ref("");

const dialogOpen = ref(false);
const dialogLoading = ref(false);
const dialogReplays = ref<ReplayMetadata[]>([]);
const dialogCount = ref(0);
const dialogPrefix = ref<string[]>([]);

function buildParams(prefix: string[]): OpenersParams {
  // Analytics is match-linked-only: every aggregated or listed replay maps to
  // a w3champions match, so replay rows always deep-link to match history.
  const params: OpenersParams = { race: myRace.value, sort: sort.value, w3c_linked_only: true };
  if (myRace.value === "Random" && rolledRace.value !== "any") {
    params.rolled_race = rolledRace.value as Race;
  }
  if (opponentRace.value) params.opponent_race = opponentRace.value;
  if (mapName.value) params.map_name = mapName.value;
  if (prefix.length) params.prefix = prefix;
  if (mmr.value.min > 0) params.min_mmr = mmr.value.min;
  if (mmr.value.max < 3000) params.max_mmr = mmr.value.max;
  return params;
}

async function load(): Promise<void> {
  loading.value = true;
  apiError.value = "";
  try {
    const res = await WarehouseService.getOpeners(buildParams([]));
    rows.value = res.children;
    codes.value = res.codes;
    totals.value = res.totals.matches;
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Openers request failed";
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function toggle(row: TreeRow): Promise<void> {
  if (row.branch_factor <= 0) return;
  const at = rows.value.indexOf(row);
  if (at < 0) return;
  if (row.expanded) {
    // Collapse: drop every visible descendant (their prefixes extend ours).
    const isDescendant = (r: TreeRow) =>
      r.prefix.length > row.prefix.length &&
      row.prefix.every((c, i) => r.prefix[i] === c);
    rows.value = rows.value.filter((r) => !isDescendant(r));
    row.expanded = false;
    return;
  }
  try {
    const res = await WarehouseService.getOpeners(buildParams(row.prefix));
    codes.value = { ...codes.value, ...res.codes };
    rows.value.splice(at + 1, 0, ...res.children);
    row.expanded = true;
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Openers request failed";
  }
}

function winrate(child: OpenerChild): number {
  if (!child.matches) return 0;
  return Math.round((child.wins / child.matches) * 100);
}

// Diverging tint around 50% in 4-point steps (two per arm, neutral near-even).
// Below the 10-match floor the rate is noise: muted text, no tint — same floor
// the "High winrate" sort applies server-side.
const WINRATE_TINT_MIN_MATCHES = 10;

function winrateClass(child: OpenerChild): string {
  if (child.matches < WINRATE_TINT_MIN_MATCHES) return "text-medium-emphasis";
  const wr = winrate(child);
  if (wr < 44) return "w3-lost wh-wr-d2";
  if (wr < 48) return "w3-lost wh-wr-d1";
  if (wr <= 52) return "wh-wr-mid";
  if (wr <= 56) return "w3-won wh-wr-u1";
  return "w3-won wh-wr-u2";
}

function avgDuration(child: OpenerChild): string {
  return formatSecondsToDuration(Math.round(child.avg_duration_min * 60));
}

async function showReplays(child: OpenerChild): Promise<void> {
  dialogPrefix.value = [...child.prefix];
  dialogOpen.value = true;
  dialogLoading.value = true;
  dialogReplays.value = [];
  try {
    const body = {
      race: myRace.value,
      prefix: child.prefix,
      w3c_linked_only: true,
      ...(myRace.value === "Random" && rolledRace.value !== "any"
        ? { rolled_race: rolledRace.value as Race }
        : {}),
      ...(opponentRace.value ? { opponent_race: opponentRace.value } : {}),
      ...(mapName.value ? { map_name: mapName.value } : {}),
      ...(mmr.value.min > 0 ? { min_mmr: mmr.value.min } : {}),
      ...(mmr.value.max < 3000 ? { max_mmr: mmr.value.max } : {}),
    };
    const res = await WarehouseService.getOpenerReplays(body);
    dialogReplays.value = res.replays;
    dialogCount.value = res.count;
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Opener replays request failed";
    dialogOpen.value = false;
  } finally {
    dialogLoading.value = false;
  }
}

// Changing any scope filter resets the tree to its root level.
function setFilter(key: "myRace" | "opponentRace" | "mapName", value: string | null): void {
  if (key === "myRace") {
    myRace.value = (value as Race) ?? "Human";
    if (myRace.value !== "Random") rolledRace.value = "any";
  }
  if (key === "opponentRace") opponentRace.value = value as Race | null;
  if (key === "mapName") mapName.value = value;
  load();
}

const rolledOptions = [
  { value: "any", title: t("components_warehouse_openers.rolledAny") },
  { value: "Human", title: t("races.HUMAN") },
  { value: "Orc", title: t("races.ORC") },
  { value: "NightElf", title: t("races.NIGHT_ELF") },
  { value: "Undead", title: t("races.UNDEAD") },
];

function onRolled(v: string): void {
  rolledRace.value = v;
  load();
}

function onMmr(v: Mmr): void {
  mmr.value = v;
  load();
}

const sortOptions = [
  { value: "popular", title: t("components_warehouse_openers.popular") },
  { value: "winrate", title: t("components_warehouse_openers.highWinrate") },
];

function onSort(v: string): void {
  sort.value = v === "winrate" ? "winrate" : "popular";
  load();
}

async function loadReference(): Promise<void> {
  const mapsRes = await Promise.allSettled([WarehouseService.getMaps()]);
  if (mapsRes[0].status === "fulfilled") maps.value = mapsRes[0].value;
}

onMounted(async () => {
  await loadReference();
  await load();
});
</script>

<style lang="scss" scoped>
.matches-filter-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 8px 8px;
  margin: -2px -8px -8px;
}

.matches-filter-row {
  width: max-content;
  min-width: 100%;
  flex-wrap: nowrap;
}

.wh-chain-dim {
  opacity: 0.45;
}

.wh-expand-tile {
  min-width: 34px;
}

// Winrate cell tint — the theme's own success/lost tokens as backgrounds
// (adapts to all four race themes), two alpha steps per arm; the printed %
// stays the primary encoding, the tint is a glance layer.
.wh-wr-u1 { background: rgba(var(--v-theme-success), 0.1); }
.wh-wr-u2 { background: rgba(var(--v-theme-success), 0.22); }
.wh-wr-mid { background: rgba(var(--v-theme-on-surface), 0.06); }
.wh-wr-d1 { background: rgba(var(--v-theme-lost), 0.1); }
.wh-wr-d2 { background: rgba(var(--v-theme-lost), 0.22); }
</style>
