<template>
  <div class="ml-4">

    <!-- ── Appearance ─────────────────────────────────────────────────── -->
    <div class="mb-1 d-flex align-center gap-1">
      <span class="text-subtitle-2 text-grey-darken-1 font-weight-bold mr-2">Appearance</span>
      <HintIcon v-if="hints.appearance" :text="hints.appearance" />
    </div>

    <v-btn-toggle
      :model-value="appearanceMode"
      mandatory
      density="compact"
      color="primary"
      variant="outlined"
      divided
      style="width: 100%"
      class="mb-3"
      @update:model-value="setAppearanceMode"
    >
      <v-btn value="default" size="small" class="flex-grow-1">Default (dropdown)</v-btn>
      <v-btn value="custom" size="small" class="flex-grow-1">Custom</v-btn>
    </v-btn-toggle>

    <v-select
      v-if="appearanceMode === 'custom'"
      v-model="appearanceValue"
      :items="appearanceOptions"
      placeholder="Select modifiers…"
      density="compact"
      variant="outlined"
      multiple
      closable-chips
      chips
      hide-details
      class="mb-4"
    />

    <!-- ── Cascade: invalid parent alert ─────────────────────────────── -->
    <template v-if="groupContext">
      <v-alert
        v-if="local.filtered_by && !isFilteredByValid"
        type="error"
        density="compact"
        variant="tonal"
        class="mb-3"
      >
        The referenced parent field "<strong>{{ local.filtered_by }}</strong>"
        no longer exists as a preceding cascadable field in this group. Clear
        it or choose a valid field.
      </v-alert>
    </template>

    <!-- ── Choices summary + Edit button ─────────────────────────────── -->
    <div class="d-flex align-center justify-space-between mb-1">
      <div class="d-flex align-center gap-1">
        <span class="text-subtitle-2 text-grey-darken-1 font-weight-bold mr-2">Choices</span>
        <HintIcon v-if="hints.choices" :text="hints.choices" />
      </div>
      <div class="d-flex align-center gap-2">
        <v-chip
          v-if="local.choices?.length > 0"
          size="small"
          color="primary"
          label
          variant="tonal"
        >{{ local.choices.length }}</v-chip>
        <v-chip
          v-if="local.choices?.length === 0 || !local.choices"
          size="small"
          color="error"
          label
          variant="tonal"
        >None</v-chip>
        <v-btn
          size="small"
          variant="tonal"
          class="ml-2"
          :color="hasChoiceError ? 'error' : 'primary'"
          prepend-icon="mdi-pencil-outline"
          @click="openDialog"
        >
          Edit
          <v-icon v-if="hasChoiceError" end size="12">mdi-alert</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Compact read-only choice list -->
    <v-card
      variant="outlined"
      class="rounded-lg mb-1"
      :style="choiceListStyle"
      style="overflow: hidden"
    >
      <template v-if="local.choices?.length > 0">
        <v-list density="compact" class="py-0">
          <template v-for="(choice, i) in local.choices" :key="i">
            <v-divider v-if="i > 0" />
            <v-list-item class="px-3" style="min-height: 32px">
              <div class="d-flex align-center gap-2 w-100" style="min-width: 0">
                <span
                  class="text-body-2 font-weight-medium flex-grow-1"
                  style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                >{{ choice.label || '(no label)' }}</span>
                <v-icon
                  v-if="isChoiceLocked(choice.value)"
                  size="12"
                  color="warning"
                  class="flex-shrink-0"
                  title="Key locked — used by a child cascade filter"
                >mdi-lock</v-icon>
                <span
                  class="text-caption text-medium-emphasis flex-shrink-0"
                  style="font-family: monospace; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                >{{ choice.value || '(no key)' }}</span>
              </div>
            </v-list-item>
          </template>
        </v-list>
      </template>

      <div
        v-else
        class="d-flex flex-column align-center justify-center pa-4 text-center"
        style="min-height: 72px"
      >
        <v-icon size="20" color="error" class="mb-1">mdi-alert-circle-outline</v-icon>
        <span class="text-caption text-medium-emphasis">No choices defined. Click Edit to add them.</span>
      </div>
    </v-card>

    <!-- Inline choice error hints -->
    <div v-if="hasDuplicateValues" class="d-flex align-center gap-1 mb-1">
      <v-icon size="13" color="error">mdi-alert-circle</v-icon>
      <span class="text-caption text-error">Duplicate choice keys — click Edit to fix.</span>
    </div>
    <div v-if="hasBlankValues" class="d-flex align-center gap-1 mb-1">
      <v-icon size="13" color="error">mdi-alert-circle</v-icon>
      <span class="text-caption text-error">Some choices have blank keys — click Edit to fix.</span>
    </div>

    <!-- ── Cascade filter ─────────────────────────────────────────────── -->
    <div class="mb-1 mt-4 d-flex align-center gap-1">
      <span class="text-subtitle-2 text-grey-darken-1 mr-2 font-weight-bold">Cascade filter</span>
      <HintIcon v-if="hints.filtered_by" :text="hints.filtered_by" />
    </div>

    <v-btn-toggle
      :model-value="filterMode"
      mandatory
      density="compact"
      color="primary"
      variant="outlined"
      divided
      style="width: 100%"
      class="mb-2"
      @update:model-value="setFilterMode"
    >
      <v-btn value="none" size="small" class="flex-grow-1">None</v-btn>
      <v-btn
        value="filtered"
        size="small"
        class="flex-grow-1"
        :disabled="availableParentSelectFields.length === 0"
        :title="availableParentSelectFields.length === 0
          ? 'No cascadable fields precede this one in the group'
          : undefined"
      >
        Filtered by parent
      </v-btn>
    </v-btn-toggle>

    <v-select
      v-if="filterMode === 'filtered'"
      v-model="local.filtered_by"
      :items="availableParentSelectFields"
      label="Parent field"
      density="compact"
      variant="outlined"
      clearable
      hide-details
      class="mb-2"
    />

    <!-- ── Choice editor dialog ───────────────────────────────────────── -->
    <v-dialog v-model="dialogOpen" :max-width="dialogMaxWidth" scrollable>
      <v-card>
        <div class="d-flex align-center gap-2 px-5 pt-4 pb-3">
          <v-icon size="18" color="primary" class="flex-shrink-0">
            {{ local.widget === 'select_multiple' ? 'mdi-checkbox-multiple-marked' : 'mdi-radiobox-marked' }}
          </v-icon>
          <span
            class="text-subtitle-2 font-weight-bold flex-grow-1"
            style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
          >{{ local.label || local.name || 'Choices' }}</span>
          <v-chip size="x-small" label variant="tonal" color="primary" class="flex-shrink-0">
            {{ local.widget === 'select_multiple' ? 'Multiple' : 'Single' }}
          </v-chip>
          <v-chip
            size="x-small"
            label
            variant="tonal"
            :color="local.choices?.length ? 'primary' : 'error'"
            class="flex-shrink-0 ml-2 mr-2"
          >{{ local.choices?.length ?? 0 }} choice(s)</v-chip>
          <v-btn icon variant="text" size="small" density="compact" @click="dialogOpen = false">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-divider />

        <v-card-text class="pa-5">
          <ChoiceBuilder
            v-model="local.choices"
            :dependent-child-names="childFieldNames"
            :locked-choice-values="lockedChoiceValues"
            :parent-choices="parentFieldChoices"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-5 py-3">
          <span class="text-caption text-medium-emphasis">
            Changes are staged — click <strong>Save Changes</strong> in the drawer to commit.
          </span>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="dialogOpen = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getField } from '../../../plugins/fields/index.js'
