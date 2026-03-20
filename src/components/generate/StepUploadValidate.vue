<template>
  <div>
    <!-- ── Drop / File Zone ───────────────────────────────────────── -->
    <div
      class="upload-zone"
      :class="{
        'upload-zone--dragging':  isDragging,
        'upload-zone--validated': isValidated,
        'upload-zone--error':     hasErrors,
      }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- Idle / drag state -->
      <template v-if="!isValidated">
        <v-icon size="36" :color="isDragging ? 'primary' : 'grey-lighten-2'" class="mb-2">
          mdi-file-upload-outline
        </v-icon>
        <div class="text-body-2 text-medium-emphasis mb-3">
          Drag your completed <strong>.xlsx</strong> template here, or
        </div>
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-folder-open-outline"
          @click="triggerFilePicker"
        >
          Browse files
        </v-btn>
        <!-- hidden real input -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx"
          style="display: none"
          @change="onFileInputChange"
        />
      </template>

      <!-- Validated / error state: show file info + swap option -->
      <template v-else>
        <v-icon
          size="36"
          :color="hasErrors ? 'error' : 'success'"
          class="mb-2"
        >
          {{ hasErrors ? 'mdi-file-alert-outline' : 'mdi-file-check-outline' }}
        </v-icon>
        <div class="text-body-2 font-weight-medium mb-1">{{ selectedFileName }}</div>
        <v-btn
          variant="text"
          size="small"
          color="primary"
          @click="resetUpload"
        >
          Change file
        </v-btn>
        <!-- hidden real input (reused) -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx"
          style="display: none"
          @change="onFileInputChange"
        />
      </template>
    </div>

    <!-- Processing indicator -->
    <v-progress-linear
      v-if="processing"
      indeterminate
      color="primary"
      rounded
      height="3"
      class="mt-3"
    />

    <!-- ── Validation Results ──────────────────────────────────────── -->
    <template v-if="generateStore.validationResult && !processing">

      <!-- ERRORS: file must be fixed and re-uploaded -->
      <v-alert
        v-if="!generateStore.validationResult.valid"
        type="error"
        variant="tonal"
        class="mt-4"
      >
        <div class="font-weight-bold mb-2">
          <v-icon size="16" class="mr-1">mdi-close-circle</v-icon>
          Validation Failed — {{ generateStore.validationResult.errors?.length }} error(s)
        </div>
        <ul class="pl-3 mt-1">
          <li
            v-for="(err, i) in generateStore.validationResult.errors"
            :key="i"
            class="text-body-2 mb-1"
          >{{ err }}</li>
        </ul>
        <v-divider class="my-3 border-opacity-25" />
        <div class="text-caption text-medium-emphasis">
          Fix the errors above in your spreadsheet and upload again.
        </div>
      </v-alert>

      <!-- SUCCESS + optional WARNINGS -->
      <template v-else>

        <!-- Success summary card -->
        <v-alert type="success" variant="tonal" class="mt-4">
          <div class="font-weight-bold mb-2">
            <v-icon size="16" class="mr-1">mdi-check-circle</v-icon>
            Validated Successfully
          </div>
          <div class="text-body-2 mb-2">{{ summaryText }}</div>
          <div
            v-for="(rowCount, name) in groupSummary"
            :key="name"
            class="d-flex align-center gap-2 text-body-2"
          >
            <v-icon size="13" color="success">mdi-check</v-icon>
            <span>{{ name }}: <strong>{{ rowCount }}</strong> row(s)</span>
          </div>
        </v-alert>

        <!-- Warnings — require explicit acknowledgment before proceeding -->
        <template v-if="hasWarnings">
          <v-alert type="warning" variant="tonal" class="mt-3">
            <div class="font-weight-bold mb-2">
              <v-icon size="16" class="mr-1">mdi-alert</v-icon>
              {{ generateStore.validationResult.warnings.length }} Warning(s) — Please Review
            </div>
            <ul class="pl-3">
              <li
                v-for="(warn, i) in generateStore.validationResult.warnings"
                :key="i"
                class="text-body-2 mb-1"
              >{{ warn }}</li>
            </ul>

            <v-divider class="my-3 border-opacity-25" />

            <!-- ★ Acknowledgment gate — user MUST check this before proceeding -->
            <v-checkbox
              v-model="warningsAcknowledged"
              color="warning"
              density="compact"
              hide-details
              class="mt-1"
            >
              <template #label>
                <span class="text-body-2">
                  I have reviewed these warnings and understand the implications
                </span>
              </template>
            </v-checkbox>
          </v-alert>
        </template>

        <!-- Continue CTA -->
        <div class="mt-4 d-flex align-center gap-3">
          <v-btn
            color="primary"
            variant="flat"
            :disabled="hasWarnings && !warningsAcknowledged"
            @click="handleContinue"
          >
            Continue
            <v-icon end size="16">mdi-arrow-right</v-icon>
          </v-btn>

          <span
            v-if="hasWarnings && !warningsAcknowledged"
            class="text-caption text-medium-emphasis ml-2"
          >
            Acknowledge the warnings above to continue
          </span>
        </div>

      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useGenerateStore }  from '../../stores/generate.js'
