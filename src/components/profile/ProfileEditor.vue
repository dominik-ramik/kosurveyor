<template>
  <v-container class="profile-editor-container" fluid>

    <div v-if="profilesStore.activeProfile" class="d-flex">
      <div class="flex-grow-1" style="min-width: 0">
        <ProfileCanvas
          @select-item="onSelectItem"
          @init-add-group="onInitAddGroup"
          @init-add-field="onInitAddField"
        />
      </div>
      <ConfigDrawer
        ref="configDrawerRef"
        :selected-item="selectedItem"
        :item-type="selectedItemType"
        :group-context="selectedGroupContext"
        :all-groups="profilesStore.activeProfile?.groups || []"
        :is-new="isNewItem"
        @save="onDrawerSave"
        @close="clearSelection"
        @delete="onDrawerDelete"
      />
    </div>

    <div v-else-if="!showNewProfileDialog" class="d-flex align-stretch gap-4">
      <v-card
        v-if="profilesStore.profileNames.length > 0"
        variant="elevated"
        class="d-flex flex-column profiles-list-card"
      >
        <div class="d-flex align-center px-4 pt-4 pb-2">
          <v-icon size="small" class="mr-1" color="primary">mdi-folder-outline</v-icon>
          <span class="text-subtitle-1 font-weight-bold">Existing Profiles</span>
        </div>
        <v-divider />
        <v-list class="overflow-y-auto flex-grow-1" lines="one">
          <template v-if="profilesStore.profileNames.length > 0">
            <!-- No guard needed here: this panel is only visible when no
                 profile is active, so ConfigDrawer can never be dirty. -->
            <v-list-item
              v-for="name in profilesStore.profileNames"
              :key="name"
              :title="name"
              prepend-icon="mdi-file-document-outline"
              @click="profilesStore.loadProfile(name)"
            />
          </template>
          <v-list-item v-else disabled>
            <v-list-item-title class="text-body-2 text-grey">No saved profiles</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>

      <v-card
        variant="elevated"
        class="pa-6 text-center flex-grow-1 d-flex flex-column align-center justify-center"
        :class="{ 'drop-active': dropActive }"
        @drop.prevent="onDrop"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
      >
        <input
          ref="fileInput"
          type="file"
          accept="application/json"
          style="display: none"
          @change="onFileInputChange"
        />
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-file-document-plus-outline</v-icon>
        <div class="text-h6 mb-2">No Profile Loaded</div>
        <div class="text-body-2 text-grey mb-4">
          Drop a profile JSON here, or create/import one to get started.
        </div>
        <div class="d-flex ga-2">
          <v-btn color="primary" variant="tonal" @click="showNewProfileDialog = true">New Profile</v-btn>
          <v-btn variant="outlined" @click="openFilePicker">Import Profile</v-btn>
        </div>
        <div v-if="dropActive" class="text-caption text-grey mt-3">Release to import profile</div>
      </v-card>
    </div>

    <!-- New profile dialog -->
    <v-dialog v-model="showNewProfileDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="primary">mdi-file-document-plus-outline</v-icon>
          New Profile
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          <v-text-field
            v-model="newProfile.profile_name"
            label="Profile Name"
            density="compact"
            variant="outlined"
            class="mb-3"
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
          <v-text-field
            v-model="newProfile.form_id_stem"
            label="Form ID Stem"
            density="compact"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="showNewProfileDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :disabled="!newProfile.profile_name || !newProfile.form_id_stem"
            @click="createProfile"
          >Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Unsaved-changes guard dialog ────────────────────────────────
         Shown before any navigation away from a dirty / invalid drawer.
         "Save & Continue" is hidden when there are blocking errors so the
         user is not offered a save path that would silently fail. -->
    <v-dialog v-model="showUnsavedDialog" max-width="440" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="warning">mdi-content-save-alert-outline</v-icon>
          Unsaved Changes
        </v-card-title>

        <v-card-text class="px-6 pb-3">
          <template v-if="unsavedDialogCanSave">
            You have unsaved changes.
            Save them before continuing, or discard to lose your edits.
          </template>
          <template v-else>
            Your current edits have validation errors and cannot be saved.
            Discard them to continue, or cancel to go back and fix the errors.
          </template>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-btn variant="text" @click="onUnsavedCancel">Cancel</v-btn>
          <v-spacer />
          <v-btn
            v-if="unsavedDialogCanSave"
            color="primary"
            variant="tonal"
            @click="onUnsavedSave"
          >Save &amp; Continue</v-btn>
          <v-btn
            color="warning"
            variant="tonal"
            @click="onUnsavedDiscard"
          >Discard &amp; Continue</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="shareLinkToast" :timeout="4000" color="info">
      Profile imported from link.
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useGenerateStore }  from '../../stores/generate.js'
import ProfileCanvas  from './ProfileCanvas.vue'
import ConfigDrawer   from './ConfigDrawer.vue'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

