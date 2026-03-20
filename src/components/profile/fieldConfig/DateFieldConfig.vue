<template>
  <div>
    <div class="mb-1 text-subtitle-2 text-grey-darken-1">Appearance</div>

    <v-btn-toggle
      :model-value="appearanceState"
      color="primary"
      variant="outlined"
      density="compact"
      divided
      mandatory
      class="mb-2 w-100"
      @update:model-value="onAppearanceUpdate"
    >
      <v-btn
        v-for="opt in appearanceOptions"
        :key="opt.value"
        :value="opt.value"
        class="flex-grow-1"
        size="small"
      >
        {{ opt.title }}
      </v-btn>
    </v-btn-toggle>

    <div class="text-caption text-grey-darken-1 mb-4" style="line-height: 1.3">
      <span v-if="appearanceState === 'none'">
        <strong>Normal:</strong> Standard date picker — day, month and year.
      </span>
      <span v-else-if="appearanceState === 'month-year'">
        <strong>Month &amp; Year:</strong> Picker restricted to month and year only.
        Outputs <code>month-year</code> in the XLSForm appearance column.
      </span>
      <span v-else-if="appearanceState === 'year'">
        <strong>Year:</strong> Picker restricted to year only.
        Outputs <code>year</code> in the XLSForm appearance column.
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** The reactive `local` object from ConfigDrawer — mutated directly. */
  local: { type: Object, required: true },
})

const appearanceOptions = [
  { title: 'Normal',       value: 'none'       },
  { title: 'Month & Year', value: 'month-year' },
  { title: 'Year',         value: 'year'       },
]

// Map undefined/null/'' → 'none' for the toggle; preserve actual values as-is.
const appearanceState = computed(() =>
  props.local.appearance || 'none'
)

function onAppearanceUpdate(val) {
  if (!val || val === 'none') {
    delete props.local.appearance   // default → no key saved in profile
  } else {
    props.local.appearance = val    // 'month-year' | 'year'
  }
}
</script>
