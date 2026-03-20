<template>
  <v-text-field
    v-model.number="local.max_pixels"
    label="Max Pixels"
    type="number"
    density="compact"
    variant="outlined"
    class="mb-3"
  />
</template>

<script setup>
defineProps({
  local: { type: Object, required: true },
})
</script>
