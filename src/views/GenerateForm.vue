<template>
  <div>
    <!-- ── Page Header ──────────────────────────────────────────── -->
    <div class="d-flex align-center mb-2">
      <v-icon size="30" color="primary" class="mr-3">mdi-file-document-plus-outline</v-icon>
      <h1 class="text-h5 font-weight-bold">Generate survey</h1>
      <v-spacer />
      <ProfileToolbar
        v-if="profilesStore.activeProfile"
        :is-generating="isGenerating"
        @toggle-generate="handleToggleGenerate"
        @request-select-profile="handleRequestSelectProfile"
        @request-create-profile="handleRequestCreateProfile"
        @request-import-profile="handleRequestImportProfile"
      />
    </div>

    <!-- ProfileEditor is only mounted in editor mode.
         When unmounted, profileEditorRef is null, so the guard is
         skipped (no ConfigDrawer open → nothing to guard). -->
    <ProfileEditor
      v-if="!isGenerating"
      ref="profileEditorRef"
    />

    <!-- ── Generation Flow ──────────────────────────────────────── -->
    <template v-else>
      <v-container fluid class="pa-0">
        <v-row justify="center">
          <v-col cols="12" md="8" lg="7">

            <v-alert v-if="!profilesStore.activeProfile" type="warning" variant="tonal" class="mb-6">
              No profile loaded. Return to the Editor to create or load a profile first.
            </v-alert>

            <template v-else>
              <v-alert
                v-if="profilesStore.hasPrefillFields"
                type="info"
                variant="tonal"
                density="compact"
                class="mb-4"
                icon="mdi-information-outline"
              >
                Prefill data is not saved between sessions — re-attach your file each time you generate.
              </v-alert>

              <v-alert
                v-if="generateStore.obsoleteTemplate"
                type="warning"
                variant="tonal"
                closable
                class="mb-5"
              >
                <strong>Template obsolete.</strong>
                The profile structure changed since your last download. Download a fresh template,
                migrate your data, and re-upload.
              </v-alert>

              <!-- ── Vertical Step Flow ─────────────────────────── -->
              <div class="gf-flow">

                <GenerateStep
                  :number="stepNums.template"
                  title="Data Template"
                  :status="templateStatus"
                  :summary="templateSummary"
                  :expanded="activePanel === 'template'"
                  :is-last="!showUploadFlow && templateDone"
                  @expand="activePanel = 'template'"
                  @collapse="activePanel = null"
                >
                  <StepTemplateProvision @next="onTemplateNext" @skip="onTemplateSkip" />
                </GenerateStep>

                <GenerateStep
                  v-if="showUploadFlow"
                  :number="stepNums.upload"
                  title="Upload & Validate"
                  :status="uploadStatus"
                  :summary="uploadSummary"
                  :expanded="activePanel === 'upload'"
                  :locked="!templateDone"
                  @expand="activePanel = 'upload'"
                  @collapse="activePanel = null"
                >
                  <StepUploadValidate @next="onUploadNext" />
                </GenerateStep>

                <GenerateStep
                  v-if="showUploadFlow && mediaRequired"
                  :number="stepNums.media"
                  title="Media Files"
                  :status="mediaStatus"
                  :summary="mediaSummary"
                  :expanded="activePanel === 'media'"
                  :locked="!uploadDone"
                  @expand="activePanel = 'media'"
                  @collapse="activePanel = null"
                >
                  <StepMediaResolution @next="onMediaNext" />
                </GenerateStep>

                <GenerateStep
                  :number="stepNums.generate"
                  title="Generate Files"
                  :status="generateStatus"
                  :expanded="activePanel === 'generate'"
                  :locked="!readyToGenerate"
                  :is-last="true"
                  @expand="activePanel = 'generate'"
                  @collapse="activePanel = null"
                >
                  <StepGenerateFiles />
                </GenerateStep>

              </div>
            </template>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProfilesStore } from '../stores/profiles.js'
import { useGenerateStore }  from '../stores/generate.js'

import ProfileToolbar        from '../components/profile/ProfileToolbar.vue'
import ProfileEditor         from '../components/profile/ProfileEditor.vue'
import GenerateStep          from '../components/generate/GenerateStep.vue'
import StepTemplateProvision from '../components/generate/StepTemplateProvision.vue'
import StepUploadValidate    from '../components/generate/StepUploadValidate.vue'
import StepMediaResolution   from '../components/generate/StepMediaResolution.vue'
import StepGenerateFiles     from '../components/generate/StepGenerateFiles.vue'

const profilesStore = useProfilesStore()
const generateStore = useGenerateStore()

// ── Template ref ───────────────────────────────────────────────────────
// Only non-null while the editor is mounted (i.e. !isGenerating).
// When null the guard is skipped automatically.
const profileEditorRef = ref(null)

