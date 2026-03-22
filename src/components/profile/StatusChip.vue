<template>
  <v-chip :color="color" size="x-small" variant="tonal" label :title="title">
    <v-icon :icon="icon" size="12" />
    <span v-if="label" class="ml-1" style="font-size: 10px; line-height: 1">{{ label }}</span>
  </v-chip>
</template>

<script setup>
defineProps({
  icon:  { type: String, required: true },
  label: { type: String, default: '' },
  color: { type: String, default: 'primary' },
  title: { type: String, default: '' },
})
</script>