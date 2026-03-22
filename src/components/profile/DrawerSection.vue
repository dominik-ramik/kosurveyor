<template>
  <div class="drawer-section">
    <v-divider v-if="!first" />
    <div class="drawer-section__title pt-4 pb-2">
      <span
        class="text-caption font-weight-bold text-medium-emphasis"
        style="text-transform: uppercase; letter-spacing: 0.07em"
      >{{ title }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String,  default: '' },
  /** Suppress the top divider — use on the first section after the type badge. */
  first: { type: Boolean, default: false },
})
</script>