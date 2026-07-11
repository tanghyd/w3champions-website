<template>
  <v-menu location="bottom start">
    <template v-slot:activator="{ props }">
      <v-btn tile class="w3-dropdown-button" style="background-color: transparent" v-bind="props">
        <v-icon size="x-large" start>{{ mdiMap }}</v-icon>
        {{ modelValue || label }}
      </v-btn>
    </template>
    <v-card>
      <v-card-text class="dropdown-menu-content">
        <div class="dropdown-menu-title">{{ label }}</div>
        <v-divider />
        <v-list density="compact" max-height="400" class="overflow-y-auto">
          <v-list-item @click="select(null)">
            <v-list-item-title>{{ $t("views_warehouse.anyMap") }}</v-list-item-title>
          </v-list-item>
          <v-list-item v-for="m in maps" :key="m.name" @click="select(m.name)">
            <v-list-item-title>{{ m.name }}</v-list-item-title>
            <template v-slot:append>
              <span class="text-caption text-medium-emphasis">{{ m.replays }}</span>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import type { MapEntry } from "@/store/warehouse/types";
import { mdiMap } from "@mdi/js";

const { modelValue = null, label, maps = [] } = defineProps<{
  modelValue?: string | null;
  label: string;
  maps?: MapEntry[];
}>();

const emit = defineEmits<{
  "update:modelValue": [map: string | null];
}>();

function select(map: string | null): void {
  emit("update:modelValue", map);
}
</script>
