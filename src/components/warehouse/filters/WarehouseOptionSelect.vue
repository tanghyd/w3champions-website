<template>
  <v-menu location="bottom start">
    <template v-slot:activator="{ props }">
      <v-btn tile class="w3-dropdown-button" style="background-color: transparent" v-bind="props">
        <v-icon v-if="icon" size="x-large" start>{{ icon }}</v-icon>
        <span class="text-medium-emphasis mr-1">{{ label }}:</span> {{ current?.title ?? "—" }}
      </v-btn>
    </template>
    <v-card>
      <v-card-text class="dropdown-menu-content">
        <div class="dropdown-menu-title">{{ label }}</div>
        <v-divider />
        <v-list density="compact" max-height="400" class="overflow-y-auto">
          <v-list-item
            v-for="opt in options"
            :key="opt.value"
            :active="opt.value === modelValue"
            @click="emit('update:modelValue', opt.value)"
          >
            <v-list-item-title>{{ opt.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";

// The site's segmented-choice idiom: a w3-dropdown-button opening a v-menu
// (see MatchesStatusSelect / the Matches page filters) — used instead of
// v-btn-toggle, which has no precedent anywhere else on the site.
interface Option {
  value: string;
  title: string;
}

const { modelValue, label, options, icon = "" } = defineProps<{
  modelValue: string;
  label: string;
  options: Option[];
  icon?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const current = computed<Option | undefined>(() => options.find((o) => o.value === modelValue));
</script>
