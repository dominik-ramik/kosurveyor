<template>
  <div class="choice-builder">

    <!-- ── Column headers ──────────────────────────────────────── -->
    <div class="cb-row cb-header" :class="{ 'cb-row--with-filter': hasParentChoices }">
      <span />
      <span>Label</span>
      <span class="d-flex align-center gap-1">
        Value (key)
        <!-- Inline lock indicator — replaces full-width banner -->
        <v-tooltip v-if="dependentChildNames.length > 0" location="top" max-width="260">
          <template #activator="{ props: tp }">
            <v-icon v-bind="tp" size="13" color="warning">mdi-lock-outline</v-icon>
          </template>
          Keys locked —
          <span v-for="(n, i) in dependentChildNames" :key="n"
            ><code>{{ n }}</code><span v-if="i < dependentChildNames.length - 1">, </span></span
          > filter by this field. Remove their "Filtered By" setting to unlock.
        </v-tooltip>
      </span>
      <span v-if="hasParentChoices" class="d-flex align-center gap-1 pr-2">
        Show when parent =
        <v-tooltip text="Leave blank to always show this choice regardless of parent selection." location="top" max-width="260">
          <template #activator="{ props: tp }">
            <v-icon v-bind="tp" size="14" color="primary" style="cursor: pointer">mdi-help-circle-outline</v-icon>
          </template>
        </v-tooltip>
      </span>
    </div>

    <!-- Filter column context hint moved into header tooltip -->

    <!-- ── Choice rows ────────────────────────────────────────── -->
    <div
      v-for="(choice, index) in modelValue"
      :key="index"
      class="cb-row"
      :class="{
        'cb-row--with-filter':     hasParentChoices,
        'cb-row--dragging':        dragFromIndex === index,
        'cb-row--drag-over-above': dragOverIndex === index && dragFromIndex > index,
        'cb-row--drag-over-below': dragOverIndex === index && dragFromIndex < index,
      }"
      @dragover.prevent="dragOverIndex = index"
      @dragleave="dragOverIndex = null"
      @drop.prevent="onRowDrop(index)"
    >
      <!-- Drag handle — only this element is draggable -->
      <div
        class="cb-handle"
        draggable="true"
        @dragstart="onRowDragStart(index, $event)"
        @dragend="onRowDragEnd"
      >
        <v-icon size="16" color="grey" class="drag-icon">mdi-drag-vertical</v-icon>
      </div>

      <!-- Label -->
      <div class="cb-cell">
        <v-text-field
          v-model="choice.label"
          density="compact"
          variant="outlined"
          hide-details
          placeholder="Label"
          @update:model-value="(val) => onChoiceLabelUpdate(index, val)"
        />
      </div>

      <!-- Value (key) -->
      <div class="cb-cell">
        <v-text-field
          :model-value="choice.value"
          density="compact"
          variant="outlined"
          hide-details
          placeholder="key"
          :readonly="isChoiceLocked(choice.value)"
          :class="{
            'key-field--locked': isChoiceLocked(choice.value),
            'key-field--error':  !isChoiceLocked(choice.value) && keyHasError(choice.value, index),
          }"
          class="key-field"
          @click="isChoiceLocked(choice.value) ? showLockDialog() : undefined"
          @update:model-value="(val) => onKeyUpdate(index, val)"
        >
          <!-- Single unified append-inner slot with priority ordering -->
          <template #append-inner>
            <v-tooltip
              v-if="isChoiceLocked(choice.value)"
              text="Key locked — a child field filters by this value"
              location="top"
              max-width="200"
            >
              <template #activator="{ props: tp }">
                <v-icon v-bind="tp" size="13" color="warning" style="cursor: pointer">mdi-lock</v-icon>
              </template>
            </v-tooltip>
            <v-tooltip
              v-else-if="keyHasSpaces(choice.value)"
              text="Keys must not contain spaces"
              location="top"
            >
              <template #activator="{ props: tp }">
                <v-icon v-bind="tp" size="13" color="error">mdi-alert-circle</v-icon>
              </template>
            </v-tooltip>
            <v-tooltip
              v-else-if="keyIsDuplicate(choice.value, index)"
              text="Duplicate key — each choice must be unique"
              location="top"
            >
              <template #activator="{ props: tp }">
                <v-icon v-bind="tp" size="13" color="error">mdi-alert-circle</v-icon>
              </template>
            </v-tooltip>
            <span
              v-else-if="!valueTouchedIndices.has(index) && choice.value"
              class="auto-badge"
            >auto</span>
          </template>
        </v-text-field>
      </div>

      <!-- Filter: show when parent = -->
      <div v-if="hasParentChoices" class="cb-cell">
        <v-select
          :model-value="choice.filter_value ?? null"
          :items="parentChoiceItems"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          placeholder="(always)"
          @update:model-value="(val) => {
            choice.filter_value = val ?? ''
            emitUpdate()
          }"
        />
      </div>

      <!-- Delete -->
      <div class="cb-delete">
        <v-btn
          v-if="!isChoiceLocked(choice.value)"
          icon
          size="x-small"
          variant="text"
          color="grey"
          @click="removeChoice(index)"
        >
          <v-icon size="16">mdi-close</v-icon>
        </v-btn>
        <!-- locked rows show nothing in delete column — lock is in key append-inner -->
      </div>
    </div>

    <!-- ── Empty state ─────────────────────────────────────────── -->
    <div v-if="!modelValue.length" class="cb-empty text-caption text-medium-emphasis">
      No choices yet — click Add Choice to start.
    </div>

    <!-- ── Add button ─────────────────────────────────────────── -->
    <v-btn
      variant="tonal"
      size="small"
      prepend-icon="mdi-plus"
      class="mt-3"
      @click="addChoice"
    >
      Add Choice
    </v-btn>

    <!-- ── Lock dialog ─────────────────────────────────────────── -->
    <v-dialog v-model="lockDialogVisible" max-width="440">
      <v-card>
        <v-card-title class="d-flex align-center gap-2 pt-5 px-5 text-h6">
          <v-icon color="warning">mdi-lock</v-icon>
          Choice Keys Locked
        </v-card-title>
        <v-card-text class="px-5 pb-2">
          <p class="text-body-2 mb-3">
            These keys cannot be edited because
            {{ dependentChildNames.length === 1 ? 'a child field filters' : 'child fields filter' }}
            by this field:
          </p>
          <v-chip-group>
            <v-chip
              v-for="name in dependentChildNames"
              :key="name"
              color="warning"
              size="small"
              variant="tonal"
            >{{ name }}</v-chip>
          </v-chip-group>
          <p class="text-body-2 mt-3">
            Remove the <strong>Filtered By</strong> setting from
            {{ dependentChildNames.length === 1 ? 'that field' : 'those fields' }}
            first, then edit the keys here.
          </p>
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn color="primary" variant="tonal" @click="lockDialogVisible = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { slugify } from '../../../logic/slugify.js'

