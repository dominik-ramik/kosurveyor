<template>
  <div class="ml-4">
    <div class="mb-2 d-flex align-center gap-1">
      <span class="text-subtitle-2 font-weight-bold text-grey-darken-1 mr-2">Value constraints</span>
      <HintIcon v-if="hints.constraints" :text="hints.constraints" />
    </div>

    <div class="d-flex align-center ga-3 mb-4">
      <v-switch
        :model-value="useMin"
        color="primary"
        density="compact"
        hide-details
        label="Minimum"
        class="flex-shrink-0"
        @update:model-value="toggleMin"
      />
      <v-text-field
        v-if="useMin"
        :model-value="minDisplay"
        label="Value"
        type="number"
        :step="isInteger ? 1 : 'any'"
        density="compact"
        variant="outlined"
        clearable
        hide-details="auto"
        :error-messages="rangeError ? [rangeError] : []"
        class="flex-grow-1"
        @update:model-value="onMinUpdate"
        @click:clear="clearMin"
      />
    </div>

    <div class="d-flex align-center ga-3 mb-1">
      <v-switch
        :model-value="useMax"
        color="primary"
        density="compact"
        hide-details
        label="Maximum"
        class="flex-shrink-0"
        @update:model-value="toggleMax"
      />
      <v-text-field
        v-if="useMax"
        :model-value="maxDisplay"
        label="Value"
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
import { ref, computed, watch } from 'vue'

const props = defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },
})

const isInteger = computed(() => props.local.widget === 'integer')

function hasValue(v) {
  return v !== undefined && v !== null && v !== ''
}

const useMin = ref(hasValue(props.local.min_value))
const useMax = ref(hasValue(props.local.max_value))

// Re-sync when a different field is loaded into local
watch(() => props.local.name, () => {
  useMin.value = hasValue(props.local.min_value)
  useMax.value = hasValue(props.local.max_value)
})

function toggleMin(val) {
  useMin.value = val
  if (!val) delete props.local.min_value
}

function toggleMax(val) {
  useMax.value = val
  if (!val) delete props.local.max_value
}

const minDisplay = computed(() =>
  hasValue(props.local.min_value) ? String(props.local.min_value) : ''
)
const maxDisplay = computed(() =>
  hasValue(props.local.max_value) ? String(props.local.max_value) : ''
)

const rangeError = computed(() => {
  if (hasValue(props.local.min_value) && hasValue(props.local.max_value)) {
    if (Number(props.local.min_value) >= Number(props.local.max_value)) {
      return 'Minimum must be less than maximum'
    }
  }
  return ''
})

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

function clearMin() { delete props.local.min_value }
function clearMax() { delete props.local.max_value }
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
  if (hasMin && hasMax) return `Value must be between ${field.min_value} and ${field.max_value}.`
  if (hasMin)           return `Value must be at least ${field.min_value}.`
  if (hasMax)           return `Value must be at most ${field.max_value}.`
  return undefined
}
</script>