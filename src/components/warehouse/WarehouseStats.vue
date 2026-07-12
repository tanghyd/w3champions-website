<template>
  <div>
    <v-alert v-if="apiError" type="error" variant="tonal" density="compact" class="mb-3">
      {{ apiError }}
    </v-alert>

    <div class="matches-filter-scroll mb-2">
      <div class="matches-filter-row d-flex align-center">
        <warehouse-race-select
          :model-value="raceA"
          :label="$t('views_warehouse.race')"
          @update:model-value="(v) => (raceA = v)"
        />
        <warehouse-race-select
          :model-value="raceB"
          :label="$t('views_warehouse.opponent')"
          @update:model-value="(v) => (raceB = v)"
        />
        <warehouse-map-select
          :model-value="mapName"
          :label="$t('views_warehouse.map')"
          :maps="maps"
          @update:model-value="(v) => (mapName = v)"
        />
        <mmr-select :mmr="mmr" @mmrFilterChanged="(v) => (mmr = v)" />
        <warehouse-season-select
          :model-value="seasons"
          :label="$t('views_warehouse.season')"
          :seasons="seasonEntries"
          @update:model-value="(v) => (seasons = v)"
        />
        <v-chip v-if="stats" size="small" variant="tonal" color="primary" class="ml-2 text-no-wrap">
          {{ $t("components_warehouse_stats.gamesInScope", { n: stats.scope_count.toLocaleString() }) }}
        </v-chip>
      </div>
    </div>

    <div class="text-caption text-medium-emphasis mb-2">
      {{ $t("components_warehouse_stats.scopeNote") }}
    </div>

    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="40" />
    </div>

    <div v-else-if="stats && stats.scope_count === 0" class="text-medium-emphasis py-8 text-center">
      {{ $t("components_warehouse_stats.emptyScope") }}
    </div>

    <template v-else-if="stats">
      <!-- Matchup winrates -->
      <div class="text-h6 mt-2 mb-2">{{ $t("components_warehouse_stats.matchupWinrates") }}</div>
      <div v-if="matchups.length" class="chart-wrap mb-8" style="position: relative">
        <bar-chart :chart-data="matchupData" :chart-options="matchupOptions" />
      </div>
      <div v-else class="text-medium-emphasis py-4">{{ $t("components_warehouse_stats.noData") }}</div>

      <!-- Hero pickrates per race -->
      <div class="text-h6 mt-2 mb-2">{{ $t("components_warehouse_stats.heroPickrates") }}</div>
      <v-row v-if="heroGroups.length">
        <v-col v-for="group in heroGroups" :key="group.race" cols="12" sm="6" md="3">
          <div class="d-flex align-center ga-2 mb-1">
            <race-icon :key="group.race" :race="raceEnum(group.race)" />
            <span class="text-subtitle-2">{{ $t(`races.${raceKey(group.race)}`) }}</span>
          </div>
          <div v-if="group.heroes.length" class="wh-hero-rows">
            <div v-for="h in group.heroes" :key="h.hero" class="wh-hero-row">
              <warehouse-entity-icon :name="h.hero" :size="24" />
              <span class="wh-hero-name">{{ h.hero }}</span>
              <span class="wh-hero-bar"><span class="wh-hero-bar-fill" :style="{ width: h.pct + '%' }"></span></span>
              <span class="number-text wh-hero-pct">{{ h.pct }}%</span>
            </div>
          </div>
          <div v-else class="text-medium-emphasis py-2">{{ $t("components_warehouse_stats.noData") }}</div>
        </v-col>
      </v-row>
      <div v-else class="text-medium-emphasis py-4">{{ $t("components_warehouse_stats.noData") }}</div>

      <!-- Histograms -->
      <v-row class="mt-2">
        <v-col cols="12" md="4">
          <div class="text-subtitle-1 mb-2">{{ $t("components_warehouse_stats.gameDuration") }}</div>
          <div v-if="hasData(stats.durations)" class="chart-wrap" style="position: relative">
            <bar-chart :chart-data="histogramData(stats.durations)" :chart-options="histogramOptions" />
          </div>
          <div v-else class="text-medium-emphasis py-2">{{ $t("components_warehouse_stats.noData") }}</div>
        </v-col>
        <v-col cols="12" md="4">
          <div class="text-subtitle-1 mb-2">{{ $t("components_warehouse_stats.apm") }}</div>
          <div v-if="hasData(stats.apm)" class="chart-wrap" style="position: relative">
            <bar-chart :chart-data="histogramData(stats.apm)" :chart-options="histogramOptions" />
          </div>
          <div v-else class="text-medium-emphasis py-2">{{ $t("components_warehouse_stats.noData") }}</div>
        </v-col>
        <v-col cols="12" md="4">
          <div class="text-subtitle-1 mb-2">{{ $t("components_warehouse_stats.mmr") }}</div>
          <div v-if="hasData(stats.mmr)" class="chart-wrap" style="position: relative">
            <bar-chart :chart-data="histogramData(stats.mmr)" :chart-options="histogramOptions" />
          </div>
          <div v-else class="text-medium-emphasis py-2">{{ $t("components_warehouse_stats.noData") }}</div>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import BarChart from "@/components/overall-statistics/BarChart.vue";