const props = defineProps({
  modelValue:           { type: Array, default: () => [] },
  dependentChildNames:  { type: Array, default: () => [] },
  lockedChoiceValues:   { type: Array, default: () => [] },
  parentChoices:        { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const lockDialogVisible   = ref(false)
const valueTouchedIndices = reactive(new Set())

// ── Drag ───────────────────────────────────────────────────────────────
const dragFromIndex = ref(null)
const dragOverIndex = ref(null)

function onRowDragStart(index, event) {
  dragFromIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(index))
}

function onRowDrop(toIndex) {
  const fromIndex = dragFromIndex.value
  dragFromIndex.value = null
  dragOverIndex.value = null
  if (fromIndex === null || fromIndex === toIndex) return
  reorderChoices(fromIndex, toIndex)
}

function onRowDragEnd() {
  dragFromIndex.value = null
  dragOverIndex.value = null
}

function reorderChoices(from, to) {
  const updated = props.modelValue.map(cloneChoice)
  const [moved] = updated.splice(from, 1)
  updated.splice(to, 0, moved)

  const newTouched = new Set()
  for (const i of valueTouchedIndices) {
    if (i === from) {
      newTouched.add(to)
    } else if (i > Math.min(from, to) && i <= Math.max(from, to)) {
      newTouched.add(from < to ? i - 1 : i + 1)
    } else {
      newTouched.add(i)
    }
  }
  valueTouchedIndices.clear()
  for (const i of newTouched) valueTouchedIndices.add(i)

  emit('update:modelValue', updated)
}

// ── Choices ────────────────────────────────────────────────────────────
const hasParentChoices = computed(() => props.parentChoices.length > 0)

function isChoiceLocked(value) {
  return props.lockedChoiceValues.includes(value)
}

const parentChoiceItems = computed(() =>
  props.parentChoices.map((c) => ({
    title: c.label ? `${c.value} — ${c.label}` : c.value,
    value: c.value,
  })),
)

function showLockDialog() {
  lockDialogVisible.value = true
}

function addChoice() {
  emit('update:modelValue', [
    ...props.modelValue.map(cloneChoice),
    { value: '', label: '', filter_value: '' },
  ])
}

function removeChoice(index) {
  const newTouched = new Set()
  for (const i of valueTouchedIndices) {
    if (i < index)      newTouched.add(i)
    else if (i > index) newTouched.add(i - 1)
  }
  valueTouchedIndices.clear()
  for (const i of newTouched) valueTouchedIndices.add(i)

  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index).map(cloneChoice),
  )
}

