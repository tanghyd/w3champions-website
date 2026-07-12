<template>
  <div>
    <v-alert v-if="apiError" type="error" variant="tonal" density="compact" class="mb-3">
      {{ apiError }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="40" />
    </div>

    <div v-else-if="!replays.length" class="text-medium-emphasis py-8 text-center">
      {{ $t("components_warehouse_statevents.empty") }}
    </div>

    <template v-else>
      <div class="text-caption text-medium-emphasis mb-2">
        {{ $t("components_warehouse_statevents.scopeNote") }}
      </div>

      <!-- Replay index, styled like the site's match-history rows -->
      <div class="elevation-1 overflow-x-auto overflow-y-hidden mb-4">
        <table class="custom-table">
          <thead>
            <tr>
              <td class="text-medium-emphasis text-center" style="min-width: 280px">
                {{ $t("components_warehouse_statevents.players") }}
              </td>
              <td class="text-medium-emphasis text-center">{{ $t("components_warehouse_table.map") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_statevents.duration") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_table.played") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_statevents.events") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_statevents.cancels") }}</td>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in replays"
              :key="r.replay_id"
              class="cursor-pointer"
              :class="{ 'wh-se-active': r.replay_id === selectedId }"
              @click="select(r.replay_id)"
            >
              <td>
                <div v-if="teamsOf(r).length === 2" class="d-flex align-center justify-center wh-se-nowrap py-2">
                  <div class="wh-se-team wh-se-team--left">
                    <div v-for="p in teamsOf(r)[0]" :key="p.slot" class="wh-se-player">
                      <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
                      <span class="wh-se-name">{{ p.name }}</span>
                      <player-icon :key="p.race" :race="raceEnum(p.race)" />
                    </div>
                  </div>
                  <span class="wh-se-vs text-no-wrap px-2">{{ $t("views_matchdetail.vs") }}</span>
                  <div class="wh-se-team">
                    <div v-for="p in teamsOf(r)[1]" :key="p.slot" class="wh-se-player">
                      <player-icon :key="p.race" :race="raceEnum(p.race)" :left="true" />
                      <span class="wh-se-name">{{ p.name }}</span>
                      <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
                    </div>
                  </div>
                </div>
                <template v-else>
                  <span v-for="p in r.players" :key="p.slot" class="mr-3 text-no-wrap">
                    <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
                    <race-icon :key="p.race" :race="raceEnum(p.race)" />
                    {{ p.name }}
                  </span>
                </template>
              </td>
              <td class="text-center">
                <span v-if="r.map" class="text-caption">{{ r.map }}</span>
                <span v-else class="text-disabled">&mdash;</span>
              </td>
              <td class="text-end">
                <div class="d-flex flex-column text-right align-end">
                  <span class="number-text">{{ clock(r.duration_s) }}</span>
                  <div class="wh-se-duration-bar" :style="{ width: durationBarWidth(r) }"></div>
                </div>
              </td>
              <td class="text-end">
                <span v-if="r.played_at" class="number-text" :title="playedAtTooltip(r)">{{ playedAt(r) }}</span>
                <span v-else class="text-disabled">&mdash;</span>
              </td>
              <td class="text-end number-text">{{ r.events.toLocaleString() }}</td>
              <td class="text-end number-text">{{ r.cancels ?? 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="detailLoading" class="d-flex justify-center py-10">
        <v-progress-circular indeterminate color="primary" size="40" />
      </div>

      <template v-else-if="detail">
        <!-- Match header, echoing the native match-detail page -->
        <div class="wh-se-header mb-2">
          <div v-if="teams.length === 2" class="wh-se-ovo">
            <div class="wh-se-side wh-se-side--left">
              <div v-for="p in teams[0]" :key="p.slot" class="wh-se-side-player">
                <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
                <span class="wh-se-bigname font-friz-medium">{{ p.name }}</span>
                <player-icon :key="p.race" :race="raceEnum(p.race)" :big="true" />
              </div>
            </div>
            <div class="wh-se-ovo-vs font-friz-medium">{{ $t("views_matchdetail.vs") }}</div>
            <div class="wh-se-side">
              <div v-for="p in teams[1]" :key="p.slot" class="wh-se-side-player">
                <player-icon :key="p.race" :race="raceEnum(p.race)" :big="true" :left="true" />
                <span class="wh-se-bigname font-friz-medium">{{ p.name }}</span>
                <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
              </div>
            </div>
          </div>
          <div v-else class="d-flex align-center justify-center flex-wrap ga-3">
            <span v-for="p in detail.replay.players" :key="p.slot" class="text-subtitle-2 text-no-wrap">
              <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
              <race-icon :key="p.race" :race="raceEnum(p.race)" />
              {{ p.name }}
            </span>
          </div>
          <div class="wh-se-mapline text-center text-medium-emphasis">
            <span v-if="detail.replay.map">{{ detail.replay.map }} ({{ detail.duration_clock }})</span>
            <span v-else>{{ detail.duration_clock }}</span>
            <template v-if="detail.replay.played_at"> | {{ playedAtLong(detail.replay.played_at) }}</template>
          </div>
          <div class="d-flex justify-center ga-2 mt-1">
            <v-chip size="small" variant="tonal" :color="detail.qa_ok ? 'success' : 'error'">
              {{ detail.qa_ok
                ? $t("components_warehouse_statevents.qaOk")
                : $t("components_warehouse_statevents.qaGaps") }}
            </v-chip>
          </div>
        </div>

        <!-- Mirrored team totals, flowing straight under the header like the match page -->
        <warehouse-stat-events-overview :detail="detail" />

        <!-- Timeline -->
        <div class="wh-se-section text-h6">{{ $t("components_warehouse_statevents.timeline") }}</div>
        <warehouse-stat-events-timeline :detail="detail" :slot-color="slotColor" class="mb-4" />

        <!-- Build orders -->
        <div class="wh-se-section text-h6">{{ $t("components_warehouse_statevents.buildOrders") }}</div>
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <warehouse-option-select
            :model-value="phaseFilter"
            :label="$t('components_warehouse_statevents.phaseLabel')"
            :options="phaseOptions"
            @update:model-value="(v) => (phaseFilter = v as PhaseFilter)"
          />
          <warehouse-option-select
            :model-value="kindFilter"
            :label="$t('components_warehouse_statevents.kindLabel')"
            :options="kindOptions"
            @update:model-value="(v) => (kindFilter = v as KindFilter)"
          />
        </div>
        <v-row class="mb-2">
          <v-col v-for="slot in playerSlots" :key="slot" cols="12" md="6">
            <div class="text-subtitle-2 mb-1">
              <span class="wh-se-swatch" :style="{ background: slotColor(slot) }"></span>
              <race-icon :key="slotRace(slot)" :race="raceEnum(slotRace(slot))" />
              {{ slotName(slot) }}
            </div>
            <div class="elevation-1 overflow-y-auto wh-se-bo">
              <table class="custom-table">
                <tbody>
                  <tr v-for="(row, idx) in buildRows(slot)" :key="idx">
                    <td class="number-text wh-se-clock">{{ row.clock }}</td>
                    <td class="number-text text-medium-emphasis wh-se-food">{{ row.food_used }}/{{ row.food_cap }}</td>
                    <td>
                      <warehouse-entity-icon :code="row.type_code" :name="row.name" />
                      {{ row.name }}
                      <span v-if="row.phase === 'cancel'" class="w3-lost text-caption ml-1">
                        {{ row.start_clock
                          ? $t("components_warehouse_statevents.cancelledOfStart", { clock: row.start_clock })
                          : $t("components_warehouse_statevents.cancelled") }}
                      </span>
                      <span v-else-if="row.cancelled" class="w3-lost text-caption ml-1">
                        {{ $t("components_warehouse_statevents.cancelledAt", { clock: row.cancelled_clock }) }}
                      </span>
                      <span v-else-if="phaseFilter === 'all'" class="text-caption text-medium-emphasis ml-1">{{ row.phase }}</span>
                    </td>
                  </tr>
                  <tr v-if="!buildRows(slot).length">
                    <td colspan="3" class="text-center text-medium-emphasis">
                      {{ $t("components_warehouse_stats.noData") }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-col>
        </v-row>

        <!-- Economy -->
        <div class="wh-se-section text-h6">{{ $t("components_warehouse_statevents.economy") }}</div>
        <v-row class="mb-2">
          <v-col v-for="series in econSeries" :key="series.key" cols="12" md="4">
            <div class="text-subtitle-2 mb-1">{{ series.label }}</div>
            <line-chart-generic :data="series.data" :options="econOptions" />
          </v-col>
        </v-row>

        <!-- Map activity -->
        <template v-if="detail.minimap">
          <div class="wh-se-section text-h6">{{ $t("components_warehouse_statevents.mapActivity") }}</div>
          <warehouse-stat-events-minimap :detail="detail" :slot-color="slotColor" class="mb-4" />
        </template>

        <!-- Combat: K/D, kills by unit, damage pairs -->
        <div class="wh-se-section text-h6">{{ $t("components_warehouse_statevents.combat") }}</div>
        <v-row class="mb-2">
          <v-col cols="12" md="4">
            <div class="text-subtitle-2 mb-1">{{ $t("components_warehouse_statevents.kd") }}</div>
            <div class="elevation-1">
              <table class="custom-table">
                <tbody>
                  <tr v-for="row in detail.kd_by_player" :key="row.slot">
                    <td>
                      <span class="wh-se-swatch" :style="{ background: slotColor(row.slot) }"></span>
                      <race-icon :key="slotRace(row.slot)" :race="raceEnum(slotRace(row.slot))" />
                      {{ row.name }}
                    </td>
                    <td class="text-end number-text">
                      {{ row.kills }} / {{ row.deaths }}
                      <div v-if="row.denies" class="text-caption text-medium-emphasis">
                        {{ $t("components_warehouse_statevents.xpDenied", { count: row.denies, xp: row.xp_denied }) }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="text-subtitle-2 mb-1">{{ $t("components_warehouse_statevents.killsByUnit") }}</div>
            <div class="elevation-1 overflow-y-auto wh-se-bo">
              <table class="custom-table">
                <tbody>
                  <tr v-for="row in detail.kills_by_unit" :key="row.name">
                    <td>
                      <warehouse-entity-icon :code="row.code" :name="row.name" />
                      <span :class="{ 'w3-gray-gold-text': row.is_hero }">{{ row.name }}</span>
                    </td>
                    <td class="text-end number-text">{{ row.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="text-subtitle-2 mb-1">{{ $t("components_warehouse_statevents.topDamage") }}</div>
            <div class="elevation-1 overflow-y-auto wh-se-bo">
              <table class="custom-table">
                <tbody>
                  <tr v-for="(row, idx) in detail.damage_by_matchup" :key="idx">
                    <td>
                      <warehouse-entity-icon :code="row.source_code" :name="row.source_name" />
                      <span :class="{ 'w3-gray-gold-text': row.source_is_hero }">{{ row.source_name }}</span>
                      <v-icon size="x-small" class="mx-1">{{ mdiArrowRight }}</v-icon>
                      <warehouse-entity-icon :code="row.target_code" :name="row.target_name" />
                      <span :class="{ 'w3-gray-gold-text': row.target_is_hero }">{{ row.target_name }}</span>
                    </td>
                    <td class="text-end number-text">{{ row.damage.toLocaleString() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-col>
        </v-row>

        <!-- Heroes -->
        <div class="wh-se-section text-h6">{{ $t("components_warehouse_statevents.heroes") }}</div>
        <v-row class="mb-2">
          <v-col v-for="slot in playerSlots" :key="slot" cols="12" md="6">
            <div class="text-subtitle-2 mb-1">
              <span class="wh-se-swatch" :style="{ background: slotColor(slot) }"></span>
              <race-icon :key="slotRace(slot)" :race="raceEnum(slotRace(slot))" />
              {{ slotName(slot) }}
            </div>
            <div class="elevation-1 overflow-y-auto wh-se-bo">
              <table class="custom-table">
                <tbody>
                  <tr v-for="(row, idx) in heroRows(slot)" :key="idx">
                    <td class="number-text wh-se-clock">{{ row.clock }}</td>
                    <td><warehouse-entity-icon :code="row.hero_code" :name="row.hero" />{{ row.hero }}</td>
                    <td class="text-medium-emphasis">
                      {{ row.event }}<template v-if="row.detail">
                        <span> — </span>
                        <warehouse-entity-icon :name="row.detail" />
                        <span>{{ row.detail }}</span>
                      </template>
                      <span v-if="row.amount"> ({{ row.amount }})</span>
                    </td>
                  </tr>
                  <tr v-if="!heroRows(slot).length">
                    <td colspan="3" class="text-center text-medium-emphasis">
                      {{ $t("components_warehouse_stats.noData") }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-col>
        </v-row>

        <!-- Losses -->
        <div class="wh-se-section text-h6">{{ $t("components_warehouse_statevents.losses") }}</div>
        <div class="elevation-1 overflow-y-auto wh-se-losses mb-2">
          <table class="custom-table">
            <thead>
              <tr>
                <td class="text-medium-emphasis">{{ $t("components_warehouse_statevents.time") }}</td>
                <td class="text-medium-emphasis">{{ $t("components_warehouse_statevents.owner") }}</td>
                <td class="text-medium-emphasis">{{ $t("components_warehouse_statevents.unit") }}</td>
                <td class="text-medium-emphasis">{{ $t("components_warehouse_statevents.killedBy") }}</td>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in detail.deaths" :key="idx">
                <td class="number-text wh-se-clock">{{ row.clock }}</td>
                <td>
                  <span class="wh-se-swatch" :style="{ background: slotColor(row.victim_slot) }"></span>
                  <race-icon :key="slotRace(row.victim_slot)" :race="raceEnum(slotRace(row.victim_slot))" />
                  {{ slotName(row.victim_slot) }}
                </td>
                <td>
                  <warehouse-entity-icon :code="row.type_code" :name="row.name" />
                  <span :class="{ 'w3-gray-gold-text': !!row.is_hero }">{{ row.name }}</span>
                </td>
                <td>
                  <template v-if="row.killer_name">
                    <warehouse-entity-icon :name="row.killer_name" />
                    {{ row.killer_name }}<span v-if="row.killer" class="text-medium-emphasis"> ({{ row.killer }})</span>
                  </template>
                  <span v-else class="text-disabled">&mdash;</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="text-caption text-medium-emphasis mb-4">
          {{ $t("components_warehouse_statevents.betaNote") }}
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line as LineChartGeneric } from "vue-chartjs";
import WarehouseService from "@/services/WarehouseService";
import WarehouseEntityIcon from "@/components/warehouse/WarehouseEntityIcon.vue";
import WarehouseStatEventsMinimap from "@/components/warehouse/WarehouseStatEventsMinimap.vue";
import WarehouseStatEventsOverview from "@/components/warehouse/WarehouseStatEventsOverview.vue";
import WarehouseStatEventsTimeline from "@/components/warehouse/WarehouseStatEventsTimeline.vue";
import PlayerIcon from "@/components/matches/PlayerIcon.vue";
import RaceIcon from "@/components/player/RaceIcon.vue";
import { ERaceEnum } from "@/store/types";
import { raceToEnum } from "@/components/warehouse/warehouse-helpers";
import WarehouseOptionSelect from "@/components/warehouse/filters/WarehouseOptionSelect.vue";
import { ensureIconIndex } from "@/components/warehouse/warehouse-icons";
import {
  formatTimestampStringToDate,
  formatTimestampStringToDateTime,
} from "@/helpers/date-functions";
import type {
  StatEventsBuildRow,
  StatEventsDetail,
  StatEventsHeroRow,
  StatEventsPlayer,
  StatEventsReplay,
} from "@/store/warehouse/types";
import type { ChartData, ChartOptions } from "chart.js";
import { mdiArrowRight } from "@mdi/js";

ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

const { t } = useI18n();

const replays = ref<StatEventsReplay[]>([]);
const detail = ref<StatEventsDetail | null>(null);
const selectedId = ref("");
const loading = ref(false);
const detailLoading = ref(false);
const apiError = ref("");

type PhaseFilter = "build" | "cancel" | "all";
type KindFilter = "all" | "structure" | "unit" | "upgrade";
const phaseFilter = ref<PhaseFilter>("build");
const kindFilter = ref<KindFilter>("all");

const phaseOptions = [
  { value: "build", title: t("components_warehouse_statevents.phaseBuild") },
  { value: "cancel", title: t("components_warehouse_statevents.phaseCancels") },
  { value: "all", title: t("components_warehouse_statevents.phaseAll") },
];
const kindOptions = [
  { value: "all", title: t("components_warehouse_statevents.kindAll") },
  { value: "structure", title: t("components_warehouse_statevents.kindStructures") },
  { value: "unit", title: t("components_warehouse_statevents.kindUnits") },
  { value: "upgrade", title: t("components_warehouse_statevents.kindUpgrades") },
];

// Fixed slot → color identity, same palette the retired dashboard validated
// for dark surfaces; color follows the player everywhere on the page.
const SLOT_COLORS = ["#3987e5", "#c98500", "#199e70", "#e66767"];
function slotColor(slot: number): string {
  return SLOT_COLORS[slot % SLOT_COLORS.length];
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Bar scaled against the longest game currently shown (min 5% so short games read).
const maxDurationS = computed<number>(() => replays.value.reduce((max, r) => Math.max(max, r.duration_s), 1));

function durationBarWidth(r: StatEventsReplay): string {
  const pct = (r.duration_s / maxDurationS.value) * 100;
  return `${Math.max(5, Math.min(100, pct))}%`;
}

function playedAt(r: StatEventsReplay): string {
  return r.played_at ? formatTimestampStringToDate(r.played_at) : "";
}

function playedAtTooltip(r: StatEventsReplay): string {
  return r.played_at ? formatTimestampStringToDateTime(r.played_at) : "";
}

function playedAtLong(playedAtIso: string): string {
  return formatTimestampStringToDateTime(playedAtIso);
}

function groupByTeam(players: StatEventsPlayer[]): StatEventsPlayer[][] {
  const byTeam = new Map<number, StatEventsPlayer[]>();
  for (const p of players) byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p]);
  return [...byTeam.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
}

function teamsOf(r: StatEventsReplay): StatEventsPlayer[][] {
  return groupByTeam(r.players ?? []);
}

const playerSlots = computed<number[]>(() =>
  (detail.value?.replay.players ?? []).map((p) => p.slot)
);

const teams = computed<StatEventsPlayer[][]>(() => groupByTeam(detail.value?.replay.players ?? []));

function slotRace(slot: number): string {
  return detail.value?.replay.players.find((p) => p.slot === slot)?.race ?? "";
}

function raceEnum(race: string): ERaceEnum {
  return raceToEnum(race);
}

function slotName(slot: number): string {
  return detail.value?.slot_names?.[String(slot)] ?? `slot ${slot}`;
}

function buildRows(slot: number): StatEventsBuildRow[] {
  const rows = detail.value?.build_by_slot?.[String(slot)] ?? [];
  return rows.filter((r) => {
    if (phaseFilter.value === "build" && !(r.phase === "start" || r.phase === "train")) return false;
    if (phaseFilter.value === "cancel" && r.phase !== "cancel") return false;
    if (kindFilter.value !== "all" && !r.kind.startsWith(kindFilter.value)) return false;
    return true;
  });
}

function heroRows(slot: number): StatEventsHeroRow[] {
  return (detail.value?.heroes_by_slot?.[String(slot)] ?? []);
}

// Economy small-multiples: one chart per resource, one line per player.
const econSeries = computed(() => {
  const d = detail.value;
  if (!d) return [];
  const bySlot: Record<string, { x: number; gold: number; wood: number; food: number }[]> = {};
  for (const row of d.econ_rows) {
    (bySlot[String(row.player_slot)] ??= []).push({
      x: row.game_time_s,
      gold: row.gold,
      wood: row.wood,
      food: row.food_used,
    });
  }
  const make = (key: "gold" | "wood" | "food", label: string): { key: string; label: string; data: ChartData<"line"> } => ({
    key,
    label,
    data: {
      datasets: Object.entries(bySlot).map(([slot, rows]) => ({
        label: slotName(Number(slot)),
        data: rows.map((r) => ({ x: r.x / 60, y: r[key] })),
        borderColor: slotColor(Number(slot)),
        backgroundColor: slotColor(Number(slot)),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      })),
    },
  });
  return [
    make("gold", t("components_warehouse_statevents.gold")),
    make("wood", t("components_warehouse_statevents.lumber")),
    make("food", t("components_warehouse_statevents.food")),
  ];
});

const econOptions: ChartOptions<"line"> = {
  animation: false,
  maintainAspectRatio: true,
  interaction: { mode: "index", intersect: false },
  plugins: { legend: { display: false } },
  scales: {
    x: { type: "linear", title: { display: true, text: "min" } },
    y: { beginAtZero: true },
  },
};

async function select(replayId: string): Promise<void> {
  if (selectedId.value === replayId) return;
  selectedId.value = replayId;
  detailLoading.value = true;
  apiError.value = "";
  try {
    detail.value = await WarehouseService.getStatEventsDetail(replayId);
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Stat-events detail failed";
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
}

onMounted(async () => {
  void ensureIconIndex();
  loading.value = true;
  try {
    replays.value = await WarehouseService.getStatEventsReplays();
    if (replays.value.length) {
      await select(replays.value[0].replay_id);
    }
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Stat-events request failed";
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.wh-se-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 6px;
  vertical-align: baseline;
}

.wh-se-active {
  background: rgba(128, 128, 128, 0.12);
}

.wh-se-nowrap {
  flex-wrap: nowrap !important;
}

.wh-se-team {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 0;
  min-width: 0;

  &--left {
    align-items: flex-end;
  }
}

.wh-se-player {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  .wh-se-swatch {
    margin-right: 0;
  }
}

.wh-se-name {
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wh-se-vs {
  opacity: 0.7;
}

.wh-se-duration-bar {
  background-color: rgb(var(--v-theme-primary));
  height: 3px;
  border-radius: 2px;
  margin-top: 2px;
}

.wh-se-header {
  padding: 8px 16px 0;
}

.wh-se-ovo {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  grid-column-gap: 10px;
  margin-bottom: 4px;
}

.wh-se-side {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  align-items: flex-start;

  &--left {
    align-items: flex-end;
  }
}

.wh-se-side-player {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  .wh-se-swatch {
    margin-right: 0;
  }
}

.wh-se-bigname {
  font-weight: bold;
  font-size: 1.5em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  // Friz Medium's glyphs sit high in the line box (same optical nudge as the
  // native match-detail header).
  line-height: 1;
  transform: translateY(0.13em);
}

.wh-se-ovo-vs {
  font-size: 1.2em;
  font-weight: bold;
  padding: 0 8px;
  line-height: 1;
  transform: translateY(0.13em);
}

.wh-se-mapline {
  padding-top: 8px;
}

.wh-se-section {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin-top: 20px;
  margin-bottom: 8px;
  padding-bottom: 2px;
}

.wh-se-bo {
  max-height: 420px;
}

.wh-se-losses {
  max-height: 360px;
}

.wh-se-clock {
  width: 3.4em;
}

.wh-se-food {
  width: 3.8em;
}

@media (max-width: 750px) {
  .wh-se-bigname {
    font-size: 1.1em;
  }
}
</style>
