<template>
  <v-container class="pa-3 w3-container-width">
    <v-row>
      <v-col cols="12">
        <v-card tile>
          <v-card-title class="pt-3 d-flex align-center flex-wrap">
            <span>{{ $t("views_app.warehouse") }}</span>
            <v-chip
              v-if="health"
              size="small"
              variant="tonal"
              color="primary"
              class="ml-3"
            >
              {{ $t("views_warehouse.replayCount", { n: health.w3c_replays }) }}
            </v-chip>
          </v-card-title>

          <v-tabs>
            <v-tab exact :to="{ name: EWarehouseRouteName.STATS }">
              {{ $t("views_warehouse.stats") }}
            </v-tab>
            <v-tab :to="{ name: EWarehouseRouteName.OPENERS }">
              {{ $t("views_warehouse.openers") }}
            </v-tab>
            <v-tab :to="{ name: EWarehouseRouteName.SEARCH }">
              {{ $t("views_warehouse.search") }}
            </v-tab>
            <v-tab :to="{ name: EWarehouseRouteName.STAT_EVENTS }">
              {{ $t("views_warehouse.statEvents") }}
              <v-chip size="x-small" variant="tonal" color="warning" class="ml-1">beta</v-chip>
            </v-tab>
          </v-tabs>

          <v-card-text>
            <v-alert
              v-if="offline"
              type="warning"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              {{ $t("views_warehouse.offline") }}
            </v-alert>
            <router-view v-slot:default="{ Component }">
              <keep-alive>
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import WarehouseService from "@/services/WarehouseService";
import type { WarehouseHealth } from "@/store/warehouse/types";
import { EWarehouseRouteName } from "@/router/types";

export default defineComponent({
  name: "WarehouseView",
  setup() {
    const health = ref<WarehouseHealth | null>(null);
    const offline = ref(false);

    onMounted(async () => {
      try {
        health.value = await WarehouseService.getHealth();
      } catch {
        offline.value = true;
      }
    });

    return {
      health,
      offline,
      EWarehouseRouteName,
    };
  },
});
</script>

<style lang="scss" scoped>
:deep(.v-tabs .v-slide-group__content) {
  border-bottom: 1px solid #cdcdcd;
}
</style>
