<template>
  <div>
    <v-alert v-if="apiError" type="error" variant="tonal" density="compact" class="mb-3">
      {{ apiError }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="40" />
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
            <race-icon :race="raceEnum(group.race)" />
            <span class="text-subtitle-2">{{ $t(`races.${raceKey(group.race)}`) }}</span>
          </div>
          <div v-if="group.heroes.length" class="chart-wrap" style="position: relative">
            <bar-chart :chart-data="heroData(group)" :chart-options="heroOptions" />
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
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import BarChart from "@/components/overall-statistics/BarChart.vue";
import RaceIcon from "@/components/player/RaceIcon.vue";
import WarehouseService from "@/services/WarehouseService";
import { ERaceEnum } from "@/store/types";
import { raceShort, raceToEnum } from "@/components/warehouse/warehouse-helpers";
import type {
  HeroPickrateGroup,
  HistogramBucket,
  MatchupStat,
  WarehouseStats,
} from "@/store/warehouse/types";
import type { ChartData, ChartOptions } from "chart.js";

const { t } = useI18n();

const stats = ref<WarehouseStats | null>(null);
const loading = ref(false);
const apiError = ref("");

const primaryColor = ref("rgb(54, 162, 235)");
const wonColor = "rgb(76, 175, 80)";
const lostColor = "rgb(229, 57, 53)";

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
      backgroundColor: matchups.value.map((m) => withAlpha(m.pct_a >= 50 ? wonColor : lostColor, 0.6)),
      borderColor: matchups.value.map((m) => (m.pct_a >= 50 ? wonColor : lostColor)),
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

// (b) Hero pickrates: small bar chart per race, height = pick %.
function heroData(group: HeroPickrateGroup): ChartData<"bar"> {
  return {
    labels: group.heroes.map((h) => h.hero),
    datasets: [
      {
        label: t("components_warehouse_stats.pickPct"),
        data: group.heroes.map((h) => Math.round(h.pct)),
        backgroundColor: withAlpha(primaryColor.value, 0.5),
        borderColor: primaryColor.value,
        borderWidth: 1,
      },
    ],
  };
}

const heroOptions = computed<ChartOptions<"bar">>(() => ({
  plugins: { legend: { display: false } },
  maintainAspectRatio: true,
  scales: { y: { beginAtZero: true } },
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

function resolvePrimary(): void {
  const raw = getComputedStyle(document.body).getPropertyValue("--v-theme-primary").trim();
  if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(raw)) {
    primaryColor.value = `rgb(${raw.replace(/\s+/g, "")})`;
  }
}

onMounted(async () => {
  resolvePrimary();
  loading.value = true;
  try {
    stats.value = await WarehouseService.getStats();
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Stats request failed";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.chart-wrap {
  max-width: 900px;
}
</style>
