<template>
  <div v-if="minimap" class="wh-minimap-wrap">
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <warehouse-option-select
        :model-value="layer"
        :label="$t('components_warehouse_statevents.mapLayer')"
        :options="layerOptions"
        @update:model-value="(v) => (layer = v as LayerKey)"
      />
    </div>
    <div class="wh-minimap">
      <img :src="assetUrl(minimap.url)" alt="" class="wh-minimap-img" />
      <svg class="wh-minimap-dots" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle
          v-for="(dot, idx) in dots"
          :key="idx"
          :cx="dot.cx"
          :cy="dot.cy"
          r="1.1"
          :fill="dot.color"
          stroke="rgba(0, 0, 0, 0.55)"
          stroke-width="0.25"
        >
          <title>{{ dot.label }}</title>
        </circle>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import WarehouseOptionSelect from "@/components/warehouse/filters/WarehouseOptionSelect.vue";
import { warehouseAssetUrl } from "@/services/WarehouseService";
import type { StatEventsDetail } from "@/store/warehouse/types";

// Location overlay: world coordinates from the instrumented events plotted
// over the map's minimap image. bounds = [left, bottom, right, top] in world
// units; y is inverted (world +y is up, screen +y is down).
const { detail, slotColor } = defineProps<{
  detail: StatEventsDetail;
  slotColor: (slot: number) => string;
}>();

const { t } = useI18n();

type LayerKey = "deaths" | "creeps" | "fights";
const layer = ref<LayerKey>("creeps");

const layerOptions = [
  { value: "creeps", title: t("components_warehouse_statevents.layerCreeps") },
  { value: "deaths", title: t("components_warehouse_statevents.layerDeaths") },
  { value: "fights", title: t("components_warehouse_statevents.layerFights") },
];

const minimap = computed(() => detail.minimap);

interface Dot {
  cx: number;
  cy: number;
  color: string;
  label: string;
}

function project(x: number, y: number): { cx: number; cy: number } | null {
  const m = minimap.value;
  if (!m) return null;
  const [left, bottom, right, top] = m.bounds;
  if (right === left || top === bottom) return null;
  const cx = ((x - left) / (right - left)) * 100;
  const cy = ((top - y) / (top - bottom)) * 100;
  if (cx < -2 || cx > 102 || cy < -2 || cy > 102) return null;
  return { cx, cy };
}

function slotName(slot: number): string {
  return detail.slot_names?.[String(slot)] ?? `slot ${slot}`;
}

const dots = computed<Dot[]>(() => {
  const out: Dot[] = [];
  if (layer.value === "creeps") {
    for (const r of detail.creep_rows) {
      const p = project(Number(r.x), Number(r.y));
      if (!p) continue;
      const slot = Number(r.player_slot);
      out.push({ ...p, color: slotColor(slot), label: `${String(r.name)} — ${slotName(slot)}` });
    }
  } else if (layer.value === "deaths") {
    for (const r of detail.deaths) {
      const p = project(Number(r.x), Number(r.y));
      if (!p) continue;
      out.push({
        ...p,
        color: slotColor(r.victim_slot),
        label: `${r.name} (${slotName(r.victim_slot)}) — ${r.clock}`,
      });
    }
  } else {
    for (const r of detail.combat_rows) {
      const p = project(Number(r.target_x), Number(r.target_y));
      if (!p) continue;
      const slot = Number(r.player_slot);
      out.push({ ...p, color: slotColor(slot), label: `${String(r.source_name)} → ${String(r.target_name)}` });
    }
  }
  return out;
});

function assetUrl(path: string): string {
  return warehouseAssetUrl(path);
}
</script>

<style scoped>
.wh-minimap-wrap {
  max-width: 480px;
}

.wh-minimap {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
}

.wh-minimap-img {
  display: block;
  width: 100%;
  height: auto;
}

.wh-minimap-dots {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
