<template>
  <div class="ml-4">
    <div class="mb-1 d-flex align-center gap-1">
      <span class="text-subtitle-2 font-weight-bold text-grey-darken-1 mr-2"
        >Photo resolution limit</span
      >
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
      <v-btn
        v-for="p in PRESETS"
        :key="p.value"
        :value="p.value"
        size="small"
        class="flex-grow-1"
      >
        {{ p.label }}
        <span class="text-caption ml-1" style="opacity: 0.55">{{ p.px }}px</span>
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
import { ref, watch } from "vue";

const props = defineProps({
  local: { type: Object, required: true },
  hints: { type: Object, default: () => ({}) },
});

const PRESETS = [
  { value: "1024", label: "Small", px: 1024 },
  { value: "1920", label: "HD", px: 1920 },
  { value: "3840", label: "4K", px: 3840 },
];
const PRESET_NUMS = PRESETS.map((p) => p.px);

function derivePreset(v, isCustom) {
  if (isCustom) return "custom";
  if (v === null || v === undefined) return "none";
  const n = Number(v);
  if (PRESET_NUMS.includes(n)) return String(n);
  return "custom";
}

const selectedPreset = ref(
  derivePreset(props.local.max_pixels, props.local.max_pixels_custom),
);

watch(
  () => props.local.name,
  () => {
    selectedPreset.value = derivePreset(
      props.local.max_pixels,
      props.local.max_pixels_custom,
    );
  },
);

function setPreset(val) {
  selectedPreset.value = val;
  if (val === "none") {
    delete props.local.max_pixels;
    delete props.local.max_pixels_custom;
  } else if (val === "custom") {
    if (
      props.local.max_pixels === null ||
      props.local.max_pixels === undefined ||
      PRESET_NUMS.includes(Number(props.local.max_pixels))
    ) {
      delete props.local.max_pixels;
    }
    props.local.max_pixels_custom = true;
  } else {
    props.local.max_pixels = Number(val);
    delete props.local.max_pixels_custom;
  }
}

function customPixelRule(v) {
  if (v === null || v === undefined || v === "") return "Enter a pixel value";
  return Number(v) >= 640 || "Must be at least 640 pixels";
}
</script>
