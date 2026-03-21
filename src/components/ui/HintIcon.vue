<template>
  <v-tooltip :text="text" location="top" :max-width="maxWidth">
    <template #activator="{ props: tp }">
      <v-icon
        v-bind="tp"
        :size="size"
        color="medium-emphasis"
        style="cursor: pointer; opacity: 0.55; flex-shrink: 0"
      >mdi-information-outline</v-icon>
    </template>
  </v-tooltip>
</template>

<script setup>
defineProps({
  text:     { type: String, required: true },
  size:     { type: [String, Number], default: 15 },
  maxWidth: { type: [String, Number], default: 280 },
})
</script>