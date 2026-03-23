<template>
  <div class="ml-4">
    <div class="mb-1 d-flex align-center gap-1">
      <span class="text-subtitle-2 font-weight-bold text-grey-darken-1 mr-2">Appearance</span>
      <HintIcon v-if="hints.appearance" :text="hints.appearance" />
    </div>

    <v-btn-toggle
      :model-value="appearanceState"
      color="primary"
      variant="outlined"
      density="compact"
      divided
      mandatory
      class="mb-4 w-100"
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
    <!-- The old per-state inline description div is removed. -->
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },  
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