import WarehouseEntityIcon from "@/components/warehouse/WarehouseEntityIcon.vue";
import { ensureIconIndex } from "@/components/warehouse/warehouse-icons";
import RaceIcon from "@/components/player/RaceIcon.vue";
import WarehouseRaceSelect from "@/components/warehouse/filters/WarehouseRaceSelect.vue";
import WarehouseMapSelect from "@/components/warehouse/filters/WarehouseMapSelect.vue";
import WarehouseSeasonSelect from "@/components/warehouse/filters/WarehouseSeasonSelect.vue";
import MmrSelect from "@/components/common/MmrSelect.vue";
import WarehouseService from "@/services/WarehouseService";
import type { Mmr } from "@/store/match/types";
import { ERaceEnum } from "@/store/types";
import { raceShort, raceToEnum } from "@/components/warehouse/warehouse-helpers";
import type {
  HeroPickrateGroup,
  HistogramBucket,
  MapEntry,
  MatchupStat,
  Race,
  SeasonEntry,
  StatsParams,
  WarehouseStats,
} from "@/store/warehouse/types";
import type { ChartData, ChartOptions } from "chart.js";

const { t } = useI18n();

const stats = ref<WarehouseStats | null>(null);
const loading = ref(false);
const apiError = ref("");

const maps = ref<MapEntry[]>([]);
const seasonEntries = ref<SeasonEntry[]>([]);
const raceA = ref<Race | null>(null);
const raceB = ref<Race | null>(null);
const mapName = ref<string | null>(null);
const mmr = ref<Mmr>({ min: 0, max: 3000 });
const seasons = ref<number[]>([]);

const primaryColor = ref("rgb(54, 162, 235)");
const wonColor = ref("rgb(76, 175, 80)");
const lostColor = ref("rgb(229, 57, 53)");

const matchups = computed<MatchupStat[]>(() => stats.value?.matchups ?? []);
const heroGroups = computed<HeroPickrateGroup[]>(() => stats.value?.hero_pickrates ?? []);

function raceEnum(race: string): ERaceEnum {
  return raceToEnum(race);
}
function raceKey(race: string): string {
  return ERaceEnum[raceToEnum(race)];
}
function hasData(buckets: HistogramBucket[]): boolean {
  return buckets.some((b) => b.n > 0);
}

