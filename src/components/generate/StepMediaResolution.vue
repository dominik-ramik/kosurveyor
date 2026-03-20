<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      The uploaded data references media files. Select the folder that contains them — all files
      must be resolved before you can generate.
    </p>

    <!-- Select folder button -->
    <v-btn
      color="primary"
      :variant="generateStore.mediaFolder ? 'tonal' : 'flat'"
      prepend-icon="mdi-folder-open-outline"
      class="mb-5"
      @click="selectFolder"
    >
      {{ generateStore.mediaFolder ? 'Change Media Folder' : 'Select Media Folder' }}
    </v-btn>

    <!-- Results (after folder selected) -->
    <template v-if="generateStore.mediaFolder">

      <!-- Progress bar -->
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="text-caption text-medium-emphasis">Files resolved</span>
        <span class="text-caption font-weight-bold" :class="allResolved ? 'text-success' : 'text-warning'">
          {{ resolvedCount }} / {{ totalRequired }}
        </span>
      </div>
      <v-progress-linear
        :model-value="progressPercent"
        :color="allResolved ? 'success' : 'warning'"
        rounded
        height="6"
        class="mb-5"
      />

      <!-- File resolution list -->
      <v-card variant="outlined" class="rounded-lg mb-4" style="overflow: hidden">
        <v-list density="compact" class="py-0">
          <template v-for="(file, i) in requiredMediaFiles" :key="file">
            <v-divider v-if="i > 0" />
            <v-list-item>
              <template #prepend>
                <v-icon
                  :color="isResolved(file) ? 'success' : 'error'"
                  size="18"
                  class="mr-2"
                >
                  {{ isResolved(file) ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}
                </v-icon>
              </template>
              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ file }}
              </v-list-item-title>
              <template #append>
                <v-chip
                  size="x-small"
                  :color="isResolved(file) ? 'success' : 'error'"
                  label
                  variant="tonal"
                >
                  {{ isResolved(file) ? 'Found' : 'Missing' }}
                </v-chip>
              </template>
            </v-list-item>
          </template>
        </v-list>
      </v-card>

      <!-- Missing files error -->
      <v-alert
        v-if="!allResolved"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ missingCount }} file(s) not found in the selected folder.
        Ensure all media files are in the same directory, then re-select the folder.
      </v-alert>

      <!-- Continue button -->
      <v-btn
        v-if="allResolved"
        color="primary"
        variant="flat"
        @click="$emit('next')"
      >
        Continue to Generate
        <v-icon end size="16">mdi-arrow-right</v-icon>
      </v-btn>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useProfilesStore }   from '../../stores/profiles.js'
import { useGenerateStore }   from '../../stores/generate.js'
import { getField }           from '../../plugins/fields/index.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

defineEmits(['next'])

// ── Required media files (from parsed data, not profile level) ─────────
const requiredMediaFiles = computed(() => {
  const files = new Set()
  const pd    = generateStore.validationResult?.parsedData
  if (!pd || !profilesStore.activeProfile) return []

  for (const group of profilesStore.activeProfile.groups) {
    const mediaFields = (group.fields || []).filter(
      (f) => getField(f.widget)?.isMediaType && f.prefilled === 'readonly'
    )
    if (!mediaFields.length) continue

    if (pd.pageValues?.[group.name]) {
      for (const mf of mediaFields) {
        const val = pd.pageValues[group.name][mf.name]
        if (val) files.add(val)
      }
    }
    if (pd.repeatRows?.[group.name]) {
      for (const row of pd.repeatRows[group.name]) {
        for (const mf of mediaFields) {
          const val = row[mf.name]
          if (val) files.add(val)
        }
      }
    }
  }
  return [...files]
})

const totalRequired  = computed(() => requiredMediaFiles.value.length)
const resolvedCount  = computed(() => generateStore.resolvedMediaFiles?.length ?? 0)
const missingCount   = computed(() => totalRequired.value - resolvedCount.value)
const progressPercent = computed(() =>
  totalRequired.value === 0 ? 100 : Math.round((resolvedCount.value / totalRequired.value) * 100)
)
const allResolved = computed(() =>
  totalRequired.value > 0 && resolvedCount.value >= totalRequired.value
)

function isResolved(filename) {
  return generateStore.resolvedMediaFiles?.includes(filename) ?? false
}

async function selectFolder() {
  await generateStore.selectMediaFolder()
  generateStore.setMediaRequiredFiles(requiredMediaFiles.value)
}

onMounted(() => {
  // Recompute if folder was already chosen (e.g. user navigated back)
  if (generateStore.mediaFolder) {
    generateStore.setMediaRequiredFiles(requiredMediaFiles.value)
  }
})
</script>