const shareLinkToast      = ref(false)
const showNewProfileDialog = ref(false)

// ── Drawer selection state ─────────────────────────────────────────────
const configDrawerRef      = ref(null)   // template ref → exposes isDirty / canSave / etc.
const selectedItem         = ref(null)
const selectedItemType     = ref('')
const selectedGroupContext = ref(null)
const isNewItem            = ref(false)

// ── Unsaved-changes dialog state ───────────────────────────────────────
const showUnsavedDialog    = ref(false)
const unsavedDialogCanSave = ref(false)
let   pendingResolve       = null        // resolves the guard Promise

const fileInput   = ref(null)
const dropActive  = ref(false)

const newProfile = reactive({
  profile_name: '',
  profile_description: '',
  profile_author: '',
  form_id_stem: '',
})

onMounted(() => {
  profilesStore.loadProfileNames()
  profilesStore._initAutoSave()

  const imported = profilesStore.checkAndImportShareLink()
  if (imported) shareLinkToast.value = true
})

watch(
  () => profilesStore.activeProfile,
  (profile) => {
    // Reset drawer state when the active profile changes externally.
    // By the time this fires, the guard has already been accepted
    // (either saved or discarded) via guardNavigation().
    clearSelection()
    if (profile) generateStore.checkProfileChanged(profile)
  },
  { deep: true },
)

// ── Navigation guard ───────────────────────────────────────────────────

/**
 * Returns a Promise that resolves to:
 *   true  — caller may proceed with the navigation
 *   false — user cancelled; caller must abort the navigation
 *
 * If the drawer has no unsaved changes the Promise resolves immediately.
 * Otherwise the unsaved-changes dialog is shown and the result reflects
 * the user's choice (Save & Continue → true, Discard → true, Cancel → false).
 */
