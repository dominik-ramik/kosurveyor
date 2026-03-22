<template>
  <v-navigation-drawer
    location="right"
    :width="500"
    :model-value="true"
    permanent
  >
    <div class="drawer-flex-root">
      <!-- ── Fixed header ──────────────────────────────────────────────── -->
      <div
        class="drawer-header px-4 d-flex align-center ga-2 flex-shrink-0 elevation-1"
        :style="isDirty ? 'background: rgba(var(--v-theme-warning), 0.15)' : ''"
      >
        <!-- Group or Field: icon + type label + divider + item label -->
        <template v-if="activePlugin">
          <v-icon :icon="activePlugin.icon" color="primary" size="18" class="flex-shrink-0" />
          <span class="text-body-2 font-weight-medium text-primary text-no-wrap flex-shrink-0">
            {{ activePlugin.label }}
          </span>
          <v-divider vertical class="flex-shrink-0 drawer-header-divider" />
          <span class="text-body-2 font-weight-medium text-truncate flex-grow-1">
            {{ local.label || local.name || (isNew ? `New ${itemType === 'group' ? 'Group' : 'Field'}` : '') }}
          </span>
        </template>

        <!-- Fallback: global settings, picker screens, empty state -->
        <template v-else>
          <span class="text-body-2 font-weight-medium flex-grow-1">{{ drawerTitle }}</span>
        </template>

        <span
          v-if="isDirty"
          class="d-flex align-center ga-1 text-caption font-weight-medium text-no-wrap flex-shrink-0"
          style="color: rgb(var(--v-theme-warning))"
        >
          Unsaved
        </span>
      </div>

      <v-divider />

      <!-- ── Scrollable content ─────────────────────────────────────────── -->
      <div class="pa-4 drawer-content">

        <!-- ── New group: type picker ──────────────────────────────────── -->
        <template v-if="isNew && itemType === 'group' && !local.type">
          <div class="text-subtitle-1 font-weight-bold mb-3">Select Group Type</div>
          <v-card
            v-for="opt in groupTypeOptions"
            :key="opt.value"
            class="mb-3"
            variant="outlined"
            hover
            @click="local.type = opt.value"
          >
            <v-card-text class="d-flex align-start pa-3">
              <v-icon size="36" color="primary" class="mr-3">{{ opt.icon }}</v-icon>
              <div>
                <div class="text-body-1 font-weight-bold">{{ opt.title }}</div>
                <div class="text-caption text-grey">{{ opt.desc }}</div>
              </div>
            </v-card-text>
          </v-card>
        </template>

        <!-- ── New field: widget picker ───────────────────────────────── -->
        <template v-else-if="isNew && itemType === 'field' && !local.widget">
          <div class="text-subtitle-1 font-weight-bold mb-3">Select Field Type</div>
          <v-card
            v-for="opt in fieldTypeOptions"
            :key="opt.value"
            class="mb-3"
            variant="outlined"
            hover
            @click="local.widget = opt.value"
          >
            <v-card-text class="d-flex align-start pa-3">
              <v-icon size="36" color="primary" class="mr-3 mt-1">{{ opt.icon }}</v-icon>
              <div>
                <div class="text-body-1 font-weight-bold">{{ opt.title }}</div>
                <div class="text-caption text-grey">{{ opt.desc }}</div>
              </div>
            </v-card-text>
          </v-card>
        </template>

        <!-- ── Global profile settings ────────────────────────────────── -->
        <template v-else-if="itemType === 'global'">
          <DrawerField label="Profile name" :hint="profileHints.profile_name" required>
            <v-text-field
              v-model="local.profile_name"
              :rules="[requiredRule]"
              density="compact"
              variant="outlined"
              hide-details="auto"
            />
          </DrawerField>

          <DrawerField label="Form ID stem" :hint="profileHints.form_id_stem" required>
            <v-text-field
              v-model="local.form_id_stem"
              :rules="[requiredRule, formIdRule]"
              density="compact"
              variant="outlined"
              placeholder="alphanumeric and underscores only"
              hide-details="auto"
              class="mono-field"
            />
          </DrawerField>

          <DrawerField label="Description" :hint="profileHints.profile_description">
            <v-textarea
              v-model="local.profile_description"
              density="compact"
              variant="outlined"
              rows="3"
              hide-details
            />
          </DrawerField>

          <DrawerField label="Author" :hint="profileHints.profile_author">
            <v-text-field
              v-model="local.profile_author"
              density="compact"
              variant="outlined"
              hide-details
            />
          </DrawerField>
        </template>

        <!-- ── Group editor ───────────────────────────────────────────── -->
        <template v-else-if="itemType === 'group'">

          <DrawerSection title="Identity" first>
            <DrawerField label="Label" :hint="groupHints.label" required>
              <v-text-field
                :model-value="local.label"
                @update:model-value="onLabelUpdate"
                :rules="[requiredRule]"
                density="compact"
                variant="outlined"
                hide-details="auto"
              />
            </DrawerField>

            <DrawerField label="Name" :hint="groupHints.name" required>
              <v-text-field
                :model-value="local.name"
                @update:model-value="onNameUpdate"
                :rules="[requiredRule, snakeCaseRule]"
                density="compact"
                variant="outlined"
                hide-details="auto"
                class="mono-field"
              />
            </DrawerField>
          </DrawerSection>

          <!-- Plugin-specific group options (e.g. repeat options) -->
          <component
            v-if="activePlugin?.configComponent"
            :is="activePlugin.configComponent"
            :local="local"
            :selected-item="selectedItem"
            :hints="groupHints"
          />

          <DrawerSection title="Visibility">
            <DrawerField label="Visible when" :hint="groupHints.relevant">
              <div class="d-flex align-center ga-2 mb-1">
                <v-chip
                  :color="local.relevant ? 'primary' : undefined"
                  :variant="local.relevant ? 'tonal' : 'outlined'"
                  size="small"
                  label
                  class="flex-grow-1"
                  style="min-width: 0; overflow: hidden"
                >
                  <span style="
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-family: ui-monospace, monospace;
                    font-size: 12px;
                  ">{{ local.relevant || 'always' }}</span>
                </v-chip>
                <v-btn
                  size="small"
                  variant="tonal"
                  :color="local.relevant ? 'primary' : undefined"
                  @click="relevantDialogOpen = true"
                >
                  {{ local.relevant ? 'Edit' : 'Set condition' }}
                </v-btn>
                <v-btn
                  v-if="local.relevant"
                  icon size="x-small" variant="text" color="error"
                  title="Remove condition"
                  @click="onRelevantApply('')"
                >
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </div>
              <div class="text-body-small text-medium-emphasis" style="line-height: 1.4">
                <span v-html="relevantHumanLabel" />
              </div>
            </DrawerField>
          </DrawerSection>

        </template>

        <!-- ── Field editor ───────────────────────────────────────────── -->
        <template v-else-if="itemType === 'field'">

          <DrawerSection title="Identity" first>
            <DrawerField label="Label" :hint="fieldHints.label" required>
              <v-text-field
                :model-value="local.label"
                @update:model-value="onLabelUpdate"
                :rules="[requiredRule]"
                density="compact"
                variant="outlined"
                hide-details="auto"
              />
            </DrawerField>

            <DrawerField label="Name" :hint="fieldHints.name" required>
              <v-text-field
                :model-value="local.name"
                @update:model-value="onNameUpdate"
                :rules="[requiredRule, snakeCaseRule, noLeadingUnderscoreRule]"
                density="compact"
                variant="outlined"
                hide-details="auto"
                class="mono-field"
              />
            </DrawerField>

            <DrawerField label="Hint text" :hint="fieldHints.hint">
              <v-text-field
                v-model="local.hint"
                density="compact"
                variant="outlined"
                placeholder="Optional guidance shown below the question"
                hide-details
              />
            </DrawerField>
          </DrawerSection>

          <DrawerSection title="Behaviour">
            <DrawerField
              v-if="activePlugin?.supportsRequired && prefilledState !== 'readonly'"
              label="Required"
              :hint="fieldHints.required"
            >
              <v-switch
                v-model="local.required"
                color="primary"
                density="compact"
                hide-details
              />
            </DrawerField>

            <DrawerField label="Visible when" :hint="fieldHints.relevant">
              <div class="d-flex align-center ga-2 mb-1">
                <v-chip
                  :color="local.relevant ? 'primary' : undefined"
                  :variant="local.relevant ? 'tonal' : 'outlined'"
                  size="small"
                  label
                  class="flex-grow-1"
                  style="min-width: 0; overflow: hidden"
                >
                  <span style="
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-family: ui-monospace, monospace;
                    font-size: 12px;
                  ">{{ local.relevant || 'always' }}</span>
                </v-chip>
                <v-btn
                  size="small"
                  variant="tonal"
                  :color="local.relevant ? 'primary' : undefined"
                  @click="relevantDialogOpen = true"
                >
                  {{ local.relevant ? 'Edit' : 'Set condition' }}
                </v-btn>
                <v-btn
                  v-if="local.relevant"
                  icon size="x-small" variant="text" color="error"
                  title="Remove condition"
                  @click="onRelevantApply('')"
                >
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </div>
              <div class="text-caption text-medium-emphasis" style="line-height: 1.4">
                <span v-html="relevantHumanLabel" />
              </div>
            </DrawerField>

            <DrawerField label="Prefill" :hint="fieldHints.prefill" :max-hint-width="320">
              <v-btn-toggle
                v-model="prefilledState"
                color="primary"
                variant="outlined"
                density="compact"
                divided
                mandatory
                class="w-100"
              >
                <v-btn
                  v-for="opt in prefilledOptions"
                  :key="opt.title"
                  :value="opt.value"
                  class="flex-grow-1"
                  size="small"
                >
                  {{ opt.title }}
                </v-btn>
              </v-btn-toggle>
            </DrawerField>
          </DrawerSection>

          <!-- Plugin-specific field options -->
          <DrawerSection v-if="activePlugin?.configComponent" title="Field options">
            <component
              :is="activePlugin.configComponent"
              :local="local"
              :group-context="groupContext"
              :hints="fieldHints"
            />
          </DrawerSection>

        </template>

        <!-- ── Empty state ────────────────────────────────────────────── -->
        <template v-else>
          <div
            class="d-flex flex-column align-center justify-center text-center pa-6"
            style="height: 100%; min-height: 240px"
          >
            <v-icon size="56" color="grey-lighten-1" class="mb-4">mdi-cursor-pointer</v-icon>
            <div class="text-body-1 text-grey-darken-1 font-weight-medium mb-2">Nothing selected</div>
            <div class="text-body-2 text-grey">
              Click a field, group, or the survey profile header in the editor to
              view and edit its settings.
            </div>
          </div>
        </template>

      </div>
      <!-- /drawer-content -->

      <!-- ── Fixed footer ──────────────────────────────────────────────── -->
      <template v-if="showActionFooter">
        <v-divider />
        <div class="pa-4 flex-shrink-0 elevation-5">
          <div v-if="errors.length > 0" class="mb-3">
            <div v-for="err in errors" :key="err" class="d-flex align-start ga-1 mb-1">
              <v-icon size="14" color="error" class="flex-shrink-0" style="margin-top: 2px">mdi-alert-circle-outline</v-icon>
              <span class="text-caption text-error" style="line-height: 1.4">{{ err }}</span>
            </div>
          </div>

          <div v-if="warnings.length > 0" class="mb-3">
            <div v-for="warn in warnings" :key="warn" class="d-flex align-start ga-1 mb-1">
              <v-icon size="14" color="warning" class="flex-shrink-0" style="margin-top: 2px">mdi-alert-outline</v-icon>
              <span class="text-caption" style="color: rgb(var(--v-theme-warning)); line-height: 1.4">{{ warn }}</span>
            </div>
          </div>

          <div class="d-flex align-center ga-2">
            <v-btn color="primary" variant="tonal" :disabled="!canSave" @click="saveChanges">Save Changes</v-btn>
            <v-btn variant="tonal" @click="discardChanges">Discard</v-btn>
            <v-btn
              v-if="!isNew && (itemType === 'group' || itemType === 'field')"
              color="error" variant="tonal"
              @click="confirmDelete = true"
            >Delete</v-btn>
          </div>
        </div>
      </template>

      <!-- ── Dialogs ────────────────────────────────────────────────────── -->
      <RelevantConditionDialog
        v-model="relevantDialogOpen"
        :current-relevant="local.relevant || ''"
        :scope-fields="relevantScopeFields"
        :field-label="local.label || local.name || ''"
        :is-editable-prefill="isEditablePrefill"
        @apply="onRelevantApply"
      />

      <v-dialog v-model="confirmDelete" max-width="400">
        <v-card>
          <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
            <v-icon color="error">mdi-delete-outline</v-icon>
            Delete {{ itemType === 'group' ? 'Group' : 'Field' }}
          </v-card-title>
          <v-card-text class="px-6 pb-2">
            Are you sure you want to delete "{{ local.label || local.name }}"? This cannot be undone.
          </v-card-text>
          <v-card-actions class="px-6 pb-5">
            <v-spacer />
            <v-btn variant="text" @click="confirmDelete = false">Cancel</v-btn>
            <v-btn color="error" variant="tonal" @click="doDelete">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, reactive, computed, watch, toRaw, toRef, nextTick } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { getAllFields, getField } from '../../plugins/fields/index.js'
