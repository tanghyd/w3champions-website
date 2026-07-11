<template>
  <div class="warehouse-search">
    <v-alert v-if="apiError" type="error" variant="tonal" class="mb-3">
      {{ apiError }}
    </v-alert>

    <!-- Scope filters -->
    <v-card variant="outlined" class="mb-3">
      <v-card-title class="text-subtitle-1 py-2">Filters</v-card-title>
      <v-divider />
      <v-card-text>
        <div class="d-flex flex-wrap ga-3">
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
            style="min-width: 240px"
            :error="matchup.length > 2"
          />
          <v-autocomplete
            v-model="mapName"
            :items="mapNames"
            label="Map"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            style="min-width: 240px"
          />
          <v-select
            v-model="seasons"
            :items="seasonItems"
            label="Seasons (default: all)"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            multiple
            chips
            style="min-width: 240px"
          />
        </div>

        <div class="d-flex flex-wrap ga-3 mt-3">
          <v-text-field
            v-model.number="minMinutes"
            type="number"
            label="Min minutes"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 150px"
          />
          <v-text-field
            v-model.number="maxMinutes"
            type="number"
            label="Max minutes"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 150px"
          />
          <v-text-field
            v-model.number="minMmr"
            type="number"
            label="Min MMR"
            density="compact"
            variant="outlined"
            :hint="mmrHint"
            persistent-hint
            style="max-width: 180px"
          />
          <v-text-field
            v-model.number="maxMmr"
            type="number"
            label="Max MMR"
            density="compact"
            variant="outlined"
            :hint="mmrHint"
            persistent-hint
            style="max-width: 180px"
          />
        </div>

        <div class="d-flex flex-wrap align-center ga-3 mt-3">
          <v-combobox
            v-model="playerNames"
            label="Player names"
            density="compact"
            variant="outlined"
            hide-details
            multiple
            chips
            closable-chips
            clearable
            style="min-width: 280px"
          />
          <v-switch
            v-model="playersMatchAll"
            label="Match all players"
            density="compact"
            hide-details
            color="primary"
          />
          <v-switch
            v-model="w3cLinkedOnly"
            label="w3c-linked only"
            density="compact"
            hide-details
            color="primary"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Sequence groups -->
    <v-card
      v-for="(group, gIdx) in groups"
      :key="gIdx"
      variant="outlined"
      class="mb-3"
    >
      <v-card-title class="d-flex align-center py-2">
        <span class="text-subtitle-1">Group {{ gIdx + 1 }}</span>
        <v-spacer />
        <v-btn size="small" variant="text" color="error" @click="removeGroup(gIdx)">Remove</v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div class="d-flex flex-wrap ga-3">
          <v-select
            v-model="group.race"
            :items="races"
            label="Race (required)"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 200px"
          />
          <v-select
            v-model="group.result"
            :items="resultItems"
            label="Result"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            style="min-width: 160px"
          />
          <v-text-field
            v-model="group.player"
            label="Player (optional)"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            style="min-width: 220px"
          />
        </div>

        <div class="mt-3">
          <div
            v-for="(step, sIdx) in group.steps"
            :key="sIdx"
            class="step-row d-flex flex-wrap align-center ga-2 mb-2"
          >
            <span class="text-caption text-medium-emphasis" style="width: 24px">{{ sIdx + 1 }}.</span>
            <v-select
              v-model="step.event_type"
              :items="eventTypeItems"
              label="Event"
              density="compact"
              variant="outlined"
              hide-details
              style="min-width: 160px"
              @update:model-value="onEventTypeChange(step)"
            />
            <v-autocomplete
              v-model="step.subject"
              :items="mappingItems(step.event_type)"
              item-title="name"
              item-value="name"
              label="Subject"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="min-width: 240px"
            >
              <template v-slot:item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="item.raw.name">
                  <template v-slot:prepend>
                    <img
                      v-if="item.raw.icon_url"
                      :src="assetUrl(item.raw.icon_url)"
                      width="24"
                      height="24"
                      class="mr-2"
                      alt=""
                    />
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
            <v-text-field
              v-if="sIdx > 0"
              v-model.number="step.within_previous_seconds"
              type="number"
              label="Within prev (s)"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 150px"
            />
            <v-text-field
              v-model.number="step.time_from_seconds"
              type="number"
              label="From (s)"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 130px"
            />
            <v-text-field
              v-model.number="step.time_to_seconds"
              type="number"
              label="To (s)"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 130px"
            />
            <v-btn icon size="x-small" variant="text" color="error" @click="removeStep(group, sIdx)">
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
            Add step
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <div class="d-flex align-center ga-3 mb-4">
      <v-btn
        v-if="groups.length < 2"
        variant="outlined"
        @click="addGroup"
      >
        <v-icon start>{{ mdiPlus }}</v-icon>
        Add group
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        variant="flat"
        :loading="loading"
        :disabled="!hasConstraint"
        @click="runSearch"
      >
        Search
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
        {{ count }} matching {{ count === 1 ? "replay" : "replays" }}
      </div>

      <v-row v-if="replays.length">
        <v-col v-for="replay in replays" :key="replay.replay_id" cols="12" md="6">
          <replay-card :replay="replay" />
        </v-col>
      </v-row>
      <div v-else class="text-medium-emphasis py-6 text-center">No replays matched.</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import ReplayCard from "@/components/warehouse/ReplayCard.vue";
