<template>
  <v-card class="replay-card" variant="outlined">
    <v-card-title class="d-flex align-center flex-wrap ga-2 py-2">
      <span class="text-subtitle-1 font-weight-medium">{{ replay.matchup }}</span>
      <v-chip size="x-small" variant="tonal">{{ replay.map }}</v-chip>
      <v-spacer />
      <span class="text-caption text-medium-emphasis">{{ formatDuration(replay.duration_ms) }}</span>
      <span v-if="playedAt" class="text-caption text-medium-emphasis">{{ playedAt }}</span>
      <v-chip v-if="replay.season != null" size="x-small" color="primary" variant="tonal">
        S{{ replay.season }}
      </v-chip>
    </v-card-title>

    <v-divider />

    <v-card-text class="py-2">
      <div
        v-for="player in replay.players"
        :key="player.player_id"
        class="player-row d-flex align-center ga-2 py-1"
        :class="{ 'player-row--won': player.won }"
      >
        <v-icon v-if="player.won" size="small" color="success">{{ mdiTrophy }}</v-icon>
        <v-icon v-else size="small" class="player-row__spacer">{{ mdiMinus }}</v-icon>
        <span class="player-name font-weight-medium text-truncate">{{ player.name }}</span>
        <v-chip size="x-small" variant="tonal">{{ player.race }}</v-chip>
        <span class="text-caption text-medium-emphasis">{{ player.apm }} APM</span>
        <span v-if="player.old_mmr != null" class="text-caption text-medium-emphasis">
          {{ player.old_mmr }} MMR
        </span>
        <v-spacer />
        <div class="d-flex align-center ga-1">
          <v-tooltip
            v-for="(hero, idx) in player.heroes"
            :key="idx"
            location="top"
            :text="`${hero.hero_name} (lvl ${hero.final_level})`"
          >
            <template v-slot:activator="{ props: tip }">
              <img
                v-if="hero.icon_url"
                v-bind="tip"
                class="hero-img"
                :src="assetUrl(hero.icon_url)"
                width="28"
                height="28"
                loading="lazy"
                decoding="async"
                :alt="hero.hero_name"
              />
            </template>
          </v-tooltip>
        </div>
      </div>
    </v-card-text>

    <v-divider v-if="hasActions" />

    <v-card-actions v-if="hasActions" class="py-1">
      <v-btn
        v-if="replay.w3c_match_id"
        size="small"
        variant="text"
        :href="`https://w3champions.com/match/${replay.w3c_match_id}`"
        target="_blank"
        rel="noopener"
      >
        <v-icon start>{{ mdiOpenInNew }}</v-icon>
        W3C match
      </v-btn>
      <v-btn
        v-if="replay.file_path"
        size="small"
        variant="text"
        :href="downloadHref"
        target="_blank"
        rel="noopener"
      >
        <v-icon start>{{ mdiDownload }}</v-icon>
        Download .w3g
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ReplayMetadata } from "@/store/warehouse/types";
import { downloadUrl, warehouseAssetUrl } from "@/services/WarehouseService";
import { mdiDownload, mdiMinus, mdiOpenInNew, mdiTrophy } from "@mdi/js";

const { replay } = defineProps<{
  replay: ReplayMetadata;
}>();

const hasActions = computed(() => !!replay.w3c_match_id || !!replay.file_path);
const downloadHref = computed(() => downloadUrl(replay.replay_id));

const playedAt = computed(() => {
  if (!replay.played_at) return "";
  const d = new Date(replay.played_at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
});

function assetUrl(path: string): string {
  return warehouseAssetUrl(path);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
</script>

<style scoped>
.player-row--won {
  background-color: rgba(var(--v-theme-success), 0.08);
  border-radius: 4px;
}

.player-row__spacer {
  opacity: 0.3;
}

.player-name {
  max-width: 180px;
}

.hero-img {
  display: block;
  object-fit: contain;
  border-radius: 2px;
}
</style>