async function guardNavigation() {
  const drawer = configDrawerRef.value
  if (!drawer || !drawer.isDirty) return true

  unsavedDialogCanSave.value = drawer.canSave
  showUnsavedDialog.value    = true

  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

/**
 * Convenience wrapper: runs `action` only after the guard resolves as true.
 * All canvas-originated navigations go through this.
 */
function guardAndRun(action) {
  guardNavigation().then((ok) => { if (ok) action() })
}

// Dialog button handlers
function onUnsavedSave() {
  configDrawerRef.value?.triggerSave()
  // triggerSave() emits 'save' → onDrawerSave() runs → selectedItem updates
  // → ConfigDrawer's watcher resets local → isDirty becomes false.
  showUnsavedDialog.value = false
  pendingResolve?.(true)
  pendingResolve = null
}

function onUnsavedDiscard() {
  configDrawerRef.value?.triggerDiscard()
  showUnsavedDialog.value = false
  pendingResolve?.(true)
  pendingResolve = null
}

function onUnsavedCancel() {
  showUnsavedDialog.value = false
  pendingResolve?.(false)
  pendingResolve = null
}

// ── Canvas event handlers (all guarded) ───────────────────────────────
function onSelectItem({ type, item, group }) {
  guardAndRun(() => {
    selectedItemType.value     = type
    selectedItem.value         = item
    selectedGroupContext.value = group
    isNewItem.value            = false
  })
}

function onInitAddGroup() {
  guardAndRun(() => {
    selectedItemType.value     = 'group'
    selectedItem.value         = {}
    selectedGroupContext.value = null
    isNewItem.value            = true
  })
}

function onInitAddField(group) {
  guardAndRun(() => {
    selectedItemType.value     = 'field'
    selectedItem.value         = {}
    selectedGroupContext.value = group
    isNewItem.value            = true
  })
}

function clearSelection() {
  selectedItem.value         = null
  selectedItemType.value     = ''
  selectedGroupContext.value = null
  isNewItem.value            = false
}

// ── Drawer save / delete ───────────────────────────────────────────────
function onDrawerDelete() {
  if (selectedItemType.value === 'group') {
    profilesStore.removeGroup(selectedItem.value.name)
  } else if (selectedItemType.value === 'field') {
    profilesStore.removeField(selectedGroupContext.value.name, selectedItem.value.name)
  }
  clearSelection()
}

function onDrawerSave(updatedData) {
  if (isNewItem.value) {
    if (selectedItemType.value === 'group') {
      profilesStore.addGroup(updatedData)
      const groups = profilesStore.activeProfile.groups
      selectedItem.value = groups[groups.length - 1]
    } else if (selectedItemType.value === 'field') {
      profilesStore.addField(selectedGroupContext.value.name, updatedData)
      const group = profilesStore.activeProfile.groups.find(
        (g) => g.name === selectedGroupContext.value.name
      )
      if (group?.fields) selectedItem.value = group.fields[group.fields.length - 1]
    }
    isNewItem.value = false  // transition to edit mode
  } else {
    if (selectedItemType.value === 'global') {
      profilesStore.updateProfileMetadata(updatedData)
    } else if (selectedItemType.value === 'group') {
      const originalName = selectedItem.value.name
      profilesStore.updateGroup(originalName, updatedData)
      const updated = profilesStore.activeProfile.groups.find(
        (g) => g.name === updatedData.name
      )
      if (updated) selectedItem.value = updated
    } else if (selectedItemType.value === 'field') {
      const originalName = selectedItem.value.name
      profilesStore.updateField(selectedGroupContext.value.name, originalName, updatedData)
      const group   = profilesStore.activeProfile.groups.find(
        (g) => g.name === selectedGroupContext.value.name
      )
      const updated = group?.fields?.find((f) => f.name === updatedData.name)
      if (updated) selectedItem.value = updated
    }
  }
}

// ── Profile creation (no-active-profile path only) ────────────────────
function createProfile() {
  profilesStore.setActiveProfile({ ...newProfile, groups: [] })
  profilesStore.saveActiveProfile()
  showNewProfileDialog.value  = false
  newProfile.profile_name     = ''
  newProfile.profile_description = ''
  newProfile.profile_author   = ''
  newProfile.form_id_stem     = ''
  clearSelection()
}

// ── File import helpers ────────────────────────────────────────────────
function openFilePicker() { fileInput.value?.click() }

async function onFileInputChange(e) {
  const f = e.target.files?.[0]
  if (f) await profilesStore.importProfileFromJson(f)
  e.target.value = ''
}

function onDragOver()  { dropActive.value = true  }
function onDragLeave() { dropActive.value = false }
async function onDrop(e) {
  dropActive.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await profilesStore.importProfileFromJson(file)
}

// ── Exposed API ────────────────────────────────────────────────────────
// GenerateForm calls guardNavigation() before switching to generate mode
// or before loading a different profile from the toolbar.
defineExpose({ guardNavigation })
</script>

<style scoped>
.profile-editor-container {
  max-width: 840px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.profiles-list-card {
  width: 340px;
  min-width: 340px;
  max-height: 400px;
}

.gap-4 { gap: 16px; }
</style>