<template>
  <v-menu location="bottom start" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-btn tile class="w3-dropdown-button" style="background-color: transparent" v-bind="props">
        <v-icon size="x-large" start>{{ mdiAccountSearch }}</v-icon>
        {{ buttonLabel }}
      </v-btn>
    </template>
    <v-card min-width="320">
      <v-card-text class="dropdown-menu-content">
        <div class="dropdown-menu-title">{{ label }}</div>
        <v-divider class="mb-3" />
        <!-- Autocomplete when the player list is available; free-text combobox otherwise. -->
        <v-autocomplete
          v-if="players.length"
          :model-value="modelValue"
          :items="playerNames"
          :label="label"
          density="compact"
          variant="outlined"
          hide-details
          multiple
          chips
          closable-chips
          clearable
          @update:model-value="onChange"
        />
        <v-combobox
          v-else
          :model-value="modelValue"
          :label="label"
          density="compact"
          variant="outlined"
          hide-details
          multiple
          chips
          closable-chips
          clearable
          @update:model-value="onChange"
        />
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PlayerEntry } from "@/store/warehouse/types";
import { mdiAccountSearch } from "@mdi/js";

const { modelValue = [], label, players = [] } = defineProps<{
  modelValue?: string[];
  label: string;
  players?: PlayerEntry[];
}>();

const emit = defineEmits<{
  "update:modelValue": [names: string[]];
}>();

const { t } = useI18n();

const playerNames = computed<string[]>(() => players.map((p) => p.name));

const buttonLabel = computed<string>(() => {
  if (!modelValue.length) return label;
  if (modelValue.length === 1) return modelValue[0];
  return t("views_warehouse.playersSelected", { n: modelValue.length });
});

function onChange(names: string[]): void {
  emit("update:modelValue", names);
}
</script>
