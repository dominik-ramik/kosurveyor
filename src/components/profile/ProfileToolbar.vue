<template>
  <div class="d-flex align-center profile-toolbar">
    <!-- Profile selector
         Emits request-select-profile so GenerateForm can run the
         unsaved-changes guard before committing the switch. -->
    <v-select
      :model-value="profilesStore.activeProfile?.profile_name || ''"
      :items="profilesStore.profileNames"
      label="Select Survey profile"
      density="compact"
      variant="outlined"
      hide-details
      class="mr-3"
      style="max-width: 300px; min-width: 200px"
      :disabled="profilesStore.profileNames.length === 0"
      @update:model-value="onSelectProfile"
    />

    <v-btn
      variant="tonal"
      prepend-icon="mdi-download"
      class="mr-2"
      :disabled="!profilesStore.activeProfile"
      @click="profilesStore.exportProfileAsJson()"
    >
      Download
    </v-btn>

    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-dots-vertical"
          variant="text"
          class="mr-3"
          title="More options"
        />
      </template>

      <v-list density="compact" min-width="200">
        <v-list-item prepend-icon="mdi-plus"         title="New Survey profile"    @click="showNewDialog = true" />
        <v-list-item prepend-icon="mdi-upload"       title="Import Survey profile" @click="triggerImport" />
        <v-list-item
          prepend-icon="mdi-share-variant"
          title="Copy Share Link"
          :disabled="!profilesStore.activeProfile"
          @click="copyShareLink"
        />
        <v-divider class="my-1" />
        <v-list-item
          prepend-icon="mdi-delete"
          title="Delete Survey profile"
          base-color="error"
          :disabled="!profilesStore.activeProfile"
          @click="confirmDeleteDialog = true"
        />
      </v-list>
    </v-menu>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="onImportFile"
    />

    <v-btn
      color="primary"
      variant="elevated"
      :prepend-icon="isGenerating ? 'mdi-pencil' : 'mdi-cog'"
      :disabled="!profilesStore.activeProfile"
      @click="$emit('toggle-generate')"
    >
      {{ isGenerating ? 'Back to Editor' : 'Generate KoboToolbox Form' }}
    </v-btn>

    <!-- New Profile dialog -->
    <v-dialog v-model="showNewDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="primary">mdi-file-document-plus-outline</v-icon>
          New Survey profile
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          <v-text-field
            v-model="newProfile.profile_name"
            label="Survey profile name"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="newProfile.form_id_stem"
            label="Form ID stem"
            density="compact"
            variant="outlined"
            class="mb-3"
            @update:model-value="markFormIdTouched"
          />
          <v-textarea
            v-model="newProfile.profile_description"
            label="Description"
            density="compact"
            variant="outlined"
            rows="2"
            class="mb-3"
          />
          <v-text-field
            v-model="newProfile.profile_author"
            label="Author"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="showNewDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :disabled="!newProfile.profile_name || !newProfile.form_id_stem"
            @click="requestCreateProfile"
          >Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete profile dialog -->
    <v-dialog v-model="confirmDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="error">mdi-delete-outline</v-icon>
          Delete Survey profile
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          Are you sure you want to delete "{{ profilesStore.activeProfile?.profile_name }}"?
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="confirmDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { slugify } from '../../logic/slugify.js'

defineProps({
  isGenerating: { type: Boolean, default: false },
})

// request-select-profile  (name: string)
//   → Ask parent to guard unsaved changes, then switch to `name`.
//
// request-create-profile  (profileData: object)
//   → Ask parent to guard unsaved changes, then create and activate this profile.
//
// request-import-profile  (file: File)
//   → Ask parent to guard unsaved changes, then import this profile JSON.
//
// toggle-generate
//   → Parent (GenerateForm) intercepts and runs guard before toggling.
const emit = defineEmits([
  'toggle-generate',
  'request-select-profile',
  'request-create-profile',
  'request-import-profile',
])

const profilesStore      = useProfilesStore()
const showNewDialog      = ref(false)
const confirmDeleteDialog = ref(false)
const snackbar           = ref(false)
const snackbarText       = ref('')
const fileInput          = ref(null)
const formIdTouched      = ref(false)

const newProfile = reactive({
  profile_name: '',
  profile_description: '',
  profile_author: '',
  form_id_stem: '',
})

// Auto-slug form_id_stem from profile_name (while untouched)
watch(() => newProfile.profile_name, (val) => {
  if (!formIdTouched.value) newProfile.form_id_stem = slugify(val)
})

function markFormIdTouched() { formIdTouched.value = true }

onMounted(() => { profilesStore.loadProfileNames() })

// ── Profile switching ──────────────────────────────────────────────────
// Using :model-value (not v-model) on the v-select means the displayed
// value is always derived from the store.  If the parent's guard is
// cancelled the store doesn't change, so the dropdown reverts cleanly
// on the next reactive update — no manual reset needed.
function onSelectProfile(name) {
  if (name && name !== profilesStore.activeProfile?.profile_name) {
    emit('request-select-profile', name)
  }
}

// ── Create profile ─────────────────────────────────────────────────────
// Close the dialog first so it doesn't sit behind the guard dialog.
function requestCreateProfile() {
  const data = {
    profile_name:        newProfile.profile_name,
    profile_description: newProfile.profile_description,
    profile_author:      newProfile.profile_author,
    form_id_stem:        newProfile.form_id_stem,
  }
  showNewDialog.value = false
  emit('request-create-profile', data)
  // Reset form only after dialog closes (guard may still be pending)
  newProfile.profile_name        = ''
  newProfile.profile_description = ''
  newProfile.profile_author      = ''
  newProfile.form_id_stem        = ''
  formIdTouched.value            = false
}

// ── Import profile ─────────────────────────────────────────────────────
function triggerImport() { fileInput.value?.click() }

function onImportFile(e) {
  const file = e.target.files?.[0]
  if (file) emit('request-import-profile', file)
  if (fileInput.value) fileInput.value.value = ''
}

// ── Share link ─────────────────────────────────────────────────────────
async function copyShareLink() {
  const link = profilesStore.generateShareLink()
  if (!link) return
  try {
    await navigator.clipboard.writeText(link)
    snackbarText.value = 'Share link copied to clipboard.'
  } catch {
    snackbarText.value = 'Failed to copy to clipboard.'
  }
  snackbar.value = true
}

// ── Delete profile ─────────────────────────────────────────────────────
// Deleting the active profile removes it entirely; any ConfigDrawer
// unsaved changes are irrelevant, so no guard is needed here.
function doDelete() {
  if (profilesStore.activeProfile) {
    profilesStore.deleteProfile(profilesStore.activeProfile.profile_name)
  }
  confirmDeleteDialog.value = false
}

defineExpose({ showNewDialog })
</script>

<style scoped>
.profile-toolbar { overflow: visible; }
</style>