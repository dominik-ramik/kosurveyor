<template>
  <div
    class="field-summary-item d-flex align-center pa-2 rounded bg-white bg-blue-lighten-5 mb-1"
    :class="{ 'field-summary-item--selected': isSelected }"
    draggable="true"
    @click="$emit('select', field)"
    @dragstart="onDragStart"
    @dragover.prevent
    @drop="onDrop"
  >
    <v-icon size="small" class="drag-handle mr-2" :color="isSelected ? 'primary' : 'grey'"
      >mdi-drag-vertical</v-icon
    >
    <v-icon size="small" class="mr-2" :color="isSelected ? 'primary' : iconColor">{{
      widgetIcon
    }}</v-icon>
    <div class="flex-grow-1 field-summary-item__text">
      <div class="d-flex flex-row ga-1">
        <div class="text-body-2 font-weight-medium">{{ field.label }}</div>
        <div v-if="showNames" class="text-caption text-grey">
          ({{ field.name }})
        </div>
        <div
          v-if="field.hint"
          class="text-caption font-italic text-grey-darken-1 field-summary-item__hint"
        >
          {{ field.hint }}
        </div>
      </div>
    </div>
    <div class="d-flex align-center ga-1">
      <v-chip
        v-if="field.prefilled === 'readonly'"
        size="x-small"
        color="orange"
        variant="flat"
      >
        PREFILLED RO
      </v-chip>
      <v-chip
        v-else-if="field.prefilled === 'editable'"
        size="x-small"
        color="blue"
        variant="flat"
      >
        PREFILLED ED
      </v-chip>
      <v-chip v-if="isBrokenFilter" size="x-small" color="error" variant="flat">
        <v-icon start size="x-small">mdi-alert</v-icon>
        Broken filter
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { getField } from "../../plugins/fields/index.js";
import { useUiPrefs } from "../../composables/useUiPrefs.js";

const props = defineProps({
  field: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  brokenFields: { type: Set, default: () => new Set() },
  index: { type: Number, default: 0 },
});

const emit = defineEmits(["select", "drag-start", "drop"]);

const widgetIcon = computed(
  () => getField(props.field.widget)?.icon || "mdi-text-short",
);
const iconColor = computed(() =>
  props.field.prefilled ? "primary" : "grey-darken-1",
);
const isBrokenFilter = computed(() => props.brokenFields.has(props.field.name));

const { showNames } = useUiPrefs();

function onDragStart(e) {
  e.dataTransfer.setData("text/plain", String(props.index));
  emit("drag-start", props.index);
}

function onDrop(e) {
  const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
  emit("drop", { from: fromIndex, to: props.index });
}
</script>

<style scoped>
.field-summary-item {
  cursor: pointer;
  transition: background-color 0.15s;
  border: 1px solid transparent;
}
.field-summary-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
.field-summary-item--selected {
  background-color: rgba(var(--v-theme-primary), 0.38);
  border-color: rgb(var(--v-theme-primary));
}
.drag-handle {
  cursor: grab;
}
.field-summary-item__hint {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
