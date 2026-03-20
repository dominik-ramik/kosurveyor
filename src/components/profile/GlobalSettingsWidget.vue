<template>
  <v-card
    class="global-settings-widget mb-4"
    :class="{ 'global-settings-widget--selected': isSelected }"
    variant="outlined"
    @click="$emit('select')"
  >
    <v-card-text>
      <div class="d-flex align-center mb-2">
        <v-icon class="mr-2" color="primary">mdi-clipboard-text-outline</v-icon>
        <span class="text-subtitle-1 font-weight-bold">{{
          profile.profile_name || "(unnamed)"
        }}</span>
        <span class="text-grey ml-2" v-if="showNames">
          ({{ profile.form_id_stem || "(not set)" }})</span
        >        
        <div v-if="profile.profile_author" class="ml-2">
          by {{ profile.profile_author }}
        </div>
        
      </div>
      <div v-if="profile" class="text-body-2 d-flex flex-row ga-1">
        <div v-if="profile.profile_description" class="ml-8">
          <strong>Description:</strong> {{ profile.profile_description }}
        </div>
      </div>
      <div v-else class="text-body-2 text-grey">No profile loaded.</div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  profile: { type: Object, default: null },
  isSelected: { type: Boolean, default: false },
});

defineEmits(["select"]);

import { useUiPrefs } from '../../composables/useUiPrefs.js'
const { showNames } = useUiPrefs()
</script>

<style scoped>
.global-settings-widget {
  cursor: pointer;
  transition: border-color 0.15s;
}
.global-settings-widget--selected {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}
</style>
