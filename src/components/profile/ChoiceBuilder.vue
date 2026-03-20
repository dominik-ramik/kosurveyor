<template>
  <div class="choice-builder">
    <v-table density="compact">
      <thead>
        <tr>
          <th>Label</th>
          <th>Value (key)</th>
          <th v-if="hasParentChoices">Show on option</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(choice, index) in modelValue" :key="index">
          <td>
            <v-text-field
              v-model="choice.label"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="(val) => onChoiceLabelUpdate(index, val)"
            />
          </td>
          <td>
            <v-text-field
              :model-value="choice.value"
              density="compact"
              variant="outlined"
              hide-details="auto"
              :readonly="isChoiceLocked(choice.value)"
              :error-messages="
                isChoiceLocked(choice.value)
                  ? []
                  : choiceValueError(choice.value)
              "
              :class="{ 'choice-key--locked': isChoiceLocked(choice.value) }"
              @click="
                isChoiceLocked(choice.value) ? showLockDialog() : undefined
              "
              @update:model-value="
                (val) => {
                  valueTouchedIndices.value.add(index);
                  choice.value = val;
                  emitUpdate();
                }
              "
            />
          </td>
          <td v-if="hasParentChoices">
            <v-select
              :model-value="choice.filter_value ?? null"
              :items="parentChoiceItems"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              placeholder="(all)"
              @update:model-value="
                (val) => {
                  choice.filter_value = val ?? '';
                  emitUpdate();
                }
              "
            />
          </td>
          <td class="text-center">
            <template v-if="isChoiceLocked(choice.value)">
              <v-icon
                size="small"
                color="warning"
                title="This choice is used by a child filter and cannot be removed"
                >mdi-lock</v-icon
              >
            </template>
            <v-btn
              v-else
              icon
              size="x-small"
              variant="text"
              @click="removeChoice(index)"
            >
              <v-icon size="small">mdi-close</v-icon>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-btn
      variant="tonal"
      size="small"
      prepend-icon="mdi-plus"
      class="mt-2"
      @click="addChoice"
    >
      Add Choice
    </v-btn>

    <v-dialog v-model="lockDialogVisible" max-width="480">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon color="warning" class="mr-2">mdi-lock</v-icon>
          Choice Keys Locked
        </v-card-title>
        <v-card-text>
          <p>
            These choice keys cannot be edited because the following child
            {{ dependentChildNames.length === 1 ? "field" : "fields" }}
            filter by this field:
          </p>
          <v-chip-group class="mt-2">
            <v-chip
              v-for="name in dependentChildNames"
              :key="name"
              color="warning"
              size="small"
              variant="tonal"
              >{{ name }}</v-chip
            >
          </v-chip-group>
          <p class="mt-3">
            Remove the <strong>Filtered By</strong> setting from
            {{
              dependentChildNames.length === 1 ? "that field" : "those fields"
            }}
            first, then edit the keys here.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            @click="lockDialogVisible = false"
            >OK</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { slugify } from "../../logic/slugify.js";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  dependentChildNames: { type: Array, default: () => [] },
  lockedChoiceValues: { type: Array, default: () => [] },
  parentChoices: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue"]);

const lockDialogVisible = ref(false);
const valueTouchedIndices = ref(new Set());

const hasParentChoices = computed(() => props.parentChoices.length > 0);

function isChoiceLocked(value) {
  return props.lockedChoiceValues.includes(value);
}
const parentChoiceItems = computed(() =>
  props.parentChoices.map((c) => ({
    title: c.label ? `${c.value} — ${c.label}` : c.value,
    value: c.value,
  })),
);

function showLockDialog() {
  lockDialogVisible.value = true;
}

function choiceValueError(value) {
  if (value && /\s/.test(value)) return "Choice keys must not contain spaces";
  return "";
}

function addChoice() {
  const updated = [
    ...props.modelValue.map((c) => ({
      value: c.value,
      label: c.label,
      filter_value: c.filter_value ?? "",
    })),
    { value: "", label: "", filter_value: "" },
  ];
  emit("update:modelValue", updated);
}

function removeChoice(index) {
  const newTouched = new Set();
  for (const i of valueTouchedIndices.value) {
    if (i < index) newTouched.add(i);
    else if (i > index) newTouched.add(i - 1);
  }
  valueTouchedIndices.value = newTouched;
  emit(
    "update:modelValue",
    props.modelValue
      .filter((_, i) => i !== index)
      .map((c) => ({
        value: c.value,
        label: c.label,
        filter_value: c.filter_value ?? "",
      })),
  );
}

function onChoiceLabelUpdate(index, val) {
  if (!valueTouchedIndices.value.has(index)) {
    props.modelValue[index].value = slugify(val);
  }
  emitUpdate();
}

function emitUpdate() {
  emit(
    "update:modelValue",
    props.modelValue.map((c) => ({
      value: c.value,
      label: c.label,
      filter_value: c.filter_value ?? "",
    })),
  );
}
</script>

<style scoped>
.choice-builder .v-table {
  background: transparent;
}
.choice-key--locked :deep(input) {
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