// ── Mode toggle ────────────────────────────────────────────────────────
const isGenerating = ref(false)

// ── Generate step state ────────────────────────────────────────────────
const activePanel    = ref('template')
const showUploadFlow = ref(true)
const mediaRequired  = ref(false)
const templateDone   = ref(false)
const uploadDone     = ref(false)
const mediaDone      = ref(false)

// ── Step status ────────────────────────────────────────────────────────
const templateStatus = computed(() => {
  if (templateDone.value)              return 'complete'
  if (activePanel.value === 'template') return 'active'
  return 'idle'
})

const uploadStatus = computed(() => {
  if (uploadDone.value) return 'complete'
  if (generateStore.validationResult?.valid && generateStore.validationResult?.warnings?.length)
    return 'warning'
  if (activePanel.value === 'upload') return 'active'
  return 'idle'
})

const mediaStatus = computed(() => {
  if (mediaDone.value)              return 'complete'
  if (activePanel.value === 'media') return 'active'
  return 'idle'
})

const generateStatus = computed(() =>
  activePanel.value === 'generate' ? 'active' : 'idle'
)

const stepNums = computed(() => {
  if (!showUploadFlow.value)  return { template: 1, generate: 2 }
  if (mediaRequired.value)    return { template: 1, upload: 2, media: 3, generate: 4 }
  return { template: 1, upload: 2, generate: 3 }
})

const templateSummary = computed(() => {
  if (!templateDone.value) return ''
  return showUploadFlow.value
    ? 'Template downloaded. Ready to upload your filled data.'
    : 'No prefill data required — skipping directly to generation.'
})

const uploadSummary = computed(() => {
  if (!uploadDone.value) return ''
  const pd        = generateStore.validationResult?.parsedData
  if (!pd) return 'File validated.'
  const totalRows  = Object.values(pd.repeatRows || {}).reduce((s, r) => s + r.length, 0)
  const groupCount = Object.keys(pd.repeatRows || {}).length
  const mediaPart  = mediaRequired.value ? ' • Media files required.' : ''
  return `${totalRows} row(s) across ${groupCount} group(s) validated.${mediaPart}`
})

const mediaSummary = computed(() =>
  mediaDone.value
    ? `All ${generateStore.resolvedMediaFiles.length} media file(s) resolved.`
    : ''
)

const readyToGenerate = computed(() => {
  if (!templateDone.value)  return false
  if (!showUploadFlow.value) return true
  if (!uploadDone.value)    return false
  if (mediaRequired.value && !mediaDone.value) return false
  return true
})

// ── Step event handlers ────────────────────────────────────────────────
function onTemplateNext() {
  showUploadFlow.value = true
  templateDone.value   = true
  activePanel.value    = 'upload'
}

function onTemplateSkip() {
  showUploadFlow.value = false
  templateDone.value   = true
  activePanel.value    = 'generate'
}

function onUploadNext({ mediaNeeded }) {
  uploadDone.value    = true
  mediaRequired.value = mediaNeeded
  activePanel.value   = mediaNeeded ? 'media' : 'generate'
}

function onMediaNext() {
  mediaDone.value   = true
  activePanel.value = 'generate'
}

// ── Guarded toolbar handlers ───────────────────────────────────────────

/**
 * Run the unsaved-changes guard (if the editor is mounted), then execute
 * the given action.  Used for all profile-mutating toolbar events.
 */
async function guardedAction(action) {
  const editor = profileEditorRef.value
  if (editor) {
    const ok = await editor.guardNavigation()
    if (!ok) return
  }
  action()
}

/** "Generate KoboToolbox Form" / "Back to Editor" button */
async function handleToggleGenerate() {
  // Guard only when going FROM editor TO generate (editor is mounted then).
  // Going back to editor never needs a guard — nothing to lose in generate mode.
  await guardedAction(() => {
    isGenerating.value = !isGenerating.value
  })
}

/** Profile dropdown selection */
async function handleRequestSelectProfile(name) {
  await guardedAction(() => {
    profilesStore.loadProfile(name)
  })
}

/**
 * "New Profile" — guard first, then create.
 * The toolbar already closed its dialog before emitting this event.
 */
async function handleRequestCreateProfile(profileData) {
  await guardedAction(() => {
    profilesStore.setActiveProfile({ ...profileData, groups: [] })
    profilesStore.saveActiveProfile()
  })
}

/**
 * "Import Profile" — guard first, then import.
 */
async function handleRequestImportProfile(file) {
  await guardedAction(async () => {
    await profilesStore.importProfileFromJson(file)
  })
}

// ── Init ───────────────────────────────────────────────────────────────
onMounted(() => {
  if (profilesStore.activeProfile) {
    generateStore.initForProfile(profilesStore.activeProfile)
  }
})
</script>

<style scoped>
.gf-flow {
  display: flex;
  flex-direction: column;
}
</style>