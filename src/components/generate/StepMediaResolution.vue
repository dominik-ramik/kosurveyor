<template>
  <div>
    <v-alert type="info" density="compact" class="mb-4">
      Your profile includes prefilled media fields. Please select a folder containing the required media files.
    </v-alert>

    <v-btn color="primary" variant="tonal" prepend-icon="mdi-folder-open" class="mb-4" @click="selectFolder">
      Select Media Folder
    </v-btn>

    <template v-if="generateStore.mediaFolder">
      <div class="text-subtitle-2 mb-2">
        {{ generateStore.resolvedMediaFiles.length }} of {{ totalRequired }} media files found.
      </div>

      <v-list density="compact" class="mb-4">
        <v-list-item
          v-for="file in requiredMediaFiles"
          :key="file"
          :title="file"
        >
          <template #prepend>
            <v-icon
              :color="isResolved(file) ? 'success' : 'error'"
            >
              {{ isResolved(file) ? 'mdi-check-circle' : 'mdi-alert-circle' }}
            </v-icon>
          </template>
        </v-list-item>
      </v-list>

      <v-alert v-if="generateStore.missingMediaFiles.length > 0" type="error" class="mb-4">
        All media files must be present before generation.
      </v-alert>

      <v-btn
        v-if="generateStore.allMediaResolved || generateStore.missingMediaFiles.length === 0"
        color="primary"
        variant="tonal"
        @click="$emit('next')"
      >
        Next
      </v-btn>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useGenerateStore } from '../../stores/generate.js'
import { getField } from '../../plugins/fields/index.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

defineEmits(['next'])

const requiredMediaFiles = computed(() => {
  const files = new Set()
  const pd = generateStore.validationResult?.parsedData
  if (!pd || !profilesStore.activeProfile) return []

  for (const group of profilesStore.activeProfile.groups) {
    const mediaFields = (group.fields || []).filter(
      (f) => getField(f.widget)?.isMediaType && f.prefilled === 'readonly'
    )
    if (mediaFields.length === 0) continue

    // Check page values
    if (pd.pageValues[group.name]) {
      for (const mf of mediaFields) {
        const val = pd.pageValues[group.name][mf.name]
        if (val) files.add(val)
      }
    }
    // Check repeat rows
    if (pd.repeatRows[group.name]) {
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

const totalRequired = computed(() => requiredMediaFiles.value.length)

function isResolved(filename) {
  return generateStore.resolvedMediaFiles.includes(filename)
}

async function selectFolder() {
  await generateStore.selectMediaFolder()
  // Now compute resolution against required media
  generateStore.setMediaRequiredFiles(requiredMediaFiles.value)
}

onMounted(() => {
  // If media folder was already selected, recompute
  if (generateStore.mediaFolder) {
    generateStore.setMediaRequiredFiles(requiredMediaFiles.value)
  }
})
</script>