import WarehouseService from "@/services/WarehouseService";
import { warehouseAssetUrl } from "@/services/WarehouseService";
import { WAREHOUSE_URL } from "@/config/env";
import type {
  EventType,
  MappingEntry,
  Race,
  ReplayMetadata,
  SearchRequest,
  SequenceGroup,
  SequenceStep,
} from "@/store/warehouse/types";
import { mdiClose, mdiPlus } from "@mdi/js";

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
  player: string | null;
  steps: StepForm[];
}

const races: Race[] = ["Human", "Orc", "NightElf", "Undead", "Random"];
const resultItems = [
  { title: "Won", value: "won" },
  { title: "Lost", value: "lost" },
];
const eventTypeItems: { title: string; value: EventType }[] = [
  { title: "Building", value: "building" },
  { title: "Unit", value: "unit" },
  { title: "Item", value: "item" },
  { title: "Upgrade", value: "upgrade" },
  { title: "Hero skill", value: "hero_skill" },
  { title: "Hero trained", value: "hero_trained" },
];

// Scope filter state
const matchup = ref<Race[]>([]);
const mapName = ref<string | null>(null);
const seasons = ref<number[]>([]);
const minMinutes = ref<number | null>(null);
const maxMinutes = ref<number | null>(null);
const minMmr = ref<number | null>(null);
const maxMmr = ref<number | null>(null);
const playerNames = ref<string[]>([]);
const playersMatchAll = ref(false);
const w3cLinkedOnly = ref(false);

const groups = ref<GroupForm[]>([]);

// Reference data
const mapNames = ref<string[]>([]);
const seasonItems = ref<{ title: string; value: number }[]>([]);
const mmrHint = ref("");
// Cache of subject mappings per event type (populated on demand).
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

// v-model.number on an empty field yields "" (not null); only forward real numbers.
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
  groups.value.push({ race: "Human", result: null, player: null, steps: [] });
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

// A group contributes a constraint only if it has a step, player, or result
// (a bare race group is not enough for the backend's empty-request check).
function groupIsActive(g: GroupForm): boolean {
  return g.steps.length > 0 || !!g.player?.trim() || !!g.result;
}

const hasScopeFilter = computed(() =>
  !!mapName.value
  || isNum(minMinutes.value)
  || isNum(maxMinutes.value)
  || isNum(minMmr.value)
  || isNum(maxMmr.value)
  || playerNames.value.length > 0
  || seasons.value.length > 0
  || w3cLinkedOnly.value
);

const hasConstraint = computed(() =>
  matchup.value.length > 0
  || hasScopeFilter.value
  || groups.value.some(groupIsActive)
);

// Build the request, omitting every unset key (backend is extra="forbid").
function buildRequest(): SearchRequest {
  const req: SearchRequest = { limit: 100 };
  if (matchup.value.length) req.matchup = matchup.value.slice(0, 2);
  if (mapName.value) req.map_name = mapName.value;
  if (seasons.value.length) req.seasons = seasons.value;
  if (isNum(minMinutes.value)) req.min_minutes = minMinutes.value;
  if (isNum(maxMinutes.value)) req.max_minutes = maxMinutes.value;
  if (isNum(minMmr.value)) req.min_mmr = minMmr.value;
  if (isNum(maxMmr.value)) req.max_mmr = maxMmr.value;
  if (playerNames.value.length) {
    req.player_names = playerNames.value;
    if (playersMatchAll.value) req.players_match_all = true;
  }
  if (w3cLinkedOnly.value) req.w3c_linked_only = true;

  // Include any group with a race set; steps-free groups pin an opponent race.
  const built: SequenceGroup[] = [];
  for (const g of groups.value) {
    if (!g.race) continue;
    const group: SequenceGroup = { race: g.race };
    if (g.player?.trim()) group.player = g.player.trim();
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

async function runSearch(): Promise<void> {
  loading.value = true;
  apiError.value = "";
  try {
    const res = await WarehouseService.search(buildRequest());
    replays.value = res.replays;
    count.value = res.count;
    warnings.value = res.warnings ?? [];
    searched.value = true;
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : "Search failed";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const maps = await WarehouseService.getMaps();
    mapNames.value = maps.map((m) => m.name);
  } catch {
    apiError.value = `Warehouse API not reachable at ${WAREHOUSE_URL} — docker compose up`;
  }
  try {
    const s = await WarehouseService.getSeasons();
    seasonItems.value = s.map((e) => ({ title: `S${e.season} (${e.replays})`, value: e.season }));
  } catch {
    seasonItems.value = [];
  }
  try {
    const mmr = await WarehouseService.getMmrStats();
    if (mmr.n > 0) mmrHint.value = `p5 ${mmr.p5} / p50 ${mmr.p50} / p95 ${mmr.p95}`;
  } catch {
    mmrHint.value = "";
  }
});
</script>