import ChoiceBuilder from './ChoiceBuilder.vue'

const props = defineProps({
  local:        { type: Object, required: true },
  groupContext: { type: Object, default: null  },
  hints:        { type: Object, default: () => ({}) },
})

const dialogOpen = ref(false)
function openDialog() { dialogOpen.value = true }

const dialogMaxWidth = computed(() =>
  parentFieldChoices.value.length > 0 ? 860 : 700
)

// ── Appearance ──────────────────────────────────────────────────────────
// "Minimal" is the unconditional default (and the XLSForm fallback when no
// appearance is set), so it is not offered as a selectable modifier —
// choosing "Default (dropdown)" and leaving the multi-select empty is
// equivalent. Any legacy profile that stored appearance: "minimal" will
// be silently normalised to unset on next save.
const appearanceOptions = [
  { title: 'Autocomplete',    value: 'autocomplete'  },
  { title: 'Columns',         value: 'columns'       },
  { title: 'Columns (packed)',value: 'columns-pack'  },
  { title: 'Quick',           value: 'quick'         },
  { title: 'Likert',          value: 'likert'        },
]

// Separate ref so the toggle can sit in 'custom' mode even before the user
// has picked any modifier (avoids the toggle snapping back to 'default').
const isCustomAppearance = ref(
  !!(props.local.appearance && props.local.appearance.replace('minimal', '').trim())
)

