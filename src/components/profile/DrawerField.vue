<template>
  <div class="drawer-field" :class="{ 'mb-4': !noMargin }">
    <div v-if="label" class="drawer-field__label d-flex align-center ga-1 mb-1">
      <span class="text-body-2 text-medium-emphasis font-weight-bold">{{ label }}</span>
      <span v-if="required" class="text-error text-caption" style="line-height:1">*</span>
      <HintIcon v-if="hint" :text="hint" :max-width="maxHintWidth" />
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  label:        { type: String,  default: '' },
  hint:         { type: String,  default: '' },
  required:     { type: Boolean, default: false },
  noMargin:     { type: Boolean, default: false },
  maxHintWidth: { type: Number,  default: 280 },
})
</script>

<style scoped>
.drawer-field__label {
  line-height: 1.3;
  min-height: 20px; /* stable even when no hint icon */
}
</style>