<template>
  <div class="ml-4">
    <div class="mb-1 d-flex align-center gap-1">
      <span class="text-subtitle-2 font-weight-bold text-grey-darken-1 mr-2">Photo resolution limit</span>
      <HintIcon v-if="hints.max_pixels" :text="hints.max_pixels" />
    </div>

    <v-btn-toggle
      :model-value="selectedPreset"
      mandatory
      density="compact"
      color="primary"
      variant="outlined"
      divided
      style="width: 100%"
      class="mb-2"
      @update:model-value="setPreset"
    >
      <v-btn value="none" size="small" class="flex-grow-1">No limit</v-btn>
      <v-btn value="1024" size="small" class="flex-grow-1">
        Small
        <span class="text-caption ml-1" style="opacity: 0.55">1024px</span>
      </v-btn>
      <v-btn value="1920" size="small" class="flex-grow-1">
        HD
        <span class="text-caption ml-1" style="opacity: 0.55">1920px</span>
      </v-btn>
      <v-btn value="3840" size="small" class="flex-grow-1">
        4K
        <span class="text-caption ml-1" style="opacity: 0.55">3840px</span>
      </v-btn>
      <v-btn value="custom" size="small" class="flex-grow-1">Custom</v-btn>
    </v-btn-toggle>

    <v-text-field
      v-if="selectedPreset === 'custom'"
      v-model.number="local.max_pixels"
      label="Max pixels (longest side)"
      type="number"
      density="compact"
      variant="outlined"
      hide-details="auto"
      :rules="[customPixelRule]"
      placeholder="e.g. 1280"
      class="mt-2"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },
})

const PRESET_NUMS = [1024, 1920, 3840]

function derivePreset(v) {
  if (v === null || v === undefined) return 'none'
  const n = Number(v)
  if (PRESET_NUMS.includes(n)) return String(n)
  return 'custom'
}

const selectedPreset = ref(derivePreset(props.local.max_pixels))

// Re-sync when a different field is loaded into local (local.name changes on item switch)
watch(() => props.local.name, () => {
  selectedPreset.value = derivePreset(props.local.max_pixels)
})

function setPreset(val) {
  selectedPreset.value = val
  if (val === 'none') {
    delete props.local.max_pixels
  } else if (val === 'custom') {
    // If the current value is a preset number, clear it so the user enters their own
    if (
      props.local.max_pixels === null ||
      props.local.max_pixels === undefined ||
      PRESET_NUMS.includes(Number(props.local.max_pixels))
    ) {
      delete props.local.max_pixels
    }
  } else {
    props.local.max_pixels = Number(val)
  }
}

function customPixelRule(v) {
  if (v === null || v === undefined || v === '') return 'Enter a pixel value'
  return Number(v) >= 640 || 'Must be at least 640 pixels'
}
</script>