watch(() => props.local.name, () => {
  isCustomAppearance.value =
    !!(props.local.appearance && props.local.appearance.replace('minimal', '').trim())
})

const appearanceMode = computed(() => isCustomAppearance.value ? 'custom' : 'default')

function setAppearanceMode(val) {
  isCustomAppearance.value = val === 'custom'
  if (val === 'default') delete props.local.appearance
}

const appearanceValue = computed({
  get() {
    if (!props.local.appearance) return []
    // Filter out 'minimal' — it is the default, not a real modifier
    return props.local.appearance.split(' ').filter(v => v && v !== 'minimal')
  },
  set(val) {
    const filtered = (val || []).filter(v => v !== 'minimal')
    if (filtered.length === 0) delete props.local.appearance
    else props.local.appearance = filtered.join(' ')
  },
})

// ── Cascade filter ──────────────────────────────────────────────────────
// Separate ref so the toggle stays on 'filtered' while the user is
// selecting a parent field (before local.filtered_by is set).
const isFilteredMode = ref(!!props.local.filtered_by)

watch(() => props.local.name, () => {
  isFilteredMode.value = !!props.local.filtered_by
})

const filterMode = computed(() => isFilteredMode.value ? 'filtered' : 'none')

function setFilterMode(val) {
  isFilteredMode.value = val === 'filtered'
  if (val === 'none') delete props.local.filtered_by
}

const availableParentSelectFields = computed(() => {
  if (!props.groupContext) return []
  const result = []
  for (const f of props.groupContext.fields || []) {
    if (f.name === props.local.name) break
    if (getField(f.widget)?.isCascadable) result.push(f.name)
  }
  return result
})

const isFilteredByValid = computed(() => {
  if (!props.local.filtered_by) return true
  return availableParentSelectFields.value.includes(props.local.filtered_by)
})

// ── Cascade helpers ─────────────────────────────────────────────────────
const childFieldNames = computed(() =>
  (props.groupContext?.fields || [])
    .filter(f => f.filtered_by === props.local.name)
    .map(f => f.name)
)

const lockedChoiceValues = computed(() => {
  const childFields = (props.groupContext?.fields || []).filter(
    f => f.filtered_by === props.local.name
  )
  const usedValues = new Set()
  for (const child of childFields) {
    for (const choice of child.choices || []) {
      if (choice.filter_value) usedValues.add(choice.filter_value)
    }
  }
  return [...usedValues]
})

const parentFieldChoices = computed(() => {
  if (!props.local.filtered_by || !props.groupContext) return []
  const parent = (props.groupContext.fields || []).find(
    f => f.name === props.local.filtered_by
  )
  return parent?.choices || []
})

function isChoiceLocked(value) {
  return lockedChoiceValues.value.includes(value)
}

// ── Choice summary helpers ──────────────────────────────────────────────
const hasDuplicateValues = computed(() => {
  const vals = (props.local.choices || []).map(c => c.value).filter(Boolean)
  return vals.length !== new Set(vals).size
})

const hasBlankValues = computed(() =>
  (props.local.choices || []).some(c => !c.value || c.value.trim() === '')
)

const hasChoiceError = computed(() =>
  !props.local.choices?.length || hasDuplicateValues.value || hasBlankValues.value
)

const choiceListStyle = computed(() =>
  (props.local.choices?.length ?? 0) > 6
    ? { maxHeight: '200px', overflowY: 'auto' }
    : {}
)
</script>