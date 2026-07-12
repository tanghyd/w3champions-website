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
      <!-- Replay index -->
      <div class="elevation-1 overflow-x-auto overflow-y-hidden mb-4">
        <table class="custom-table">
          <thead>
            <tr>
              <td class="text-medium-emphasis">{{ $t("components_warehouse_statevents.players") }}</td>
              <td class="text-medium-emphasis text-end">{{ $t("components_warehouse_statevents.duration") }}</td>
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
                <span v-for="p in r.players" :key="p.slot" class="mr-3 text-no-wrap">
                  <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
                  {{ p.name }}
                </span>
              </td>
              <td class="text-end number-text">{{ clock(r.duration_s) }}</td>
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
        <!-- Game summary -->
        <div class="d-flex align-center flex-wrap ga-3 mb-4">
          <span v-for="p in detail.replay.players" :key="p.slot" class="text-subtitle-2 text-no-wrap">
            <span class="wh-se-swatch" :style="{ background: slotColor(p.slot) }"></span>
            {{ p.name }} <span class="text-medium-emphasis">({{ p.race }})</span>
          </span>
          <v-chip size="small" variant="tonal">{{ detail.duration_clock }}</v-chip>
          <v-chip size="small" variant="tonal" :color="detail.qa_ok ? 'success' : 'error'">
            {{ detail.qa_ok
              ? $t("components_warehouse_statevents.qaOk")
              : $t("components_warehouse_statevents.qaGaps") }}
          </v-chip>
        </div>

        <!-- Build orders -->
        <div class="text-h6 mb-1">{{ $t("components_warehouse_statevents.buildOrders") }}</div>
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <v-btn-toggle v-model="phaseFilter" density="compact" variant="outlined" divided mandatory>
            <v-btn value="build" size="small">{{ $t("components_warehouse_statevents.phaseBuild") }}</v-btn>
            <v-btn value="cancel" size="small">{{ $t("components_warehouse_statevents.phaseCancels") }}</v-btn>
            <v-btn value="all" size="small">{{ $t("components_warehouse_statevents.phaseAll") }}</v-btn>
          </v-btn-toggle>
          <v-btn-toggle v-model="kindFilter" density="compact" variant="outlined" divided mandatory>
            <v-btn value="all" size="small">{{ $t("components_warehouse_statevents.kindAll") }}</v-btn>
            <v-btn value="structure" size="small">{{ $t("components_warehouse_statevents.kindStructures") }}</v-btn>
            <v-btn value="unit" size="small">{{ $t("components_warehouse_statevents.kindUnits") }}</v-btn>
            <v-btn value="upgrade" size="small">{{ $t("components_warehouse_statevents.kindUpgrades") }}</v-btn>
          </v-btn-toggle>
        </div>
        <v-row class="mb-2">
          <v-col v-for="slot in playerSlots" :key="slot" cols="12" md="6">
            <div class="text-subtitle-2 mb-1">
              <span class="wh-se-swatch" :style="{ background: slotColor(slot) }"></span>
              {{ slotName(slot) }}
            </div>
            <div class="elevation-1 overflow-y-auto wh-se-bo">
              <table class="custom-table">
                <tbody>
                  <tr v-for="(row, idx) in buildRows(slot)" :key="idx">
                    <td class="number-text wh-se-clock">{{ row.clock }}</td>
                    <td class="number-text text-medium-emphasis wh-se-food">{{ row.food_used }}/{{ row.food_cap }}</td>
                    <td>
                      {{ row.name }}
                      <span v-if="row.phase === 'cancel'" class="w3-lost text-caption ml-1">
                        {{ $t("components_warehouse_statevents.cancelled") }}
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
        <div class="text-h6 mb-2">{{ $t("components_warehouse_statevents.economy") }}</div>
        <v-row class="mb-2">
          <v-col v-for="series in econSeries" :key="series.key" cols="12" md="4">
            <div class="text-subtitle-2 mb-1">{{ series.label }}</div>
            <line-chart-generic :data="series.data" :options="econOptions" />
          </v-col>
        </v-row>

        <!-- Combat: K/D, kills by unit, damage pairs -->
        <div class="text-h6 mb-2">{{ $t("components_warehouse_statevents.combat") }}</div>
        <v-row class="mb-2">
          <v-col cols="12" md="4">
            <div class="text-subtitle-2 mb-1">{{ $t("components_warehouse_statevents.kd") }}</div>
            <div class="elevation-1">
              <table class="custom-table">
                <tbody>
                  <tr v-for="row in detail.kd_by_player" :key="row.slot">
                    <td><span class="wh-se-swatch" :style="{ background: slotColor(row.slot) }"></span>{{ row.name }}</td>
                    <td class="text-end number-text">{{ row.kills }} / {{ row.deaths }}</td>
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
                    <td :class="{ 'w3-race-gold': row.is_hero }">{{ row.name }}</td>
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
                      <span :class="{ 'w3-race-gold': row.source_is_hero }">{{ row.source_name }}</span>
                      <v-icon size="x-small">{{ mdiArrowRight }}</v-icon>
                      <span :class="{ 'w3-race-gold': row.target_is_hero }">{{ row.target_name }}</span>
                    </td>
                    <td class="text-end number-text">{{ row.damage.toLocaleString() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-col>
        </v-row>

        <!-- Heroes -->
        <div class="text-h6 mb-2">{{ $t("components_warehouse_statevents.heroes") }}</div>
        <v-row class="mb-2">
          <v-col v-for="slot in playerSlots" :key="slot" cols="12" md="6">
            <div class="text-subtitle-2 mb-1">
              <span class="wh-se-swatch" :style="{ background: slotColor(slot) }"></span>
              {{ slotName(slot) }}
            </div>
            <div class="elevation-1 overflow-y-auto wh-se-bo">
              <table class="custom-table">
                <tbody>
                  <tr v-for="(row, idx) in heroRows(slot)" :key="idx">
                    <td class="number-text wh-se-clock">{{ row.clock }}</td>
                    <td>{{ row.hero }}</td>
                    <td class="text-medium-emphasis">
                      {{ row.event }}<span v-if="row.detail"> — {{ row.detail }}</span>
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
        <div class="text-h6 mb-2">{{ $t("components_warehouse_statevents.losses") }}</div>
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
                  {{ slotName(row.victim_slot) }}
                </td>
                <td :class="{ 'w3-race-gold': !!row.is_hero }">{{ row.name }}</td>
                <td>
                  <template v-if="row.killer_name">{{ row.killer_name }}<span v-if="row.killer" class="text-medium-emphasis"> ({{ row.killer }})</span></template>
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
import type {
  StatEventsBuildRow,
  StatEventsDetail,
  StatEventsHeroRow,
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

const phaseFilter = ref<"build" | "cancel" | "all">("build");
const kindFilter = ref<"all" | "structure" | "unit" | "upgrade">("all");

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

const playerSlots = computed<number[]>(() =>
  (detail.value?.replay.players ?? []).map((p) => p.slot)
);

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
</style>