import { getField }          from '../../plugins/fields/index.js'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

/**
 * Emits:
 *   next — { mediaNeeded: boolean }
 *     mediaNeeded: true if the parsed data contains media file references
 */
const emit = defineEmits(['next'])

// ── Local state ────────────────────────────────────────────────────────
const fileInputRef         = ref(null)
const selectedFileName     = ref('')
const processing           = ref(false)
const isDragging           = ref(false)
const warningsAcknowledged = ref(false)

// ── Derived ────────────────────────────────────────────────────────────
const isValidated = computed(() => !!generateStore.validationResult)
const hasErrors   = computed(() => !generateStore.validationResult?.valid)
const hasWarnings = computed(() =>
  !!generateStore.validationResult?.warnings?.length
)

const groupSummary = computed(() => {
  const pd = generateStore.validationResult?.parsedData
  if (!pd) return {}
  const out = {}
  for (const [name, rows] of Object.entries(pd.repeatRows || {})) {
    out[name] = rows.length
  }
  return out
})

const summaryText = computed(() => {
  const pd = generateStore.validationResult?.parsedData
  if (!pd) return ''
  const totalRows  = Object.values(pd.repeatRows || {}).reduce((s, r) => s + r.length, 0)
  const groupCount = Object.keys(pd.repeatRows || {}).length
  return `${totalRows} repeat row(s) loaded across ${groupCount} group(s).`
})

/**
 * Computes whether any media filenames are actually referenced in the
 * parsed data rows. This is more accurate than a profile-level flag
 * because a profile may have media fields but none populated in this upload.
 */
const mediaNeededFromData = computed(() => {
  const pd = generateStore.validationResult?.parsedData
  if (!pd || !profilesStore.activeProfile) return false

  for (const group of profilesStore.activeProfile.groups) {
    const mediaFields = (group.fields || []).filter(
      (f) => getField(f.widget)?.isMediaType && f.prefilled === 'readonly'
    )
    if (!mediaFields.length) continue

    // Check single-page values
    if (pd.pageValues?.[group.name]) {
      for (const mf of mediaFields) {
        if (pd.pageValues[group.name][mf.name]) return true
      }
    }
    // Check repeat rows
    if (pd.repeatRows?.[group.name]) {
      for (const row of pd.repeatRows[group.name]) {
        for (const mf of mediaFields) {
          if (row[mf.name]) return true
        }
      }
    }
  }
  return false
})

// ── File handling ──────────────────────────────────────────────────────
function triggerFilePicker() {
  fileInputRef.value?.click()
}

function onFileInputChange(event) {
  const file = event.target.files?.[0]
  if (file) processFile(file)
}

function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]
  if (file && file.name.endsWith('.xlsx')) {
    processFile(file)
  }
}

async function processFile(file) {
  selectedFileName.value     = file.name
  warningsAcknowledged.value = false   // reset gate on new upload
  processing.value           = true
  try {
    await generateStore.processUploadedFile(file, profilesStore.activeProfile)
  } finally {
    processing.value = false
  }
}

function resetUpload() {
  generateStore.validationResult     = null
  selectedFileName.value             = ''
  warningsAcknowledged.value         = false
  if (fileInputRef.value) fileInputRef.value.value = ''
  triggerFilePicker()
}

// ── Continue action ────────────────────────────────────────────────────
function handleContinue() {
  emit('next', { mediaNeeded: mediaNeededFromData.value })
}
</script>

<style scoped>
.upload-zone {
  border: 2px dashed rgba(var(--v-border-color), calc(var(--v-border-opacity) * 2));
  border-radius: 10px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: border-color 0.2s ease, background 0.2s ease;
  background: rgba(var(--v-theme-on-surface), 0.015);
  cursor: default;
}

.upload-zone--dragging {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.upload-zone--validated {
  border-style: solid;
  border-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.03);
}

.upload-zone--error {
  border-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.03);
}
</style>
