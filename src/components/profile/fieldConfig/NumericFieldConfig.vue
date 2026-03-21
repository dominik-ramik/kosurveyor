<template>
  <div>
   <div class="mb-1 d-flex align-center gap-1">
  <span class="text-subtitle-2 text-grey-darken-1">Value Constraints</span>
  <HintIcon v-if="hints.constraints" :text="hints.constraints" />
</div>

    <div class="d-flex gap-3 mb-1">
      <v-text-field
        :model-value="minDisplay"
        label="Minimum"
        type="number"
        :step="isInteger ? 1 : 'any'"
        density="compact"
        variant="outlined"
        clearable
        hide-details="auto"
        :error-messages="rangeError ? [rangeError] : []"
        class="flex-grow-1 mr-2"
        @update:model-value="onMinUpdate"
        @click:clear="clearMin"
      />
      <v-text-field
        :model-value="maxDisplay"
        label="Maximum"
        type="number"
        :step="isInteger ? 1 : 'any'"
        density="compact"
        variant="outlined"
        clearable
        hide-details="auto"
        :error-messages="rangeError ? [''] : []"
        class="flex-grow-1"
        @update:model-value="onMaxUpdate"
        @click:clear="clearMax"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },
})

const isInteger = computed(() => props.local.widget === 'integer')

// ── Display helpers ────────────────────────────────────────────────────
// Use empty string for "not set" so the input stays blank, not "undefined"
const minDisplay = computed(() =>
  props.local.min_value !== undefined && props.local.min_value !== null
    ? String(props.local.min_value)
    : ''
)
const maxDisplay = computed(() =>
  props.local.max_value !== undefined && props.local.max_value !== null
    ? String(props.local.max_value)
    : ''
)

// ── Validation ─────────────────────────────────────────────────────────
const rangeError = computed(() => {
  const hasMin = props.local.min_value !== undefined && props.local.min_value !== null
  const hasMax = props.local.max_value !== undefined && props.local.max_value !== null
  if (hasMin && hasMax && Number(props.local.min_value) >= Number(props.local.max_value)) {
    return 'Minimum must be less than maximum'
  }
  return ''
})

// ── XLSForm constraint preview ─────────────────────────────────────────
const constraintPreview = computed(() => buildConstraint(props.local))

// ── Handlers ───────────────────────────────────────────────────────────
function onMinUpdate(val) {
  if (val === '' || val === null || val === undefined) {
    delete props.local.min_value
  } else {
    props.local.min_value = isInteger.value ? parseInt(val, 10) : parseFloat(val)
  }
}

function onMaxUpdate(val) {
  if (val === '' || val === null || val === undefined) {
    delete props.local.max_value
  } else {
    props.local.max_value = isInteger.value ? parseInt(val, 10) : parseFloat(val)
  }
}

function clearMin() {
  delete props.local.min_value
}

function clearMax() {
  delete props.local.max_value
}
</script>

<script>
/**
 * Builds the XLSForm constraint expression for a numeric field.
 * Exported as a named function so integer.js / decimal.js can import
 * and call it directly during survey row generation.
 *
 * @param {{ min_value?: number, max_value?: number }} field
 * @returns {string | undefined}  e.g. ". >= 0 and . <= 100", or undefined if no constraints
 */
export function buildConstraint(field) {
  const parts = []
  if (field.min_value !== undefined && field.min_value !== null && field.min_value !== '') {
    parts.push(`. >= ${field.min_value}`)
  }
  if (field.max_value !== undefined && field.max_value !== null && field.max_value !== '') {
    parts.push(`. <= ${field.max_value}`)
  }
  return parts.length ? parts.join(' and ') : undefined
}

/**
 * Builds a human-readable constraint_message for the same field.
 *
 * @param {{ min_value?: number, max_value?: number }} field
 * @returns {string | undefined}
 */
export function buildConstraintMessage(field) {
  const hasMin = field.min_value !== undefined && field.min_value !== null && field.min_value !== ''
  const hasMax = field.max_value !== undefined && field.max_value !== null && field.max_value !== ''
  if (hasMin && hasMax)  return `Value must be between ${field.min_value} and ${field.max_value}.`
  if (hasMin)            return `Value must be at least ${field.min_value}.`
  if (hasMax)            return `Value must be at most ${field.max_value}.`
  return undefined
}
</script>