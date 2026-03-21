<template>
  <v-text-field
    v-model.number="local.max_pixels"
    label="Max Pixels"
    type="number"
    density="compact"
    variant="outlined"
    class="mb-3"
  >
    <template #append-inner>
      <HintIcon v-if="hints.max_pixels" :text="hints.max_pixels" />
    </template>
  </v-text-field>
</template>

<script setup>
defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },
})
</script>