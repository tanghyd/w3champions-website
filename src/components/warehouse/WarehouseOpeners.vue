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
        <v-btn-toggle
          :model-value="sort"
          density="compact"
          variant="outlined"
          divided
          mandatory
          @update:model-value="onSort"
        >
          <v-btn value="popular" size="small">{{ $t("components_warehouse_openers.popular") }}</v-btn>
          <v-btn value="winrate" size="small">{{ $t("components_warehouse_openers.highWinrate") }}</v-btn>
        </v-btn-toggle>
        <span v-if="sort === 'winrate'" class="text-caption text-medium-emphasis ml-2 text-no-wrap">
          {{ $t("components_warehouse_openers.winrateNote") }}
        </span>
      </div>
    </div>

    <!-- Breadcrumb of the current opener prefix. -->
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <v-chip size="small" variant="tonal" :class="{ 'wh-crumb-clickable': prefix.length }" @click="jumpTo(0)">
        <race-icon :race="raceEnum(myRace)" />
        <span class="ml-1">{{ $t("components_warehouse_openers.opening") }}</span>
      </v-chip>
      <template v-for="(code, idx) in prefix" :key="idx">
        <v-icon size="small">{{ mdiChevronRight }}</v-icon>
        <span class="wh-crumb-clickable" @click="jumpTo(idx + 1)">
          <warehouse-code-chip :code="code" :codes="codes" :clickable="true" />
        </span>
      </template>
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
              v-for="(child, idx) in children"
              :key="idx"
              class="cursor-pointer"
              @click="drillInto(child)"
            >
              <td>
                <div class="d-flex align-center flex-wrap ga-1">
                  <warehouse-code-chip
                    v-for="(code, cIdx) in newCodes(child)"
                    :key="cIdx"
                    :code="code"
                    :codes="codes"
                  />
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
            <tr v-if="!children.length">
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
import WarehouseMapSelect from "@/components/warehouse/filters/WarehouseMapSelect.vue";
import MmrSelect from "@/components/common/MmrSelect.vue";
import WarehouseCodeChip from "@/components/warehouse/WarehouseCodeChip.vue";
import WarehouseReplaysTable from "@/components/warehouse/WarehouseReplaysTable.vue";
import RaceIcon from "@/components/player/RaceIcon.vue";
import WarehouseService from "@/services/WarehouseService";
import type { Mmr } from "@/store/match/types";
import { ERaceEnum } from "@/store/types";
import { raceToEnum } from "@/components/warehouse/warehouse-helpers";
import { formatSecondsToDuration } from "@/helpers/date-functions";
import type {
  MapEntry,
  OpenerChild,
  OpenerCode,
  OpenersParams,
  Race,
  ReplayMetadata,
} from "@/store/warehouse/types";
import { mdiChevronRight, mdiClose, mdiPlayBoxMultiple } from "@mdi/js";

const maps = ref<MapEntry[]>([]);

const myRace = ref<Race>("Human");
const opponentRace = ref<Race | null>(null);
const mapName = ref<string | null>(null);
const mmr = ref<Mmr>({ min: 0, max: 3000 });
const sort = ref<"popular" | "winrate">("popular");
const prefix = ref<string[]>([]);

const children = ref<OpenerChild[]>([]);
const codes = ref<Record<string, OpenerCode>>({});
const totals = ref(0);
const loading = ref(false);
const apiError = ref("");

const dialogOpen = ref(false);
const dialogLoading = ref(false);
const dialogReplays = ref<ReplayMetadata[]>([]);
const dialogCount = ref(0);
const dialogPrefix = ref<string[]>([]);

function raceEnum(race: Race): ERaceEnum {
  return raceToEnum(race);
}

function buildParams(): OpenersParams {
  const params: OpenersParams = { race: myRace.value, sort: sort.value };
  if (opponentRace.value) params.opponent_race = opponentRace.value;
  if (mapName.value) params.map_name = mapName.value;
  if (prefix.value.length) params.prefix = prefix.value;
  if (mmr.value.min > 0) params.min_mmr = mmr.value.min;
  if (mmr.value.max < 3000) params.max_mmr = mmr.value.max;
  return params;
}

async function load(): Promise<void> {
  loading.value = true;
  apiError.value = "";
  try {
    const res = await WarehouseService.getOpeners(buildParams());
    children.value = res.children;
    codes.value = res.codes;
    totals.value = res.totals.matches;
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Openers request failed";
    children.value = [];
  } finally {
    loading.value = false;
  }
}

// New codes shown for a child = the path segment below the current prefix.
function newCodes(child: OpenerChild): string[] {
  return child.prefix.slice(prefix.value.length);
}

function winrate(child: OpenerChild): number {
  if (!child.matches) return 0;
  return Math.round((child.wins / child.matches) * 100);
}

function winrateClass(child: OpenerChild): string {
  return winrate(child) >= 50 ? "w3-won" : "w3-lost";
}

function avgDuration(child: OpenerChild): string {
  return formatSecondsToDuration(Math.round(child.avg_duration_min * 60));
}

function drillInto(child: OpenerChild): void {
  prefix.value = [...child.prefix];
  load();
}

function jumpTo(depth: number): void {
  if (depth >= prefix.value.length) return;
  prefix.value = prefix.value.slice(0, depth);
  load();
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

// Changing any scope filter resets the trie to its root.
function setFilter(key: "myRace" | "opponentRace" | "mapName", value: string | null): void {
  if (key === "myRace") myRace.value = (value as Race) ?? "Human";
  if (key === "opponentRace") opponentRace.value = value as Race | null;
  if (key === "mapName") mapName.value = value;
  prefix.value = [];
  load();
}

function onMmr(v: Mmr): void {
  mmr.value = v;
  prefix.value = [];
  load();
}

function onSort(v: "popular" | "winrate"): void {
  sort.value = v;
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

.wh-crumb-clickable {
  cursor: pointer;
}
</style>
