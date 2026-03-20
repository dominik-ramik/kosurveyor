<template>
  <div>
    <!-- ── Path A: No prefill needed ──────────────────────────────── -->
    <template v-if="!profilesStore.hasPrefillFields">
      <v-alert type="info" variant="tonal" class="mb-5" icon="mdi-check-circle-outline">
        <div class="font-weight-medium mb-1">No prefill data required</div>
        <div class="text-body-2">
          This profile has no prefilled fields. Your deployment files can be generated immediately
          without uploading a data template.
        </div>
      </v-alert>

      <v-btn color="primary" variant="flat" @click="$emit('skip')">
        Proceed to Generate
        <v-icon end size="16">mdi-arrow-right</v-icon>
      </v-btn>
    </template>

    <!-- ── Path B: Prefill fields exist → download flow ───────────── -->
    <template v-else>
      <p class="text-body-2 text-medium-emphasis mb-4">
        The groups below require prefill data. Download the blank template, fill in your rows,
        then continue to upload.
      </p>

      <!-- Prefill group list -->
      <v-card variant="outlined" class="mb-5 rounded-lg" style="overflow: hidden">
        <v-list density="compact" class="py-0">
          <template v-for="(group, i) in prefillGroups" :key="group.name">
            <v-divider v-if="i > 0" />
            <v-list-item>
              <template #prepend>
                <v-avatar size="28" color="primary" variant="tonal" class="mr-2">
                  <v-icon size="15">mdi-table</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ group.label }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ prefillFieldCount(group) }} prefilled field(s)
              </v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-list>
      </v-card>

      <!-- Step 1 of 2: Download -->
      <div class="d-flex align-center gap-2 mb-2">
        <v-avatar size="20" :color="hasDownloaded ? 'success' : 'primary'" variant="flat">
          <v-icon v-if="hasDownloaded" size="12" color="white">mdi-check</v-icon>
          <span v-else style="font-size: 11px; color: white; font-weight: 700">1</span>
        </v-avatar>
        <span class="ml-2 text-caption font-weight-medium text-medium-emphasis">Download the blank template</span>
      </div>

      <v-btn
        :color="hasDownloaded ? 'success' : 'primary'"
        :variant="hasDownloaded ? 'tonal' : 'flat'"
        prepend-icon="mdi-download"
        :loading="downloading"
        class="mb-4"
        @click="handleDownload"
      >
        {{ hasDownloaded ? 'Template Downloaded' : 'Download Blank Template' }}
      </v-btn>

      <!-- Step 2 of 2: Continue -->
      <div class="d-flex align-center gap-2 mb-2">
        <v-avatar size="20" color="primary" variant="flat" :style="{ opacity: hasDownloaded ? 1 : 0.4 }">
          <span style="font-size: 11px; color: white; font-weight: 700">2</span>
        </v-avatar>
        <span class="ml-2 text-caption font-weight-medium text-medium-emphasis">
          Fill in your data, then continue
        </span>
      </div>

      <div class="d-flex align-center gap-3 flex-wrap">
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!hasDownloaded"
          @click="$emit('next')"
        >
          My template is filled — Continue
          <v-icon end size="16">mdi-arrow-right</v-icon>
        </v-btn>

        <!-- Escape hatch for users who already have a template from a prior session -->
        <v-btn
          v-if="!hasDownloaded"
          variant="text"
          size="small"
          color="primary"
          @click="$emit('next')"
        >
          I already have a filled template
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useGenerateStore }  from '../../stores/generate.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

defineEmits(['next', 'skip'])

const downloading   = ref(false)
const hasDownloaded = ref(false)

const prefillGroups = computed(() => {
  if (!profilesStore.activeProfile?.groups) return []
  return profilesStore.activeProfile.groups.filter((g) =>
    g.fields?.some((f) => f.prefilled === 'readonly' || f.prefilled === 'editable')
  )
})

function prefillFieldCount(group) {
  return group.fields.filter(
    (f) => f.prefilled === 'readonly' || f.prefilled === 'editable'
  ).length
}

async function handleDownload() {
  downloading.value = true
  try {
    await generateStore.downloadBlankTemplate(profilesStore.activeProfile)
    hasDownloaded.value = true
  } finally {
    downloading.value = false
  }
}
</script>
