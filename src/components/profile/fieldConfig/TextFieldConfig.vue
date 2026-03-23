<template>
  <div class="ml-4">
    <div class="mb-1 d-flex align-center gap-1">
      <span class="text-subtitle-2 font-weight-bold text-grey-darken-1 mr-2"
        >Appearance</span
      >
      <HintIcon v-if="hints.appearance" :text="hints.appearance" />
    </div>

    <v-btn-toggle
      v-model="appearanceState"
      color="primary"
      variant="outlined"
      density="compact"
      divided
      mandatory
      class="mb-3 w-100"
    >
      <v-btn value="single" size="small" class="flex-grow-1">Single-line</v-btn>
      <v-btn value="multiline" size="small" class="flex-grow-1"
        >Multiline</v-btn
      >
    </v-btn-toggle>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },
});

const appearanceState = computed({
  get() {
    return props.local.appearance === "multiline" ? "multiline" : "single";
  },
  set(val) {
    if (val === "single") {
      delete props.local.appearance;
    } else {
      props.local.appearance = "multiline";
    }
  },
});
</script>
