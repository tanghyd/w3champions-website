<template>
  <v-menu location="bottom start" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-btn tile class="w3-dropdown-button" style="background-color: transparent" v-bind="props">
        <v-icon size="x-large" start>{{ mdiCalendar }}</v-icon>
        {{ buttonLabel }}
      </v-btn>
    </template>
    <v-card>
      <v-card-text class="dropdown-menu-content">
        <div class="dropdown-menu-title">{{ label }}</div>
        <v-divider />
        <v-list density="compact" max-height="400" class="overflow-y-auto">
          <v-list-item
            v-for="s in seasons"
            :key="s.season"
            @click="toggle(s.season)"
          >
            <template v-slot:prepend>
              <v-checkbox-btn :model-value="modelValue.includes(s.season)" density="compact" />
            </template>
            <v-list-item-title>{{ $t("components_common_seasonselect.season") }} {{ s.season }}</v-list-item-title>
            <template v-slot:append>
              <span class="text-caption text-medium-emphasis">{{ s.replays }}</span>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { SeasonEntry } from "@/store/warehouse/types";
import { mdiCalendar } from "@mdi/js";

const { modelValue = [], label, seasons = [] } = defineProps<{
  modelValue?: number[];
  label: string;
  seasons?: SeasonEntry[];
}>();

const emit = defineEmits<{
  "update:modelValue": [seasons: number[]];
}>();

const { t } = useI18n();

const buttonLabel = computed<string>(() => {
  if (!modelValue.length) return label;
  if (modelValue.length === 1) return `${t("components_common_seasonselect.season")} ${modelValue[0]}`;
  return t("views_warehouse.seasonsSelected", { n: modelValue.length });
});

function toggle(season: number): void {
  const next = modelValue.includes(season)
    ? modelValue.filter((s) => s !== season)
    : [...modelValue, season];
  emit("update:modelValue", next);
}
</script>
