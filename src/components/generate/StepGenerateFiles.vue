<template>
  <div>
    <v-card variant="elevated" class="pa-4 mb-4">
      <div class="d-flex align-center mb-3">
        <v-icon size="small" class="mr-1" color="primary">mdi-clipboard-check-outline</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Generation Summary</span>
      </div>
      <div><strong>Profile:</strong> {{ profilesStore.activeProfile?.profile_name }}</div>
      <div><strong>Form ID:</strong> {{ profilesStore.activeProfile?.form_id_stem }}</div>
      <div v-if="totalPrefillRows > 0"><strong>Prefill rows:</strong> {{ totalPrefillRows }}</div>
      <div v-if="groupNames.length"><strong>Groups:</strong> {{ groupNames.join(', ') }}</div>
    </v-card>

    <v-btn
      color="success"
      size="large"
      variant="tonal"
      prepend-icon="mdi-cog"
      :loading="generateStore.generating"
      @click="generate"
    >
      Generate Deployment Files
    </v-btn>

    <v-progress-linear v-if="generateStore.generating" indeterminate color="primary" class="mt-3" />

    <v-alert v-if="generated && !generateStore.generationError" type="success" class="mt-4">
      Files generated and downloaded:
      <ul>
        <li>{{ profilesStore.activeProfile?.form_id_stem }}.xlsx (XLSForm)</li>
        <li>{{ profilesStore.activeProfile?.form_id_stem }}_data.csv (Data CSV)</li>
      </ul>
    </v-alert>

    <v-alert v-if="generateStore.generationError" type="error" class="mt-4">
      {{ generateStore.generationError }}
    </v-alert>

    <div class="text-body-2 text-grey mt-4">
      You can generate again if your prefill data changes. You do not need to re-upload unless the profile structure changed.
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useGenerateStore } from '../../stores/generate.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

const generated = ref(false)

const totalPrefillRows = computed(() => {
  const pd = generateStore.validationResult?.parsedData
  if (!pd) return 0
  return Object.values(pd.repeatRows || {}).reduce((sum, rows) => sum + rows.length, 0)
})

const groupNames = computed(() => {
  return (profilesStore.activeProfile?.groups || []).map((g) => g.label)
})

async function generate() {
  generated.value = false
  await generateStore.generateFiles(profilesStore.activeProfile)
  if (!generateStore.generationError) {
    generated.value = true
  }
}
</script>
