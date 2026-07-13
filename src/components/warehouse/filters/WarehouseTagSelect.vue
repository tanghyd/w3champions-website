<template>
  <v-menu location="bottom start" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-btn tile class="w3-dropdown-button" style="background-color: transparent" v-bind="props">
        <v-icon size="x-large" start>{{ mdiTag }}</v-icon>
        {{ buttonLabel }}
      </v-btn>
    </template>
    <v-card>
      <v-card-text class="dropdown-menu-content">
        <div class="dropdown-menu-title">{{ label }}</div>
        <v-divider />
        <v-list density="compact" max-height="400" class="overflow-y-auto">
          <v-list-item
            v-for="ns in categories"
            :key="ns.namespace"
            @click="toggle(ns.namespace)"
          >
            <template v-slot:prepend>
              <v-checkbox-btn :model-value="modelValue.includes(ns.namespace)" density="compact" />
            </template>
            <v-list-item-title>{{ ns.namespace }}</v-list-item-title>
            <template v-slot:append>
              <span class="text-caption text-medium-emphasis">{{ ns.tags }}</span>
            </template>
          </v-list-item>
          <v-list-item v-if="!categories.length">
            <v-list-item-title class="text-medium-emphasis">
              {{ $t("views_warehouse.noTags") }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnnotationEntry } from "@/store/warehouse/types";
import { mdiTag } from "@mdi/js";

const { modelValue = [], label, entries = [] } = defineProps<{
  modelValue?: string[];
  label: string;
  entries?: AnnotationEntry[];
}>();

const emit = defineEmits<{
  "update:modelValue": [namespaces: string[]];
}>();

const { t } = useI18n();

// One row per namespace (e.g. "gnl-s18"), with a count of distinct tag values.
const categories = computed<{ namespace: string; tags: number }[]>(() => {
  const byNamespace = new Map<string, Set<string>>();
  for (const e of entries) {
    if (!byNamespace.has(e.namespace)) byNamespace.set(e.namespace, new Set());
    byNamespace.get(e.namespace)!.add(e.value);
  }
  return [...byNamespace.entries()].map(([namespace, values]) => ({ namespace, tags: values.size }));
});

const buttonLabel = computed<string>(() => {
  if (!modelValue.length) return label;
  if (modelValue.length === 1) return modelValue[0];
  return t("views_warehouse.tagCategoriesSelected", { n: modelValue.length });
});

function toggle(namespace: string): void {
  const next = modelValue.includes(namespace)
    ? modelValue.filter((n) => n !== namespace)
    : [...modelValue, namespace];
  emit("update:modelValue", next);
}
</script>
