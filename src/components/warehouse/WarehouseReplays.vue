<template>
  <div class="warehouse-replays">
    <v-alert v-if="apiError" type="error" variant="tonal" class="mb-3">
      {{ apiError }}
    </v-alert>

    <div v-if="health" class="text-caption text-medium-emphasis mb-2">
      {{ health.replays.toLocaleString() }} replays &middot;
      {{ health.w3c_replays.toLocaleString() }} w3c-linked &middot;
      duration {{ health.duration_minutes.min }}&ndash;{{ health.duration_minutes.max }} min
    </div>

    <!-- Filter row: any value here switches from GET /v1/replays to POST /v1/browse. -->
    <div class="filter-row d-flex align-center flex-wrap ga-3 mb-3">
      <v-text-field
        v-model="playerName"
        label="Player name"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        style="max-width: 240px"
        @keyup.enter="applyFilters"
      />
      <v-select
        v-model="mapName"
        :items="mapNames"
        label="Map"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        style="max-width: 260px"
      />
      <v-select
        v-model="matchup"
        :items="races"
        label="Matchup (up to 2)"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        multiple
        chips
        closable-chips
        style="max-width: 280px"
        :error="matchup.length > 2"
      />
      <v-btn color="primary" variant="flat" :loading="loading" @click="applyFilters">Apply</v-btn>
      <v-btn v-if="filtered" variant="text" @click="clearFilters">Clear</v-btn>
    </div>

    <div v-if="loading && replays.length === 0" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="40" />
    </div>

    <template v-else>
      <div v-if="filtered && count != null" class="text-caption text-medium-emphasis mb-2">
        {{ count }} matching {{ count === 1 ? "replay" : "replays" }}
      </div>

      <v-row v-if="replays.length">
        <v-col v-for="replay in replays" :key="replay.replay_id" cols="12" md="6">
          <replay-card :replay="replay" />
        </v-col>
      </v-row>

      <div v-else-if="!apiError" class="text-medium-emphasis py-6 text-center">
        No replays found.
      </div>

      <!-- Load-more only pages the unfiltered GET /v1/replays list. -->
      <div v-if="!filtered && canLoadMore" class="d-flex justify-center py-4">
        <v-btn variant="outlined" :loading="loading" @click="loadMore">Load more</v-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ReplayCard from "@/components/warehouse/ReplayCard.vue";
import WarehouseService from "@/services/WarehouseService";
import { WAREHOUSE_URL } from "@/config/env";
import type { Race, ReplayMetadata, SearchRequest, WarehouseHealth } from "@/store/warehouse/types";

const PAGE = 50;
const races: Race[] = ["Human", "Orc", "NightElf", "Undead", "Random"];

const replays = ref<ReplayMetadata[]>([]);
const health = ref<WarehouseHealth | null>(null);
const mapNames = ref<string[]>([]);
const loading = ref(false);
const apiError = ref("");
const offset = ref(0);
const canLoadMore = ref(false);
const count = ref<number | null>(null);

const playerName = ref("");
const mapName = ref<string | null>(null);
const matchup = ref<Race[]>([]);
const filtered = ref(false);

function unreachable(): string {
  return `Warehouse API not reachable at ${WAREHOUSE_URL} — docker compose up`;
}

async function loadHeaderData(): Promise<void> {
  try {
    health.value = await WarehouseService.getHealth();
  } catch {
    // health strip is best-effort; the list load surfaces the real error
  }
  try {
    const maps = await WarehouseService.getMaps();
    mapNames.value = maps.map((m) => m.name);
  } catch {
    mapNames.value = [];
  }
}

async function loadReplays(reset: boolean): Promise<void> {
  loading.value = true;
  apiError.value = "";
  try {
    if (reset) offset.value = 0;
    const page = await WarehouseService.getReplays(PAGE, offset.value);
    replays.value = reset ? page : [...replays.value, ...page];
    canLoadMore.value = page.length === PAGE;
    offset.value += page.length;
  } catch (e) {
    apiError.value = e instanceof Error ? `${unreachable()} (${e.message})` : unreachable();
    if (reset) replays.value = [];
  } finally {
    loading.value = false;
  }
}

async function runBrowse(): Promise<void> {
  loading.value = true;
  apiError.value = "";
  const req: SearchRequest = { limit: 100 };
  if (playerName.value.trim()) req.player_names = [playerName.value.trim()];
  if (mapName.value) req.map_name = mapName.value;
  if (matchup.value.length) req.matchup = matchup.value.slice(0, 2);
  try {
    const res = await WarehouseService.browse(req);
    replays.value = res.replays;
    count.value = res.count;
    canLoadMore.value = false;
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Browse failed";
    replays.value = [];
  } finally {
    loading.value = false;
  }
}

function hasFilters(): boolean {
  return !!playerName.value.trim() || !!mapName.value || matchup.value.length > 0;
}

function applyFilters(): void {
  if (hasFilters()) {
    filtered.value = true;
    runBrowse();
  } else {
    clearFilters();
  }
}

function clearFilters(): void {
  playerName.value = "";
  mapName.value = null;
  matchup.value = [];
  filtered.value = false;
  count.value = null;
  loadReplays(true);
}

function loadMore(): void {
  loadReplays(false);
}

onMounted(async () => {
  await Promise.all([loadHeaderData(), loadReplays(true)]);
});
</script>
