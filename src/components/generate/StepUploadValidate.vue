<template>
  <div>
    <v-alert type="info" density="compact" class="mb-4">
      Upload your completed data template (.xlsx) for validation.
    </v-alert>

    <v-file-input
      v-model="selectedFile"
      label="Upload Template (.xlsx)"
      accept=".xlsx"
      variant="outlined"
      density="compact"
      prepend-icon="mdi-file-upload"
      class="mb-4"
      @update:model-value="onFileSelected"
    />

    <v-progress-linear v-if="processing" indeterminate color="primary" class="mb-4" />

    <template v-if="generateStore.validationResult">
      <template v-if="!generateStore.validationResult.valid">
        <v-alert type="error" class="mb-3">
          <div class="font-weight-bold mb-2">Validation Failed</div>
          <ul>
            <li v-for="(err, i) in generateStore.validationResult.errors" :key="i">{{ err }}</li>
          </ul>
        </v-alert>
        <v-alert v-if="generateStore.validationResult.warnings.length" type="warning" class="mb-3">
          <div class="font-weight-bold mb-2">Warnings</div>
          <ul>
            <li v-for="(warn, i) in generateStore.validationResult.warnings" :key="i">{{ warn }}</li>
          </ul>
        </v-alert>
      </template>

      <template v-else>
        <v-alert type="success" class="mb-3">
          <div class="font-weight-bold mb-2">Validated Successfully</div>
          <div>{{ summaryText }}</div>
          <ul class="mt-1">
            <li v-for="(info, name) in groupSummary" :key="name">
              {{ name }}: {{ info }} rows
            </li>
          </ul>
        </v-alert>
        <v-btn color="primary" variant="tonal" @click="$emit('next')">
          Next
        </v-btn>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useGenerateStore } from '../../stores/generate.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

defineEmits(['next'])

const selectedFile = ref(null)
const processing = ref(false)

const groupSummary = computed(() => {
  const pd = generateStore.validationResult?.parsedData
  if (!pd) return {}
  const summary = {}
  for (const [name, rows] of Object.entries(pd.repeatRows || {})) {
    summary[name] = rows.length
  }
  return summary
})

const summaryText = computed(() => {
  const pd = generateStore.validationResult?.parsedData
  if (!pd) return ''
  const totalRows = Object.values(pd.repeatRows || {}).reduce((sum, rows) => sum + rows.length, 0)
  const groupCount = Object.keys(pd.repeatRows || {}).length
  return `${totalRows} repeat rows loaded across ${groupCount} group(s).`
})

async function onFileSelected(files) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return
  processing.value = true
  try {
    await generateStore.processUploadedFile(file, profilesStore.activeProfile)
  } finally {
    processing.value = false
  }
}
</script>
