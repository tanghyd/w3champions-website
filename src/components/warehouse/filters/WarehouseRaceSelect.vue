<template>
  <v-menu location="bottom start">
    <template v-slot:activator="{ props }">
      <v-btn tile class="w3-dropdown-button" style="background-color: transparent" v-bind="props">
        <race-icon v-if="modelValue" :key="modelValue" :race="raceEnum(modelValue)" class="mr-2" />
        <v-icon v-else size="x-large" start>{{ mdiShield }}</v-icon>
        {{ buttonLabel }}
      </v-btn>
    </template>
    <v-card>
      <v-card-text class="dropdown-menu-content">
        <div class="dropdown-menu-title">{{ label }}</div>
        <v-divider />
        <v-list density="compact" max-height="400" class="overflow-y-auto">
          <v-list-item v-if="allowAny" @click="select(null)">
            <v-list-item-title>{{ anyLabel }}</v-list-item-title>
          </v-list-item>
          <v-list-item v-for="r in races" :key="r" @click="select(r)">
            <template v-slot:prepend>
              <race-icon :race="raceEnum(r)" class="mr-2" />
            </template>
            <v-list-item-title>{{ $t(`races.${raceKey(r)}`) }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import RaceIcon from "@/components/player/RaceIcon.vue";
import { ERaceEnum } from "@/store/types";
import type { Race } from "@/store/warehouse/types";
import { raceToEnum, WAREHOUSE_RACES } from "@/components/warehouse/warehouse-helpers";
import { mdiShield } from "@mdi/js";

const { modelValue = null, label, allowAny = true } = defineProps<{
  modelValue?: Race | null;
  label: string;
  allowAny?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [race: Race | null];
}>();

const { t } = useI18n();
const races = WAREHOUSE_RACES;
const anyLabel = computed<string>(() => t("views_warehouse.anyRace"));

const buttonLabel = computed<string>(() => {
  if (!modelValue) return label;
  return t(`races.${raceKey(modelValue)}`);
});

function raceEnum(race: Race): ERaceEnum {
  return raceToEnum(race);
}

function raceKey(race: Race): string {
  return ERaceEnum[raceToEnum(race)];
}

function select(race: Race | null): void {
  emit("update:modelValue", race);
}
</script>
