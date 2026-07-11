<template>
  <v-tooltip location="top" content-class="w3-tooltip elevation-1">
    <template v-slot:activator="{ props }">
      <span class="wh-code-chip" :class="{ 'wh-code-chip--clickable': clickable }" v-bind="props">
        <v-img
          v-if="info?.icon_url"
          :src="assetUrl(info.icon_url)"
          :width="size"
          :height="size"
          :aspect-ratio="1 / 1"
          class="wh-code-img"
        />
        <span v-else class="wh-code-fallback number-text">{{ code }}</span>
      </span>
    </template>
    <span>{{ info?.name || code }}</span>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { warehouseAssetUrl } from "@/services/WarehouseService";
import type { OpenerCode } from "@/store/warehouse/types";

const { code, codes = {}, size = 26, clickable = false } = defineProps<{
  code: string;
  codes?: Record<string, OpenerCode>;
  size?: number;
  clickable?: boolean;
}>();

const info = computed<OpenerCode | undefined>(() => codes[code]);

function assetUrl(path: string): string {
  return warehouseAssetUrl(path);
}
</script>

<style scoped>
.wh-code-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 3px;
  overflow: hidden;
}

.wh-code-chip--clickable {
  cursor: pointer;
}

.wh-code-img {
  border-radius: 3px;
}

.wh-code-fallback {
  font-size: 0.7rem;
  padding: 2px 4px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 3px;
}
</style>
