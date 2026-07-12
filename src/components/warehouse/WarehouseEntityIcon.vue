<template>
  <v-tooltip v-if="url" location="top" content-class="w3-tooltip elevation-1">
    <template v-slot:activator="{ props }">
      <span class="wh-entity-icon" v-bind="props">
        <v-img :src="assetUrl(url)" :width="size" :height="size" :aspect-ratio="1 / 1" class="wh-entity-img" />
      </span>
    </template>
    <span>{{ name || code }}</span>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { warehouseAssetUrl } from "@/services/WarehouseService";
import { iconUrlFor } from "@/components/warehouse/warehouse-icons";

// Small square WC3 entity icon resolved from the shared mappings index by
// canonical code first, display name second. Renders NOTHING when unresolved
// (icons are progressive enhancement; stat-events-only codes have no art).
const { code = null, name = null, size = 22 } = defineProps<{
  code?: string | null;
  name?: string | null;
  size?: number;
}>();

const url = computed<string | null>(() => iconUrlFor(code, name));

function assetUrl(path: string): string {
  return warehouseAssetUrl(path);
}
</script>

<style scoped>
.wh-entity-icon {
  display: inline-flex;
  vertical-align: middle;
  border-radius: 3px;
  overflow: hidden;
  margin-right: 6px;
}

.wh-entity-img {
  border-radius: 3px;
}
</style>