import { getAllGroups, getGroup } from '../../plugins/groups/index.js'
import { slugify } from '../../logic/slugify.js'
import { useDrawerValidation } from '../../composables/useDrawerValidation.js'
import { useProfileHints } from '../../composables/useProfileHints.js'
import RelevantConditionDialog from './RelevantConditionDialog.vue'
import { relevantToLabel } from '../../logic/xlsform/relevantLabel.js'
import DrawerField from './DrawerField.vue'
import DrawerSection from './DrawerSection.vue'

const props = defineProps({
  selectedItem:  { type: Object,  default: null },
  itemType:      { type: String,  default: '' },
  groupContext:  { type: Object,  default: null },
  allGroups:     { type: Array,   default: () => [] },
  isNew:         { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'close', 'delete'])

// ── Local editing copy ─────────────────────────────────────────────────
const local          = reactive({})
const confirmDelete  = ref(false)
const nameTouched    = ref(false)
const relevantDialogOpen = ref(false)

// ── Dirty tracking ─────────────────────────────────────────────────────
const isDirty       = ref(false)
const localSnapshot = ref(null) // settled baseline — captured after sub-component init
let resetting = false

function resetLocal(source) {
  resetting = true
  if (source) {
    const clone = structuredClone(toRaw(source))
    Object.assign(local, clone)
    for (const k of Object.keys(local)) {
      if (!(k in clone)) delete local[k]
    }
  } else {
    Object.keys(local).forEach((k) => delete local[k])
  }
  isDirty.value = false
  nextTick(() => {
    // Snapshot after tick so sub-component init writes (e.g. default choices)
    // are included in the baseline before the watcher starts comparing.
    localSnapshot.value = JSON.parse(JSON.stringify(toRaw(local)))
    resetting = false
  })
}

watch(() => props.selectedItem, (newVal) => {
  resetLocal(newVal)
  nameTouched.value = !!newVal && !props.isNew
}, { immediate: true })

watch(local, () => {
  if (resetting) return
  // Comparing against the snapshot means reverting a change (Ctrl+Z, manual
  // retype, toggle back) correctly clears the indicator rather than latching.
  isDirty.value = localSnapshot.value !== null
    ? JSON.stringify(toRaw(local)) !== JSON.stringify(localSnapshot.value)
    : true
}, { deep: true })

// ── Validation ─────────────────────────────────────────────────────────
const profilesStore     = useProfilesStore()
const profileFormIdStem = computed(() => profilesStore.activeProfile?.form_id_stem)

const { errors, warnings, canSave } = useDrawerValidation({
  local,
  itemType:         toRef(props, 'itemType'),
  groupContext:     toRef(props, 'groupContext'),
  selectedItem:     toRef(props, 'selectedItem'),
  isNew:            toRef(props, 'isNew'),
  allGroups:        toRef(props, 'allGroups'),
  profileFormIdStem,
})

// ── Active plugin ──────────────────────────────────────────────────────
// Single source of truth for the current item's plugin. All plugin-driven
// behaviour — icon, label, configComponent, capability flags — flows from here.
// ConfigDrawer has zero knowledge of specific widget or group type names.
const activePlugin = computed(() => {
  if (props.itemType === 'group') return getGroup(local.type)  ?? null
  if (props.itemType === 'field') return getField(local.widget) ?? null
  return null
})

const fieldHints   = computed(() => activePlugin.value?.hints ?? {})
const groupHints   = computed(() => activePlugin.value?.hints ?? {})
const profileHints = useProfileHints()

// ── Computed helpers ───────────────────────────────────────────────────
const drawerTitle = computed(() => {
  if (props.isNew && props.itemType === 'group' && !local.type)   return 'Add Group'
  if (props.isNew && props.itemType === 'field' && !local.widget) return 'Add Field'
  if (props.isNew) return `New ${props.itemType === 'group' ? 'Group' : 'Field'}`
  if (props.itemType === 'global') return 'Survey profile settings'
  if (props.itemType === 'group')  return `Group: ${local.label || local.name || ''}`
  if (props.itemType === 'field')  return `Field: ${local.label || local.name || ''}`
  return 'Details'
})

const showActionFooter = computed(() => {
  if (!props.selectedItem && !props.isNew) return false
  if (!props.isNew) return true
  if (props.itemType === 'group') return !!local.type
  if (props.itemType === 'field') return !!local.widget
  return true
})

const groupTypeOptions = computed(() =>
  getAllGroups().map((p) => ({ value: p.type, title: p.label, icon: p.icon, desc: p.description }))
)
const fieldTypeOptions = computed(() =>
  getAllFields().map((p) => ({ value: p.type, title: p.label, icon: p.icon, desc: p.description }))
)

const prefilledState = computed({
  get() { return local.prefilled || 'none' },
  set(val) {
    if (val === 'none') delete local.prefilled
    else local.prefilled = val
  },
})

const prefilledOptions = computed(() => {
  const opts = [
    { title: 'None',      value: 'none'     },
    { title: 'Read-only', value: 'readonly' },
  ]
  if (activePlugin.value?.supportsEditablePrefill)
    opts.push({ title: 'Editable', value: 'editable' })
  return opts
})

// ── Relevant / visible-when ───────────────────────────────────────────
const relevantScopeFields = computed(() => {
  const result = []
  const currentGroupName = props.groupContext ? props.groupContext.name : local.name

  for (const g of props.allGroups) {
    if (g.name === currentGroupName) {
      // Fields preceding this one in the same group are always in scope
      if (props.groupContext) {
        for (const f of g.fields || []) {
          if (f.name === local.name) break
          if (f.widget === 'label') continue
          result.push({
            name: f.name, label: f.label,
            groupName: g.name, groupLabel: g.label,
            widget: f.widget, choices: f.choices || [],
            sameGroup: true,
          })
        }
      }
      break
    }
    // Cross-group: only include fields from groups whose plugin declares it
    if (!getGroup(g.type)?.supportsRelevantAsParent) continue
    for (const f of g.fields || []) {
      if (f.widget === 'label') continue
      result.push({
        name: f.name, label: f.label,
        groupName: g.name, groupLabel: g.label,
        widget: f.widget, choices: f.choices || [],
        sameGroup: false,
      })
    }
  }
  return result
})

const relevantHumanLabel = computed(() => {
  if (!local.relevant) return 'Always shown'
  const nameMap = new Map(
    relevantScopeFields.value.map(f => [f.name, { label: f.label, groupLabel: f.groupLabel }])
  )
  return relevantToLabel(local.relevant, nameMap)
})

const isEditablePrefill = computed(() =>
  props.itemType === 'field' && local.prefilled === 'editable'
)

function onRelevantApply(xpathValue) {
  if (!xpathValue) delete local.relevant
  else local.relevant = xpathValue
}

// ── Validation rules (inline field feedback) ──────────────────────────
function requiredRule(v) { return !!v || 'Required' }
function snakeCaseRule(v) {
  if (!v) return true
  return /^[a-z][a-z0-9_]*$/.test(v) || 'Must be snake_case (lowercase, underscores, start with letter)'
}
function noLeadingUnderscoreRule(v) {
  if (!v) return true
  return !v.startsWith('_') || 'Must not start with underscore'
}
function formIdRule(v) {
  if (!v) return true
  return /^[a-zA-Z0-9_]+$/.test(v) || 'Only alphanumeric and underscores'
}

// ── Label / name coupling ──────────────────────────────────────────────
function onLabelUpdate(val) {
  local.label = val
  if (!nameTouched.value && props.isNew) local.name = slugify(val)
}
function onNameUpdate(val) {
  local.name = val
  nameTouched.value = true
}

// ── Actions ────────────────────────────────────────────────────────────
function saveChanges() {
  if (!canSave.value) return
  isDirty.value = false
  emit('save', structuredClone(toRaw(local)))
}

function discardChanges() {
  if (props.isNew) emit('close')
  else resetLocal(props.selectedItem)
}

function doDelete() {
  confirmDelete.value = false
  emit('delete')
}

// ── Exposed API ────────────────────────────────────────────────────────
defineExpose({
  get isDirty() { return isDirty.value },
  get canSave() { return canSave.value },
  triggerSave() {
    if (!canSave.value) return false
    emit('save', structuredClone(toRaw(local)))
    return true
  },
  triggerDiscard() { discardChanges() },
})
</script>

<style scoped>
.mono-field :deep(input) {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Segoe UI Mono',
    'Courier New', monospace;
  font-size: 13px;
}
.mono-field :deep(.v-field__outline) {
  opacity: 0.9;
}
:deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.drawer-flex-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.drawer-header {
  height: 48px;
  flex-shrink: 0;
}
.drawer-header-divider {
  height: 14px;
  opacity: 0.35;
  align-self: center;
}
.drawer-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>