function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})` : color;
}

// (a) Matchup winrates: one bar per pairing, height = pct_a (race_a winrate).
const matchupData = computed<ChartData<"bar">>(() => ({
  labels: matchups.value.map((m) => `${raceShort(m.race_a)} vs ${raceShort(m.race_b)}`),
  datasets: [
    {
      label: t("components_warehouse_stats.winratePct"),
      data: matchups.value.map((m) => Math.round(m.pct_a)),
      backgroundColor: matchups.value.map((m) => withAlpha(m.pct_a >= 50 ? wonColor.value : lostColor.value, 0.6)),
      borderColor: matchups.value.map((m) => (m.pct_a >= 50 ? wonColor.value : lostColor.value)),
      borderWidth: 1,
    },
  ],
}));

const matchupOptions = computed<ChartOptions<"bar">>(() => ({
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      callbacks: {
        label: (item: { dataIndex: number; formattedValue: string }) => {
          const games = matchups.value[item.dataIndex]?.games ?? 0;
          return `${item.formattedValue}% (${games} ${t("components_warehouse_stats.games")})`;
        },
      },
    },
  },
  maintainAspectRatio: true,
  scales: { y: { beginAtZero: true, max: 100 } },
}));

// (c) Histograms: x = bucket, y = n.
function histogramData(buckets: HistogramBucket[]): ChartData<"bar"> {
  return {
    labels: buckets.map((b) => b.bucket),
    datasets: [
      {
        label: t("components_warehouse_stats.count"),
        data: buckets.map((b) => b.n),
        backgroundColor: withAlpha(primaryColor.value, 0.5),
        borderColor: primaryColor.value,
        borderWidth: 1,
      },
    ],
  };
}

const histogramOptions = computed<ChartOptions<"bar">>(() => ({
  plugins: { legend: { display: false } },
  maintainAspectRatio: true,
  scales: { y: { beginAtZero: true } },
}));

// chart.js can't read CSS vars — resolve the theme tokens once at mount so
// the chart colors follow the active race theme like every styled element.
function resolveThemeColor(token: string, into: { value: string }): void {
  const raw = getComputedStyle(document.body).getPropertyValue(token).trim();
  if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(raw)) {
    into.value = `rgb(${raw.replace(/\s+/g, "")})`;
  }
}

function resolvePrimary(): void {
  resolveThemeColor("--v-theme-primary", primaryColor);
  resolveThemeColor("--v-theme-success", wonColor);
  resolveThemeColor("--v-theme-lost", lostColor);
}

function buildParams(): StatsParams {
  // Analytics is match-linked-only: aggregates cover only replays that map
  // to a w3champions match (Stat Events is the sole exception).
  const params: StatsParams = { w3c_linked_only: true };
  const matchup = [raceA.value, raceB.value].filter((r): r is Race => !!r);
  if (matchup.length) params.matchup = matchup;
  if (mapName.value) params.map_name = mapName.value;
  if (seasons.value.length) params.seasons = seasons.value;
  if (mmr.value.min > 0) params.min_mmr = mmr.value.min;
  if (mmr.value.max < 3000) params.max_mmr = mmr.value.max;
  return params;
}

// Guard against out-of-order responses: only the newest request may write state.
let loadSeq = 0;

async function load(): Promise<void> {
  const seq = ++loadSeq;
  loading.value = true;
  apiError.value = "";
  try {
    const res = await WarehouseService.getStats(buildParams());
    if (seq !== loadSeq) return;
    stats.value = res;
  } catch (e) {
    if (seq !== loadSeq) return;
    apiError.value = e instanceof Error ? e.message : "Stats request failed";
  } finally {
    if (seq === loadSeq) loading.value = false;
  }
}

// Re-fetch whenever any filter changes.
watch([raceA, raceB, mapName, mmr, seasons], load, { deep: true });

async function loadReference(): Promise<void> {
  const [mapsRes, seasonsRes] = await Promise.allSettled([
    WarehouseService.getMaps(),
    WarehouseService.getSeasons(),
  ]);
  if (mapsRes.status === "fulfilled") maps.value = mapsRes.value;
  if (seasonsRes.status === "fulfilled") seasonEntries.value = seasonsRes.value;
}

onMounted(async () => {
  resolvePrimary();
  void ensureIconIndex();
  await loadReference();
  await load();
});
</script>

<style lang="scss" scoped>
.chart-wrap {
  max-width: 900px;
}

.wh-hero-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}

.wh-hero-name {
  flex: 0 0 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.wh-hero-bar {
  flex: 1 1 auto;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  overflow: hidden;
}

.wh-hero-bar-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.65);
}

.wh-hero-pct {
  flex: 0 0 3.2em;
  text-align: right;
  font-size: 0.82rem;
}

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
</style>
