<template>
    <div class="ml-4">
   <div class="mb-1 d-flex align-center gap-1">
  <span class="text-subtitle-2 font-weight-bold text-grey-darken-1 mr-2">Longest side maximum resolution</span>
  <HintIcon v-if="hints.max_pixels" :text="hints.max_pixels" />
</div>
  <v-text-field
    v-model.number="local.max_pixels"
    label="Pixels"
    type="number"
    density="compact"
    variant="outlined"
    class="mb-3"
  >
  </v-text-field>
  </div>
</template>

<script setup>
defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },
})
</script>