function onChoiceLabelUpdate(index, val) {
  if (!valueTouchedIndices.has(index)) {
    props.modelValue[index].value = slugify(val)
  }
  emitUpdate()
}

function onKeyUpdate(index, val) {
  valueTouchedIndices.add(index)
  props.modelValue[index].value = val
  emitUpdate()
}

function emitUpdate() {
  emit('update:modelValue', props.modelValue.map(cloneChoice))
}

function cloneChoice(c) {
  return { value: c.value, label: c.label, filter_value: c.filter_value ?? '' }
}

// ── Per-key validation ─────────────────────────────────────────────────
function keyHasSpaces(value) {
  return !!value && /\s/.test(value)
}

function keyIsDuplicate(value, index) {
  if (!value) return false
  return props.modelValue.some((c, i) => i !== index && c.value === value)
}

function keyHasError(value, index) {
  return keyHasSpaces(value) || keyIsDuplicate(value, index)
}
</script>

<style scoped>
/* ── Grid ───────────────────────────────────────────────────────── */
/*
  No filter: handle(24) | label(1fr) | key(176px) | delete(28px)
  With filter: handle(24) | label(1fr) | key(148px) | filter(152px) | delete(28px)

  The 1fr label column takes all remaining space in both layouts.
  Key and filter columns are fixed — no fighting with text field min-widths.
*/
.cb-row {
  display: grid;
  grid-template-columns: 24px 1fr 176px 28px;
  align-items: center;
  column-gap: 8px;
  padding: 3px 0;
}

.cb-row--with-filter {
  grid-template-columns: 24px 1fr 148px 152px 28px;
}

/* Header row */
.cb-header {
  padding-bottom: 6px;
  margin-bottom: 2px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.cb-header span {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

/* Context hint below header when filter column is active */
.cb-filter-hint {
  padding: 3px 0 6px 32px; /* 32px = handle + gap */
  margin-top: -2px;
  line-height: 1.3;
}

/* ── Drag handle ────────────────────────────────────────────────── */
.cb-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  height: 100%;
}

.drag-icon {
  opacity: 0.3;
  transition: opacity 0.15s;
}

.cb-row:hover .drag-icon {
  opacity: 0.75;
}

/* ── Cells ──────────────────────────────────────────────────────── */
.cb-cell {
  min-width: 0; /* let grid cells shrink below content min-width */
}

.cb-delete {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Drag states ────────────────────────────────────────────────── */
.cb-row--dragging {
  opacity: 0.35;
}

.cb-row--drag-over-above {
  box-shadow: 0 -2px 0 0 rgb(var(--v-theme-primary));
}

.cb-row--drag-over-below {
  box-shadow: 0 2px 0 0 rgb(var(--v-theme-primary));
}

/* ── Key field ──────────────────────────────────────────────────── */
.key-field :deep(input) {
  font-family: monospace;
  font-size: 13px;
}

.key-field--locked :deep(input) {
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.key-field--locked :deep(.v-field__outline) {
  opacity: 0.45;
}

.key-field--error :deep(.v-field__outline__start),
.key-field--error :deep(.v-field__outline__notch),
.key-field--error :deep(.v-field__outline__end) {
  border-color: rgb(var(--v-theme-error)) !important;
}

/* ── Auto badge ─────────────────────────────────────────────────── */
.auto-badge {
  font-size: 10px;
  font-weight: 600;
  font-family: sans-serif;
  color: rgba(var(--v-theme-primary), 0.75);
  background: rgba(var(--v-theme-primary), 0.09);
  border-radius: 3px;
  padding: 1px 5px;
  letter-spacing: 0.03em;
  pointer-events: none;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Empty state ────────────────────────────────────────────────── */
.cb-empty {
  padding: 16px 0 8px 32px;
}
</style>