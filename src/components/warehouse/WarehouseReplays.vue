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
          @update:model-value="onRaceA"
        />
        <warehouse-race-select
          :model-value="raceB"
          :label="$t('views_warehouse.opponent')"
          @update:model-value="onRaceB"
        />
        <warehouse-map-select
          :model-value="mapName"
          :label="$t('views_warehouse.map')"
          :maps="maps"
          @update:model-value="onMap"
        />
        <warehouse-player-select
          :model-value="playerNames"
          :label="$t('views_warehouse.player')"
          :players="players"
          @update:model-value="onPlayers"
        />
        <mmr-select :mmr="mmr" @mmrFilterChanged="onMmr" />
        <warehouse-season-select
          :model-value="seasons"
          :label="$t('views_warehouse.season')"
          :seasons="seasonEntries"
          @update:model-value="onSeasons"
        />
      </div>
    </div>

    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="40" />
    </div>

    <template v-else>
      <warehouse-replays-table :replays="pageReplays" />

      <div v-if="total" class="text-center font-regular mt-2">
        {{ lowRange }} - {{ highRange }} {{ $t("views_warehouse.of") }} {{ total }}
      </div>
      <v-pagination
        v-if="totalPages > 1"
        v-model="page"
        :length="totalPages"
        total-visible="8"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import WarehouseRaceSelect from "@/components/warehouse/filters/WarehouseRaceSelect.vue";
import WarehouseMapSelect from "@/components/warehouse/filters/WarehouseMapSelect.vue";
import WarehouseSeasonSelect from "@/components/warehouse/filters/WarehouseSeasonSelect.vue";
import WarehousePlayerSelect from "@/components/warehouse/filters/WarehousePlayerSelect.vue";
import MmrSelect from "@/components/common/MmrSelect.vue";
import WarehouseReplaysTable from "@/components/warehouse/WarehouseReplaysTable.vue";
import WarehouseService from "@/services/WarehouseService";
import type { Mmr } from "@/store/match/types";
import type {
  MapEntry,
  PlayerEntry,
  Race,
  ReplayMetadata,
  SearchRequest,
  SeasonEntry,
} from "@/store/warehouse/types";

const PAGE_SIZE = 50;
// browse caps at 1000; 200 is plenty for the w3c-linked corpus and keeps paging client-side.
// ponytail: switch to server offset paging when the corpus outgrows this.
const FETCH_LIMIT = 200;

const maps = ref<MapEntry[]>([]);
const seasonEntries = ref<SeasonEntry[]>([]);
const players = ref<PlayerEntry[]>([]);

const raceA = ref<Race | null>(null);
const raceB = ref<Race | null>(null);
const mapName = ref<string | null>(null);
const playerNames = ref<string[]>([]);
const mmr = ref<Mmr>({ min: 0, max: 3000 });
const seasons = ref<number[]>([]);

const replays = ref<ReplayMetadata[]>([]);
const loading = ref(false);
const apiError = ref("");
const page = ref(1);

const total = computed<number>(() => replays.value.length);
const totalPages = computed<number>(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));
const pageReplays = computed<ReplayMetadata[]>(() =>
  replays.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
);
const lowRange = computed<number>(() => (total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1));
const highRange = computed<number>(() => Math.min(page.value * PAGE_SIZE, total.value));

function buildRequest(): SearchRequest {
  const req: SearchRequest = { w3c_linked_only: true, limit: FETCH_LIMIT };
  const matchup = [raceA.value, raceB.value].filter((r): r is Race => !!r);
  if (matchup.length) req.matchup = matchup;
  if (mapName.value) req.map_name = mapName.value;
  if (playerNames.value.length) req.player_names = playerNames.value;
  if (mmr.value.min > 0) req.min_mmr = mmr.value.min;
  if (mmr.value.max < 3000) req.max_mmr = mmr.value.max;
  if (seasons.value.length) req.seasons = seasons.value;
  return req;
}

async function load(): Promise<void> {
  loading.value = true;
  apiError.value = "";
  try {
    const res = await WarehouseService.browse(buildRequest());
    replays.value = res.replays;
    page.value = 1;
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Browse failed";
    replays.value = [];
  } finally {
    loading.value = false;
  }
}

function onRaceA(v: Race | null): void {
  raceA.value = v;
}
function onRaceB(v: Race | null): void {
  raceB.value = v;
}
function onMap(v: string | null): void {
  mapName.value = v;
}
function onPlayers(v: string[]): void {
  playerNames.value = v;
}
function onMmr(v: Mmr): void {
  mmr.value = v;
}
function onSeasons(v: number[]): void {
  seasons.value = v;
}

// Re-run browse whenever any filter changes.
watch([raceA, raceB, mapName, playerNames, mmr, seasons], load, { deep: true });

async function loadReference(): Promise<void> {
  const [mapsRes, seasonsRes, playersRes] = await Promise.allSettled([
    WarehouseService.getMaps(),
    WarehouseService.getSeasons(),
    WarehouseService.getPlayers(),
  ]);
  if (mapsRes.status === "fulfilled") maps.value = mapsRes.value;
  if (seasonsRes.status === "fulfilled") seasonEntries.value = seasonsRes.value;
  if (playersRes.status === "fulfilled") players.value = playersRes.value;
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
</style>
