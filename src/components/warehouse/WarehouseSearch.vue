<template>
  <div>
    <v-alert v-if="apiError" type="error" variant="tonal" density="compact" class="mb-3">
      {{ apiError }}
    </v-alert>

    <div class="text-caption text-medium-emphasis mb-2">
      {{ $t("components_warehouse_search.scopeNote") }}
    </div>

    <!-- Scope filters: matchup first, then map / seasons / mmr / duration / players. -->
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
        <warehouse-season-select
          :model-value="seasons"
          :label="$t('views_warehouse.season')"
          :seasons="seasonEntries"
          @update:model-value="(v) => (seasons = v)"
        />
        <mmr-select :mmr="mmr" @mmrFilterChanged="(v) => (mmr = v)" />
        <duration-select :duration="duration" @durationFilterChanged="(v) => (duration = v ?? { min: 0, max: 14400 })" />
      </div>
    </div>

    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <warehouse-player-select
        :model-value="playerNames"
        :label="$t('views_warehouse.player')"
        :players="players"
        @update:model-value="(v) => (playerNames = v)"
      />
      <v-switch
        v-if="playerNames.length >= 2"
        v-model="playersMatchAll"
        :label="$t('components_warehouse_search.matchAllPlayers')"
        density="compact"
        hide-details
        color="primary"
      />
    </div>

    <!-- Sequence groups -->
    <v-card
      v-for="(group, gIdx) in groups"
      :key="gIdx"
      variant="outlined"
      class="mb-3 wh-group-card"
    >
      <v-card-title class="d-flex align-center py-2">
        <span class="text-subtitle-1">
          {{ gIdx === 0 ? $t("components_warehouse_search.groupYours") : $t("components_warehouse_search.groupOpponent") }}
        </span>
        <v-spacer />
        <v-btn size="small" variant="text" @click="removeGroup(gIdx)">
          <v-icon start>{{ mdiClose }}</v-icon>
          {{ $t("components_warehouse_search.remove") }}
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div class="d-flex flex-wrap align-center ga-3">
          <warehouse-race-select
            :model-value="group.race"
            :label="$t('views_warehouse.race')"
            :allow-any="false"
            @update:model-value="(v) => (group.race = v ?? 'Human')"
          />
          <span v-if="gIdx === 1" class="text-caption text-medium-emphasis">
            {{ $t("components_warehouse_search.groupOpponentRaceHint") }}
          </span>
          <v-btn-toggle
            v-model="group.result"
            density="compact"
            variant="outlined"
            divided
          >
            <v-btn :value="null" size="small">{{ $t("components_warehouse_search.resultAny") }}</v-btn>
            <v-btn value="won" size="small" class="w3-won">{{ $t("components_warehouse_search.resultWon") }}</v-btn>
            <v-btn value="lost" size="small" class="w3-lost">{{ $t("components_warehouse_search.resultLost") }}</v-btn>
          </v-btn-toggle>
        </div>

        <div class="mt-3">
          <div
            v-for="(step, sIdx) in group.steps"
            :key="sIdx"
            class="step-row d-flex flex-wrap align-center ga-2 mb-2"
          >
            <span class="text-caption text-medium-emphasis" style="width: 22px">{{ sIdx + 1 }}.</span>
            <v-select
              v-model="step.event_type"
              :items="eventTypeItems"
              :label="$t('components_warehouse_search.event')"
              density="compact"
              variant="outlined"
              hide-details
              style="min-width: 170px"
              @update:model-value="() => onEventTypeChange(step)"
            />
            <v-autocomplete
              v-model="step.subject"
              :items="mappingItems(step.event_type)"
              item-title="name"
              item-value="name"
              :label="$t('components_warehouse_search.subject')"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="min-width: 240px"
            >
              <template v-slot:item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="item.raw.name">
                  <template v-slot:prepend>
                    <v-img
                      v-if="item.raw.icon_url"
                      :src="assetUrl(item.raw.icon_url)"
                      width="24"
                      height="24"
                      class="mr-2"
                    />
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
            <v-text-field
              v-if="sIdx > 0"
              v-model.number="step.within_previous_seconds"
              type="number"
              :label="$t('components_warehouse_search.withinPrev')"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 160px"
            />
            <v-text-field
              v-model.number="step.time_from_seconds"
              type="number"
              :label="$t('components_warehouse_search.fromSec')"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 130px"
            />
            <v-text-field
              v-model.number="step.time_to_seconds"
              type="number"
              :label="$t('components_warehouse_search.toSec')"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 130px"
            />
            <v-btn icon size="x-small" variant="text" @click="removeStep(group, sIdx)">
              <v-icon>{{ mdiClose }}</v-icon>
            </v-btn>
          </div>
          <v-btn
            size="small"
            variant="text"
            :disabled="group.steps.length >= 8"
            @click="addStep(group)"
          >
            <v-icon start>{{ mdiPlus }}</v-icon>
            {{ $t("components_warehouse_search.addStep") }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <div class="d-flex align-center ga-3 mb-4">
      <v-btn v-if="groups.length < 2" variant="text" @click="addGroup">
        <v-icon start>{{ mdiPlus }}</v-icon>
        {{ $t("components_warehouse_search.addGroup") }}
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        variant="tonal"
        :loading="loading"
        :disabled="!hasConstraint"
        @click="runSearch"
      >
        <v-icon start>{{ mdiMagnify }}</v-icon>
        {{ $t("components_warehouse_search.search") }}
      </v-btn>
    </div>

    <!-- Results -->
    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" size="40" />
    </div>

    <template v-else-if="searched">
      <v-alert
        v-for="(warning, wIdx) in warnings"
        :key="wIdx"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-2"
      >
        {{ warning }}
      </v-alert>

      <div class="text-caption text-medium-emphasis mb-2">
        {{ $t("components_warehouse_search.matchingReplays", { n: count }) }}
      </div>

      <warehouse-replays-table :replays="replays" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import WarehouseRaceSelect from "@/components/warehouse/filters/WarehouseRaceSelect.vue";
import WarehouseMapSelect from "@/components/warehouse/filters/WarehouseMapSelect.vue";
import WarehouseSeasonSelect from "@/components/warehouse/filters/WarehouseSeasonSelect.vue";
import WarehousePlayerSelect from "@/components/warehouse/filters/WarehousePlayerSelect.vue";
import MmrSelect from "@/components/common/MmrSelect.vue";
import DurationSelect from "@/components/common/DurationSelect.vue";
import WarehouseReplaysTable from "@/components/warehouse/WarehouseReplaysTable.vue";
import WarehouseService, { warehouseAssetUrl } from "@/services/WarehouseService";
import type { Mmr } from "@/store/match/types";
import type {
  EventType,
  MapEntry,
  MappingEntry,
  PlayerEntry,
  Race,
  ReplayMetadata,
  SearchRequest,
  SeasonEntry,
  SequenceGroup,
  SequenceStep,
} from "@/store/warehouse/types";
import { mdiClose, mdiMagnify, mdiPlus } from "@mdi/js";

interface StepForm {
  event_type: EventType;
  subject: string | null;
  within_previous_seconds: number | null;
  time_from_seconds: number | null;
  time_to_seconds: number | null;
}
interface GroupForm {
  race: Race;
  result: "won" | "lost" | null;
  steps: StepForm[];
}

const { t } = useI18n();

const eventTypeItems = computed<{ title: string; value: EventType }[]>(() => [
  { title: t("components_warehouse_search.eventBuilding"), value: "building" },
  { title: t("components_warehouse_search.eventUnit"), value: "unit" },
  { title: t("components_warehouse_search.eventUpgrade"), value: "upgrade" },
  { title: t("components_warehouse_search.eventItem"), value: "item" },
  { title: t("components_warehouse_search.eventHeroSkill"), value: "hero_skill" },
  { title: t("components_warehouse_search.eventHeroTrained"), value: "hero_trained" },
]);

// Scope filter state
const raceA = ref<Race | null>(null);
const raceB = ref<Race | null>(null);
const mapName = ref<string | null>(null);
const seasons = ref<number[]>([]);
const mmr = ref<Mmr>({ min: 0, max: 3000 });
const duration = ref<{ min: number; max: number }>({ min: 0, max: 14400 });
const playerNames = ref<string[]>([]);
const playersMatchAll = ref(false);

const groups = ref<GroupForm[]>([]);

// Reference data
const maps = ref<MapEntry[]>([]);
const seasonEntries = ref<SeasonEntry[]>([]);
const players = ref<PlayerEntry[]>([]);
const mappingCache = reactive<Record<string, MappingEntry[]>>({});

// Results
const loading = ref(false);
const searched = ref(false);
const apiError = ref("");
const replays = ref<ReplayMetadata[]>([]);
const count = ref(0);
const warnings = ref<string[]>([]);

function assetUrl(path: string): string {
  return warehouseAssetUrl(path);
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function mappingItems(eventType: EventType): MappingEntry[] {
  return mappingCache[eventType] ?? [];
}

async function ensureMappings(eventType: EventType): Promise<void> {
  if (mappingCache[eventType]) return;
  try {
    mappingCache[eventType] = await WarehouseService.getMappings(eventType);
  } catch {
    mappingCache[eventType] = [];
  }
}

function onEventTypeChange(step: StepForm): void {
  step.subject = null;
  ensureMappings(step.event_type);
}

function addGroup(): void {
  groups.value.push({ race: "Human", result: null, steps: [] });
}

function removeGroup(idx: number): void {
  groups.value.splice(idx, 1);
}

function addStep(group: GroupForm): void {
  if (group.steps.length >= 8) return;
  const step: StepForm = {
    event_type: "building",
    subject: null,
    within_previous_seconds: null,
    time_from_seconds: null,
    time_to_seconds: null,
  };
  group.steps.push(step);
  ensureMappings(step.event_type);
}

function removeStep(group: GroupForm, idx: number): void {
  group.steps.splice(idx, 1);
}

function groupIsActive(g: GroupForm): boolean {
  return g.steps.length > 0 || !!g.result;
}

const matchupSelected = computed<Race[]>(() =>
  [raceA.value, raceB.value].filter((r): r is Race => !!r)
);

const durationActive = computed<boolean>(() => duration.value.min > 0 || duration.value.max < 14400);

const hasScopeFilter = computed(() =>
  !!mapName.value
  || mmr.value.min > 0
  || mmr.value.max < 3000
  || durationActive.value
  || playerNames.value.length > 0
  || seasons.value.length > 0
);

const hasConstraint = computed(() =>
  matchupSelected.value.length > 0
  || hasScopeFilter.value
  || groups.value.some(groupIsActive)
);

// Build the request, omitting every unset key (backend is extra="forbid").
function buildRequest(): SearchRequest {
  const req: SearchRequest = { w3c_linked_only: true, limit: 100 };
  if (matchupSelected.value.length) req.matchup = matchupSelected.value;
  if (mapName.value) req.map_name = mapName.value;
  if (seasons.value.length) req.seasons = seasons.value;
  if (durationActive.value) {
    if (duration.value.min > 0) req.min_minutes = Math.floor(duration.value.min / 60);
    if (duration.value.max < 14400) req.max_minutes = Math.floor(duration.value.max / 60);
  }
  if (mmr.value.min > 0) req.min_mmr = mmr.value.min;
  if (mmr.value.max < 3000) req.max_mmr = mmr.value.max;
  if (playerNames.value.length) {
    req.player_names = playerNames.value;
    if (playersMatchAll.value) req.players_match_all = true;
  }

  const built: SequenceGroup[] = [];
  for (const g of groups.value) {
    if (!groupIsActive(g)) continue;
    const group: SequenceGroup = { race: g.race };
    if (g.result) group.result = g.result;
    if (g.steps.length) {
      group.steps = g.steps.map((s, i) => {
        const step: SequenceStep = { event_type: s.event_type };
        if (s.subject) step.subject = s.subject;
        if (i > 0 && isNum(s.within_previous_seconds)) {
          step.within_previous_seconds = s.within_previous_seconds;
        }
        if (isNum(s.time_from_seconds)) step.time_from_seconds = s.time_from_seconds;
        if (isNum(s.time_to_seconds)) step.time_to_seconds = s.time_to_seconds;
        return step;
      });
    }
    built.push(group);
  }
  if (built.length) req.groups = built.slice(0, 2);
  return req;
}

// Guard against out-of-order responses: only the newest request may write state.
let searchSeq = 0;

async function runSearch(): Promise<void> {
  const seq = ++searchSeq;
  loading.value = true;
  apiError.value = "";
  try {
    const res = await WarehouseService.search(buildRequest());
    if (seq !== searchSeq) return;
    replays.value = res.replays;
    count.value = res.count;
    warnings.value = res.warnings ?? [];
    searched.value = true;
  } catch (e) {
    if (seq !== searchSeq) return;
    apiError.value = e instanceof Error ? e.message : "Search failed";
  } finally {
    if (seq === searchSeq) loading.value = false;
  }
}

onMounted(async () => {
  const [mapsRes, seasonsRes, playersRes] = await Promise.allSettled([
    WarehouseService.getMaps(),
    WarehouseService.getSeasons(),
    WarehouseService.getPlayers(),
  ]);
  if (mapsRes.status === "fulfilled") maps.value = mapsRes.value;
  if (seasonsRes.status === "fulfilled") seasonEntries.value = seasonsRes.value;
  if (playersRes.status === "fulfilled") players.value = playersRes.value;
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

.wh-group-card {
  background-color: transparent;
}
</style>
