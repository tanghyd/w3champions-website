<template>
  <!-- Prefer the site's own local hero art when we recognise the hero; otherwise
       render the warehouse-hosted icon, styled identically. -->
  <hero-picture
    v-if="localIcon"
    :hero-icon="localIcon"
    :hero-level="hero.final_level"
    :size="size"
  />
  <v-tooltip v-else-if="hero.icon_url" location="top" content-class="w3-tooltip elevation-1">
    <template v-slot:activator="{ props }">
      <v-img
        :src="assetUrl(hero.icon_url)"
        :width="size"
        :aspect-ratio="1 / 1"
        v-bind="props"
      />
    </template>
    <div>{{ hero.hero_name }} ({{ $t("common.level") }} {{ hero.final_level }})</div>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import HeroPicture from "@/components/match-details/HeroPicture.vue";
import { warehouseAssetUrl } from "@/services/WarehouseService";
import type { HeroMetadata } from "@/store/warehouse/types";
import { heroIconBasename, KNOWN_HERO_ICONS } from "@/components/warehouse/warehouse-helpers";

const { hero, size = 28 } = defineProps<{
  hero: HeroMetadata;
  size?: number;
}>();

// Resolve to a local asset basename when the hero maps to shipped art.
const localIcon = computed<string | null>(() => {
  const fromUrl = heroIconBasename(hero.icon_url);
  if (fromUrl && KNOWN_HERO_ICONS.has(fromUrl)) return fromUrl;
  const fromId = heroIconBasename(hero.hero_id);
  if (fromId && KNOWN_HERO_ICONS.has(fromId)) return fromId;
  return null;
});

function assetUrl(path: string): string {
  return warehouseAssetUrl(path);
}
</script>
