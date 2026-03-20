<template>
  <div>
    <template v-if="!profilesStore.hasPrefillFields">
      <v-alert type="info" class="mb-4">
        No prefill data required for this profile. You can proceed directly to generation.
      </v-alert>
      <v-btn color="primary" variant="tonal" @click="advanceToGenerate">
        Advance to Generation
      </v-btn>
    </template>

    <template v-else>
      <v-alert type="info" density="compact" class="mb-4">
        The following groups require prefill data. Download the blank template, fill it in, then proceed to upload.
      </v-alert>

      <v-list density="compact" class="mb-4">
        <v-list-item
          v-for="group in prefillGroups"
          :key="group.name"
          :title="group.label"
          :subtitle="`${prefillFieldCount(group)} prefilled field(s)`"
        >
          <template #prepend>
            <v-icon color="primary">mdi-table</v-icon>
          </template>
        </v-list-item>
      </v-list>

      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-download"
        class="mr-3"
        @click="downloadTemplate"
      >
        Download Blank Template
      </v-btn>
      <v-btn variant="tonal" @click="$emit('next')">
        Next
      </v-btn>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useGenerateStore } from '../../stores/generate.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

const emit = defineEmits(['next'])

const prefillGroups = computed(() => {
  if (!profilesStore.activeProfile?.groups) return []
  return profilesStore.activeProfile.groups.filter((g) =>
    g.fields && g.fields.some((f) => f.prefilled === 'readonly' || f.prefilled === 'editable')
  )
})

function prefillFieldCount(group) {
  return group.fields.filter((f) => f.prefilled === 'readonly' || f.prefilled === 'editable').length
}

function downloadTemplate() {
  generateStore.downloadBlankTemplate(profilesStore.activeProfile)
}

function advanceToGenerate() {
  generateStore.initForProfile(profilesStore.activeProfile)
}
</script>
