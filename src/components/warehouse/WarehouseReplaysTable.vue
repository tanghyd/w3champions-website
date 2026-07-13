<template>
  <div class="elevation-1 overflow-x-auto overflow-y-hidden">
    <table class="custom-table">
      <thead>
        <tr>
          <td class="text-medium-emphasis" style="text-align: center; min-width: 440px">
            {{ $t("components_matches_matchesgrid.players") }}
          </td>
          <td class="text-medium-emphasis" style="text-align: center; min-width: 120px">
            {{ $t("components_warehouse_table.map") }}
          </td>
          <td class="text-medium-emphasis" style="text-align: end; min-width: 90px">
            {{ $t("components_matches_matchesgrid.duration") }}
          </td>
          <td class="text-medium-emphasis" style="text-align: end; min-width: 150px">
            {{ $t("components_warehouse_table.played") }}
          </td>
          <td class="text-medium-emphasis text-center">
            {{ $t("components_matches_matchesgrid.replay") }}
          </td>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="replay in replays"
          :key="replay.replay_id"
          class="cursor-pointer"
          @click="goToMatch(replay)"
        >
          <td>
            <div class="d-flex align-center justify-center force-no-wrap py-2">
              <div class="wh-team wh-team--left">
                <div
                  v-for="p in winners(replay)"
                  :key="p.player_id"
                  class="wh-player"
                >
                  <div class="wh-heroes">
                    <warehouse-hero-icon
                      v-for="(hero, i) in p.heroes"
                      :key="i"
                      :hero="hero"
                    />
                  </div>
                  <router-link
                    :to="profileUrl(p.name)"
                    class="wh-name w3-won"
                    @click.stop
                  >
                    {{ p.name }}
                  </router-link>
                  <v-chip v-for="tag in tagsFor(p)" :key="tag" size="x-small" variant="tonal" color="secondary">
                    {{ tag }}
                  </v-chip>
                  <span v-if="p.old_mmr != null" class="number-text text-medium-emphasis wh-mmr">{{ p.old_mmr }}</span>
                  <player-icon :key="p.race" :race="raceEnum(p.race)" :left="false" />
                </div>
              </div>

              <span class="wh-vs text-no-wrap px-2">{{ $t("views_matchdetail.vs") }}</span>

              <div class="wh-team">
                <div
                  v-for="p in losers(replay)"
                  :key="p.player_id"
                  class="wh-player"
                >
                  <player-icon :key="p.race" :race="raceEnum(p.race)" :left="true" />
                  <router-link
                    :to="profileUrl(p.name)"
                    class="wh-name w3-lost"
                    @click.stop
                  >
                    {{ p.name }}
                  </router-link>
                  <v-chip v-for="tag in tagsFor(p)" :key="tag" size="x-small" variant="tonal" color="secondary">
                    {{ tag }}
                  </v-chip>
                  <span v-if="p.old_mmr != null" class="number-text text-medium-emphasis wh-mmr">{{ p.old_mmr }}</span>
                  <div class="wh-heroes">
                    <warehouse-hero-icon
                      v-for="(hero, i) in p.heroes"
                      :key="i"
                      :hero="hero"
                    />
                  </div>
                </div>
              </div>
            </div>
          </td>
          <td class="text-center">
            <span class="text-caption">{{ replay.map }}</span>
          </td>
          <td class="text-right">
            <div class="d-flex flex-column text-right align-end">
              <span class="number-text">{{ duration(replay) }}</span>
              <div class="duration-bar" :style="{ width: durationBarWidth(replay) }"></div>
            </div>
          </td>
          <td class="text-right">
            <div class="d-flex flex-column text-right align-end ga-1">
              <span
                v-if="replay.played_at"
                class="number-text"
                :data-tip="playedAtTooltip(replay)"
              >{{ playedAt(replay) }}</span>
              <span v-else class="text-medium-emphasis">&mdash;</span>
              <v-chip v-if="replay.season != null" size="x-small" variant="tonal" color="primary">
                {{ $t("components_common_seasonselect.season") }} {{ replay.season }}
              </v-chip>
            </div>
          </td>
          <td class="text-center" @click.stop>
            <v-tooltip location="top" content-class="w3-tooltip elevation-1">
              <template v-slot:activator="{ props }">
                <span v-bind="props">
                  <v-btn
                    v-if="replay.file_path"
                    class="ma-2 w3-gray-gold-text"
                    icon
                    variant="outlined"
                    size="small"
                    :href="download(replay.replay_id)"
                  >
                    <v-icon size="x-large">{{ mdiDownload }}</v-icon>
                  </v-btn>
                  <span v-else class="text-disabled">&mdash;</span>
                </span>
              </template>
              <span>{{ $t("components_warehouse_table.downloadReplay") }}</span>
            </v-tooltip>
          </td>
        </tr>
        <tr v-if="!replays.length">
          <td colspan="5" class="text-center text-medium-emphasis">
            {{ $t("components_warehouse_table.noReplays") }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import PlayerIcon from "@/components/matches/PlayerIcon.vue";
import WarehouseHeroIcon from "@/components/warehouse/WarehouseHeroIcon.vue";
import type { PlayerMetadata, ReplayMetadata } from "@/store/warehouse/types";
import { downloadUrl } from "@/services/WarehouseService";
import { getProfileUrl } from "@/helpers/url-functions";
import { ERaceEnum } from "@/store/types";
import { raceToEnum } from "@/components/warehouse/warehouse-helpers";
import { EMainRouteName } from "@/router/types";
import {
  formatSecondsToDuration,
  formatTimestampStringToDate,
  formatTimestampStringToDateTime,
} from "@/helpers/date-functions";
import { mdiDownload } from "@mdi/js";

const { replays = [], tagNamespaces = [] } = defineProps<{
  replays?: ReplayMetadata[];
  // Annotation namespaces (e.g. "gnl-s18") to render as chips next to each player.
  tagNamespaces?: string[];
}>();

const router = useRouter();

// Bar scaled against the longest game currently shown (min 5% so short games read).
const maxDurationMs = computed<number>(() =>
  replays.reduce((max, r) => Math.max(max, r.duration_ms), 1)
);

function winners(replay: ReplayMetadata): PlayerMetadata[] {
  return replay.players.filter((p) => p.won);
}

function losers(replay: ReplayMetadata): PlayerMetadata[] {
  return replay.players.filter((p) => !p.won);
}

function raceEnum(race: string): ERaceEnum {
  return raceToEnum(race);
}

function profileUrl(name: string): string {
  return getProfileUrl(name);
}

// annotations keys are "<namespace>:<key>" (see PlayerMetadata); a namespace
// can carry more than one key (e.g. "team" and "role"), show every value.
function tagsFor(p: PlayerMetadata): string[] {
  if (!tagNamespaces.length) return [];
  return Object.entries(p.annotations ?? {})
    .filter(([k]) => tagNamespaces.some((ns) => k.startsWith(`${ns}:`)))
    .map(([, v]) => v);
}

function duration(replay: ReplayMetadata): string {
  return formatSecondsToDuration(Math.floor(replay.duration_ms / 1000));
}

function durationBarWidth(replay: ReplayMetadata): string {
  const pct = (replay.duration_ms / maxDurationMs.value) * 100;
  return `${Math.max(5, Math.min(100, pct))}%`;
}

function playedAt(replay: ReplayMetadata): string {
  return replay.played_at ? formatTimestampStringToDate(replay.played_at) : "";
}

function playedAtTooltip(replay: ReplayMetadata): string {
  return replay.played_at ? formatTimestampStringToDateTime(replay.played_at) : "";
}

function download(replayId: string): string {
  return downloadUrl(replayId);
}

function goToMatch(replay: ReplayMetadata): void {
  if (!replay.w3c_match_id) return;
  router.push({ name: EMainRouteName.MATCH, params: { matchId: replay.w3c_match_id } });
}
</script>

<style lang="scss" scoped>
.duration-bar {
  background-color: rgb(var(--v-theme-primary));
  height: 3px;
  border-radius: 2px;
  margin-top: 2px;
}

.force-no-wrap {
  flex-wrap: nowrap !important;
}

.wh-team {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 0;
  min-width: 0;

  &--left {
    align-items: flex-end;
  }
}

.wh-player {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.wh-name {
  font-weight: 500;
  text-decoration: none;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.wh-mmr {
  font-size: 0.8rem;
}

.wh-heroes {
  display: flex;
  align-items: center;
  gap: 2px;
}

.wh-vs {
  opacity: 0.7;
}
</style>
