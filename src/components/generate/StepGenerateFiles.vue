<template>
  <div>
    <!-- Broken cascade error (blocks generation) -->
    <v-alert
      v-if="hasBrokenFields"
      type="error"
      variant="tonal"
      class="mb-5"
    >
      <div class="font-weight-bold mb-1">Cannot Generate — Broken Filter References</div>
      <div class="text-body-2">
        The Survey profile contains broken cascade filter references. Return to the editor
        and resolve them before generating.
      </div>
    </v-alert>

    <!-- ── Generate button ────────────────────────────────────────── -->
    <div class="d-flex align-center gap-4 flex-wrap mb-4">
      <v-btn
        color="success"
        size="large"
        variant="flat"
        prepend-icon="mdi-cog-outline"
        :loading="generateStore.generating"
        :disabled="hasBrokenFields || generateStore.generating"
        @click="generate"
      >
        {{ generated ? 'Re-generate Files' : 'Generate Deployment Files' }}
      </v-btn>

      <v-progress-circular
        v-if="generateStore.generating"
        indeterminate
        color="success"
        size="22"
        width="2"
      />
    </div>

    <!-- ── Generation error ───────────────────────────────────────── -->
    <v-alert
      v-if="generateStore.generationError"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      <div class="font-weight-bold mb-1">Generation Failed</div>
      <div class="text-body-2">{{ generateStore.generationError }}</div>
    </v-alert>

    <!-- ── Success state ──────────────────────────────────────────── -->
    <v-alert
      v-if="generated && !generateStore.generationError"
      type="success"
      variant="tonal"
      class="mb-4"
    >
      <div class="font-weight-bold mb-2">
        <v-icon size="16" class="mr-1">mdi-download-circle-outline</v-icon>
        Files Generated &amp; Downloaded
      </div>
      <div class="d-flex flex-column gap-1 text-body-2">
        <div class="d-flex align-center gap-2">
          <v-icon size="14" color="success">mdi-microsoft-excel</v-icon>
          <span>{{ profilesStore.activeProfile?.form_id_stem }}.xlsx — XLSForm</span>
        </div>
        <div class="d-flex align-center gap-2">
          <v-icon size="14" color="success">mdi-file-delimited-outline</v-icon>
          <span>{{ profilesStore.activeProfile?.form_id_stem }}_data.csv — Prefill data</span>
        </div>
      </div>
    </v-alert>

    <!-- Contextual hint -->
    <p class="text-caption text-medium-emphasis mb-6">
      You can generate again if your prefill data changes.
      Re-upload is only needed if the profile structure has changed.
    </p>

    <!-- ── What next ─────────────────────────────────────────────── -->
    <v-card variant="outlined" class="rounded-lg" style="overflow: hidden">
      <div class="px-4 py-3 d-flex align-center" style="background: rgba(var(--v-theme-primary), 0.06)">
        <v-icon size="16" color="primary" class="mr-2">mdi-compass-outline</v-icon>
        <span class="text-body-2 font-weight-bold">What next?</span>
      </div>
      <v-divider />

      <v-list lines="two" class="py-2">

        <!-- Step 1 — always shown -->
        <v-list-item>
          <template #prepend>
            <v-avatar size="26" color="primary" variant="flat" class="mr-3 flex-shrink-0" style="font-size: 12px; font-weight: 700; color: white">
              1
            </v-avatar>
          </template>
          <v-list-item-title class="text-body-2 font-weight-medium">
            Log in to KoboToolbox
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Open an existing project or create a new one, depending on whether you are
            deploying for the first time or updating.
          </v-list-item-subtitle>
        </v-list-item>

        <!-- Step 2 — only when a CSV was generated -->
        <template v-if="totalPrefillRows > 0">
          <v-divider inset />
          <v-list-item>
            <template #prepend>
              <v-avatar size="26" color="primary" variant="flat" class="mr-3 flex-shrink-0" style="font-size: 12px; font-weight: 700; color: white">
                2
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">
              Upload the prefill spreadsheet — <span class="font-weight-regular text-medium-emphasis">Settings → Media</span>
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              In the <strong>Settings</strong> tab, go to the <strong>Media</strong> section.
              If a file with the same name as the generated CSV already exists, delete it first,
              then upload the new CSV.
            </v-list-item-subtitle>
          </v-list-item>
        </template>

        <v-divider inset />

        <!-- Step 3 (or 2 if no CSV) -->
        <v-list-item>
          <template #prepend>
            <v-avatar size="26" color="primary" variant="flat" class="mr-3 flex-shrink-0" style="font-size: 12px; font-weight: 700; color: white">
              {{ totalPrefillRows > 0 ? 3 : 2 }}
            </v-avatar>
          </template>
          <v-list-item-title class="text-body-2 font-weight-medium">
            Replace the XLSForm — <span class="font-weight-regular text-medium-emphasis">Form tab
            <v-icon size="13" class="ml-1">mdi-cached</v-icon></span>
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            On the <strong>Form</strong> card, use the replace button
            <v-icon size="12" class="mx-1">mdi-cached</v-icon>
            to upload the generated XLSForm. You can optionally tweak it first if you need
            any additional functionality.
          </v-list-item-subtitle>
        </v-list-item>

        <v-divider inset />

        <!-- Step 4 (or 3 if no CSV) -->
        <v-list-item>
          <template #prepend>
            <v-avatar size="26" color="primary" variant="flat" class="mr-3 flex-shrink-0" style="font-size: 12px; font-weight: 700; color: white">
              {{ totalPrefillRows > 0 ? 4 : 3 }}
            </v-avatar>
          </template>
          <v-list-item-title class="text-body-2 font-weight-medium">
            Preview, then Deploy
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Use the <strong>Preview</strong>
            <v-icon size="12" class="mx-1">mdi-eye-outline</v-icon>
            function to test the form. When satisfied, hit <strong>Deploy</strong> (or
            <strong>Redeploy</strong> if updating an existing project) to publish.
          </v-list-item-subtitle>
        </v-list-item>

      </v-list>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProfilesStore }        from '../../stores/profiles.js'
import { useGenerateStore }        from '../../stores/generate.js'
import { useCascadeValidation }    from '../../composables/useCascadeValidation.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

const { brokenFields } = useCascadeValidation(profilesStore)
const hasBrokenFields  = computed(() => brokenFields.value.size > 0)

const generated = ref(false)

const totalPrefillRows = computed(() => {
  const pd = generateStore.validationResult?.parsedData
  if (!pd) return 0
  return Object.values(pd.repeatRows || {}).reduce((s, r) => s + r.length, 0)
})

const groupNames = computed(() =>
  (profilesStore.activeProfile?.groups || []).map((g) => g.label)
)

async function generate() {
  generated.value = false
  await generateStore.generateFiles(profilesStore.activeProfile)
  if (!generateStore.generationError) {
    generated.value = true
  }
}
</script>