<template>
  <v-container class="pa-3 w3-container-width">
    <v-card tile>
      <v-card-title class="pt-3 d-flex align-center">
        {{ $t("views_app.warehouse") }}
        <v-spacer />
        <v-btn
          size="small"
          variant="text"
          :href="activeUrl"
          target="_blank"
          rel="noopener"
        >
          Open in new tab
        </v-btn>
      </v-card-title>

      <v-tabs v-model="tab">
        <v-tab v-for="s in sections" :key="s.path" :value="s.path">{{ s.label }}</v-tab>
      </v-tabs>

      <v-card-subtitle class="py-2">
        Embeds the w3warehouse replay-event dashboard. Requires the stack running at
        <code>{{ baseUrl }}</code> (<code>docker compose up</code> in the w3warehouse repo).
      </v-card-subtitle>

      <!-- ponytail: iframe embed reuses the whole htmx dashboard; native Vue via /v1 JSON is the upgrade path -->
      <iframe
        :src="activeUrl"
        class="warehouse-frame"
        title="w3warehouse dashboard"
      />
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { WAREHOUSE_URL } from "@/config/env";

export default defineComponent({
  name: "Warehouse",
  setup() {
    const baseUrl = WAREHOUSE_URL.replace(/\/$/, "");
    const sections = [
      { label: "Replays", path: "/" },
      { label: "Search", path: "/search" },
      { label: "Openers", path: "/openers" },
      { label: "Stats", path: "/stats" },
    ];
    const tab = ref(sections[0].path);
    const activeUrl = computed(() => baseUrl + tab.value);
    return { baseUrl, sections, tab, activeUrl };
  },
});
</script>

<style scoped>
.warehouse-frame {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 480px;
  border: 0;
  display: block;
}
</style>
