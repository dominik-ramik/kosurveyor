<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    persistent
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center pt-5 px-6">
        <span>Visibility condition</span>
        <span v-if="fieldLabel" class="text-medium-emphasis ml-2"
          >&middot; {{ fieldLabel }}</span
        >
        <v-spacer />
        <v-btn
          icon
          size="small"
          variant="text"
          @click="$emit('update:modelValue', false)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <!-- Mode toggle — intercept destructive switches -->
        <v-btn-toggle
          :model-value="mode"
          color="primary"
          variant="outlined"
          density="compact"
          divided
          mandatory
          class="mb-4 w-100"
          @update:model-value="requestModeChange"
        >
          <v-btn value="always" class="flex-grow-1" size="small"
            >Always shown</v-btn
          >
          <v-btn value="builder" class="flex-grow-1" size="small"
            >Build condition</v-btn
          >
          <v-btn value="custom" class="flex-grow-1" size="small"
            >Custom XPath</v-btn
          >
        </v-btn-toggle>

        <!-- Destructive-switch confirmation — replaces mode panel when active -->
        <v-alert
          v-if="pendingMode"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          <div class="mb-3">{{ pendingModeMessage }}</div>
          <div class="d-flex ga-2">
            <v-btn size="small" variant="tonal" @click="cancelPendingMode"
              >Keep current</v-btn
            >
            <v-btn
              size="small"
              color="error"
              variant="tonal"
              @click="commitModeChange(pendingMode)"
            >
              Discard &amp; switch
            </v-btn>
          </div>
        </v-alert>

        <!-- ── Mode panel: Always ─────────────────────────────── -->
        <div
          v-if="!pendingMode && mode === 'always'"
          class="d-flex flex-column align-center justify-center py-8"
        >
          <v-icon size="48" color="grey-lighten-1" class="mb-3"
            >mdi-eye-outline</v-icon
          >
          <div class="text-body-2 text-medium-emphasis text-center">
            This field/group is always visible — no condition applied.
          </div>
        </div>

        <!-- ── Mode panel: Builder ────────────────────────────── -->
        <div v-else-if="!pendingMode && mode === 'builder'">
          <div v-for="(row, idx) in builderRows" :key="idx">
            <!-- Combinator badge between rows -->
            <div v-if="idx > 0" class="d-flex justify-center my-1">
              <v-chip
                size="x-small"
                label
                color="primary"
                variant="tonal"
                style="cursor: pointer"
                @click="combinator = combinator === 'and' ? 'or' : 'and'"
                >{{ combinator === "and" ? "AND" : "OR" }}</v-chip
              >
            </div>

            <div class="d-flex align-center ga-2 mb-1">
              <!-- Field selector -->
              <v-btn
                :variant="row.fieldName ? 'tonal' : 'outlined'"
                :color="row.fieldName ? 'primary' : undefined"                
                prepend-icon="mdi-pencil-outline"
                class="text-none"
                style="flex: 2; justify-content: flex-start; min-width: 0"
                @click="openFieldPicker(idx)"
              >
                <span
                  style="
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  "
                  :class="row.fieldName ? '' : 'text-medium-emphasis'"
                >
                  {{
                    row.fieldName
                      ? fieldMap.get(row.fieldName)?.label || row.fieldName
                      : "Choose field…"
                  }}
                </span>
              </v-btn>

              <!-- Operator selector -->
              <v-select
                v-model="row.operator"
                :items="getOperatorsForField(row.fieldName)"
                item-title="title"
                item-value="value"
                density="compact"
                variant="outlined"
                placeholder="Operator"
                hide-details
                style="flex: 1.5"
                :disabled="!row.fieldName"
              />

              <!-- Value input -->
              <template
                v-if="!['is_empty', 'is_not_empty', ''].includes(row.operator)"
              >
                <v-select
                  v-if="getChoicesForField(row.fieldName).length > 0"
                  v-model="row.value"
                  :items="getChoicesForField(row.fieldName)"
                  item-title="title"
                  item-value="value"
                  density="compact"
                  variant="outlined"
                  placeholder="Value"
                  hide-details
                  style="flex: 1.5"
                />
                <v-text-field
                  v-else
                  v-model="row.value"
                  density="compact"
                  variant="outlined"
                  placeholder="Value"
                  hide-details
                  :type="isNumericField(row.fieldName) ? 'number' : 'text'"
                  style="flex: 1.5"
                />
              </template>
              <div v-else style="flex: 1.5" />

              <!-- Remove button -->
              <v-btn
                icon
                size="x-small"
                variant="text"
                color="error"
                @click="builderRows.splice(idx, 1)"
              >
                <v-icon size="16">mdi-close</v-icon>
              </v-btn>
            </div>
          </div>

          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            class="mt-2"
            @click="
              builderRows.push({ fieldName: '', operator: '', value: '' })
            "
          >
            + Add condition
          </v-btn>
        </div>

        <!-- ── Mode panel: Custom XPath ───────────────────────── -->
        <div v-else-if="!pendingMode && mode === 'custom'">
          <v-alert
            v-if="showBuilderToCustomWarning"
            type="info"
            variant="tonal"
            density="compact"
            closable
            class="mb-3"
            @click:close="customWarnDismissed = true"
          >
            Your built condition has been copied as XPath. Switching back to
            Build condition will discard it and start fresh.
          </v-alert>

          <v-textarea
            v-model="customXpath"
            rows="4"
            density="compact"
            variant="outlined"
            placeholder="Enter XPath expression..."
            hide-details
            style="font-family: ui-monospace, monospace; font-size: 13px"
          />
          <div class="text-caption text-medium-emphasis mt-1 mb-2">
            Maps to the XLSForm "relevant" column. Use
            <code>${field_name}</code> to reference fields.
            <a
              href="https://docs.getodk.org/form-operators-functions/"
              target="_blank"
              rel="noopener"
              >ODK operator &amp; function reference &#x2197;</a
            >
          </div>
        </div>

        <!-- ── Preview strip ──────────────────────────────────── -->
        <v-divider class="my-3" />
        <div class="mb-2">
          <div
            v-if="currentExpression"
            class="text-caption text-medium-emphasis mb-1"
            style="font-family: ui-monospace, monospace; line-height: 1.5"
          >
            <strong>XPath:</strong> {{ currentExpression }}
          </div>
          <div
            class="text-caption text-medium-emphasis"
            style="line-height: 1.5"
          >
            <strong>Reads:</strong> <span v-html="humanLabel" />
          </div>
        </div>

        <!-- ── Editable prefill warning ───────────────────────── -->
        <v-alert
          v-if="isEditablePrefill"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          <strong>Note:</strong> If this field is hidden by a visibility
          condition, its pre-populated value will be cleared from the
          submission.
        </v-alert>
      </v-card-text>

      <!-- Footer actions -->
      <v-divider />
      <v-card-actions class="px-6 pb-5 pt-4">
        <v-btn variant="text" @click="$emit('update:modelValue', false)"
          >Cancel</v-btn
        >
        <v-spacer />
        <v-btn variant="tonal" @click="onClear">Clear</v-btn>
        <v-btn color="primary" variant="tonal" @click="onApply">Apply</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Field Picker Dialog ──────────────────────────────────── -->
  <v-dialog v-model="fieldPickerOpen" max-width="380" scrollable>
    <v-card>
      <div class="d-flex align-center px-5 pt-4 pb-3">
        <span class="text-subtitle-2 font-weight-bold">Choose a field</span>
        <v-spacer />
        <v-btn
          icon
          size="small"
          variant="text"
          @click="fieldPickerOpen = false"
        >
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </div>
      <v-divider />
      <v-card-text class="pa-3" style="max-height: 420px">
        <template v-for="section in fieldPickerSections" :key="section.header">
          <!-- Section header -->
          <div
            class="text-caption font-weight-bold text-medium-emphasis px-2 pt-3 pb-1"
            style="text-transform: uppercase; letter-spacing: 0.06em"
          >
            {{ section.header }}
          </div>
          <!-- Field items -->
          <v-card
            v-for="f in section.fields"
            :key="f.name"
            :variant="fieldPickerSelected === f.name ? 'tonal' : 'outlined'"
            :color="fieldPickerSelected === f.name ? 'primary' : undefined"
            class="mb-1 field-picker-item"
            style="cursor: pointer"
            @click="selectPickerField(f.name)"
          >
            <div class="d-flex align-center px-3 py-2 ga-2">
              <v-icon
                size="16"
                :color="fieldPickerSelected === f.name ? 'primary' : 'grey'"
              >
                {{ widgetIcon(f.widget) }}
              </v-icon>
              <div style="min-width: 0; flex: 1">
                <div
                  class="text-body-2 font-weight-medium"
                  style="
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  "
                >
                  {{ f.label }}
                </div>
                <div
                  class="text-caption text-medium-emphasis"
                  style="
                    font-family: ui-monospace, monospace;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  "
                >
                  {{ f.name }}
                </div>
              </div>
              <v-chip
                size="x-small"
                variant="text"
                class="text-caption text-medium-emphasis flex-shrink-0"
              >
                {{ f.widget }}
              </v-chip>
            </div>
          </v-card>
        </template>

        <div
          v-if="fieldPickerSections.length === 0"
          class="text-center text-medium-emphasis text-body-2 py-6"
        >
          No referenceable fields available.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import {
  relevantToLabel,
  parseRelevantToBuilder,
} from "../../logic/xlsform/relevantLabel.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  currentRelevant: { type: String, default: "" },
  scopeFields: { type: Array, default: () => [] },
  fieldLabel: { type: String, default: "" },
  isEditablePrefill: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "apply"]);

// ── Internal state ────────────────────────────────────────────────────
const mode = ref("always");
const builderRows = ref([]);
const combinator = ref("and");
const customXpath = ref("");
const customWarnDismissed = ref(false);
const previousMode = ref("always");

// ── Initialisation on open ────────────────────────────────────────────
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) initFromCurrent();
  },
);

function initFromCurrent() {
  customWarnDismissed.value = false;
  previousMode.value = "always";
  const xp = (props.currentRelevant || "").trim();
  if (!xp) {
    mode.value = "always";
    builderRows.value = [];
    customXpath.value = "";
    return;
  }
  const parsed = parseRelevantToBuilder(xp);
  if (parsed) {
    mode.value = "builder";
    builderRows.value = parsed.rows;
    combinator.value = parsed.combinator;
    customXpath.value = "";
  } else {
    mode.value = "custom";
    customXpath.value = xp;
    builderRows.value = [];
  }
}

const pendingMode = ref(null); // set when a destructive switch needs confirmation

const pendingModeMessage = computed(() => {
  if (!pendingMode.value) return "";
  if (pendingMode.value === "always")
    return 'Switching to "Always shown" will remove your current condition.';
  if (pendingMode.value === "builder")
    return "Switching to Build condition will discard your custom XPath.";
  return "";
});

function requestModeChange(newMode) {
  if (!newMode || newMode === mode.value) return;
  const isDestructive =
    (newMode === "always" && currentExpression.value) ||
    (newMode === "builder" &&
      mode.value === "custom" &&
      customXpath.value.trim());
  if (isDestructive) {
    pendingMode.value = newMode;
  } else {
    commitModeChange(newMode);
  }
}

function commitModeChange(newMode) {
  const oldMode = mode.value;
  if (newMode === "always") {
    builderRows.value = [];
    customXpath.value = "";
  } else if (newMode === "custom" && oldMode === "builder") {
    customXpath.value = serializeBuilder();
  } else if (newMode === "builder") {
    builderRows.value = [];
  }
  mode.value = newMode;
  pendingMode.value = null;
}

function cancelPendingMode() {
  pendingMode.value = null;
}

// ── Field helpers ─────────────────────────────────────────────────────
function onFieldChange(row) {
  row.operator = "";
  row.value = "";
}

const fieldMap = computed(() => {
  const m = new Map();
  for (const f of props.scopeFields) {
    m.set(f.name, f);
  }
  return m;
});

const groupedFieldItems = computed(() =>
  props.scopeFields.map((f) => ({
    title: f.label,
    subtitle: f.sameGroup ? f.name : `${f.groupLabel}  ·  ${f.name}`,
    value: f.name,
  })),
);

function getOperatorsForField(fieldName) {
  const f = fieldMap.value.get(fieldName);
  if (!f) return [];
  const w = f.widget;
  const ops = [];
  if (["text"].includes(w)) {
    ops.push(
      { title: "Is empty", value: "is_empty" },
      { title: "Is not empty", value: "is_not_empty" },
      { title: "Equals", value: "eq" },
      { title: "Does not equal", value: "neq" },
    );
  } else if (["integer", "decimal", "date", "time", "datetime"].includes(w)) {
    ops.push(
      { title: "Is empty", value: "is_empty" },
      { title: "Is not empty", value: "is_not_empty" },
      { title: "Equals", value: "eq" },
      { title: "Does not equal", value: "neq" },
      { title: "Is greater than", value: "gt" },
      { title: "Is less than", value: "lt" },
      { title: "Is at least", value: "gte" },
      { title: "Is at most", value: "lte" },
    );
  } else if (w === "select_one") {
    ops.push({ title: "Is", value: "eq" }, { title: "Is not", value: "neq" });
  } else if (w === "select_multiple") {
    ops.push(
      { title: "Includes", value: "selected" },
      { title: "Does not include", value: "not_selected" },
    );
  } else if (["gps", "image", "audio"].includes(w)) {
    ops.push(
      { title: "Is empty", value: "is_empty" },
      { title: "Is not empty", value: "is_not_empty" },
    );
  }
  return ops;
}

function getChoicesForField(fieldName) {
  const f = fieldMap.value.get(fieldName);
  if (!f || !f.choices || f.choices.length === 0) return [];
  if (!["select_one", "select_multiple"].includes(f.widget)) return [];
  return f.choices.map((c) => ({ title: c.label, value: c.value }));
}

function isNumericField(fieldName) {
  const f = fieldMap.value.get(fieldName);
  return f && ["integer", "decimal"].includes(f.widget);
}

// ── Serialisation ─────────────────────────────────────────────────────
function serializeRow(row) {
  const name = "${" + row.fieldName + "}";
  const numeric = isNumericField(row.fieldName);
  const v = row.value;

  switch (row.operator) {
    case "is_empty":
      return `${name} = ''`;
    case "is_not_empty":
      return `${name} != ''`;
    case "eq":
      return numeric ? `${name} = ${v}` : `${name} = '${v}'`;
    case "neq":
      return numeric ? `${name} != ${v}` : `${name} != '${v}'`;
    case "gt":
      return `${name} > ${v}`;
    case "lt":
      return `${name} < ${v}`;
    case "gte":
      return `${name} >= ${v}`;
    case "lte":
      return `${name} <= ${v}`;
    case "selected":
      return `selected(${name}, '${v}')`;
    case "not_selected":
      return `not(selected(${name}, '${v}'))`;
    default:
      return "";
  }
}

function serializeBuilder() {
  const atoms = builderRows.value
    .filter((r) => {
      if (!r.fieldName || !r.operator) return false;
      if (
        !["is_empty", "is_not_empty"].includes(r.operator) &&
        !r.value &&
        r.value !== 0
      )
        return false;
      return true;
    })
    .map(serializeRow)
    .filter(Boolean);
  return atoms.join(combinator.value === "or" ? " or " : " and ");
}

// ── Preview ───────────────────────────────────────────────────────────
const currentExpression = computed(() => {
  if (mode.value === "always") return "";
  if (mode.value === "builder") return serializeBuilder();
  return customXpath.value.trim();
});

const nameMap = computed(() => {
  const m = new Map();
  for (const f of props.scopeFields) {
    m.set(f.name, { label: f.label, groupLabel: f.groupLabel });
  }
  return m;
});

const humanLabel = computed(() =>
  relevantToLabel(currentExpression.value, nameMap.value),
);

// ── Actions ───────────────────────────────────────────────────────────
function onClear() {
  emit("apply", "");
  emit("update:modelValue", false);
}

function onApply() {
  const value = currentExpression.value;
  emit("apply", value);
  emit("update:modelValue", false);
}

// ── Field picker ──────────────────────────────────────────────────────
const fieldPickerOpen = ref(false);
const fieldPickerRowIdx = ref(null); // which builder row is being edited
const fieldPickerSelected = computed(() =>
  fieldPickerRowIdx.value !== null
    ? builderRows.value[fieldPickerRowIdx.value]?.fieldName
    : null,
);

function openFieldPicker(rowIdx) {
  fieldPickerRowIdx.value = rowIdx;
  fieldPickerOpen.value = true;
}

function selectPickerField(fieldName) {
  const row = builderRows.value[fieldPickerRowIdx.value];
  if (!row) return;
  if (row.fieldName !== fieldName) {
    row.fieldName = fieldName;
    row.operator = "";
    row.value = "";
  }
  fieldPickerOpen.value = false;
}

const fieldPickerSections = computed(() => {
  const sections = [];
  let currentSection = null;

  for (const f of props.scopeFields) {
    const header = f.sameGroup ? "This group" : `From page: ${f.groupLabel}`;
    if (!currentSection || currentSection.header !== header) {
      currentSection = { header, fields: [] };
      sections.push(currentSection);
    }
    currentSection.fields.push(f);
  }

  // "This group" always first, page groups follow in their original order
  sections.sort((a, b) => {
    if (a.header === "This group") return -1;
    if (b.header === "This group") return 1;
    return 0;
  });

  return sections;
});

const WIDGET_ICONS = {
  text: "mdi-format-text",
  integer: "mdi-numeric",
  decimal: "mdi-decimal",
  date: "mdi-calendar",
  datetime: "mdi-calendar-clock",
  time: "mdi-clock-outline",
  gps: "mdi-map-marker",
  select_one: "mdi-radiobox-marked",
  select_multiple: "mdi-checkbox-multiple-marked",
  image: "mdi-image",
  audio: "mdi-microphone",
};

function widgetIcon(widget) {
  return WIDGET_ICONS[widget] || "mdi-help-circle-outline";
}
</script>
<style scoped>
.field-picker-item {
  transition:
    background-color 0.1s,
    border-color 0.1s;
}
.field-picker-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.4) !important;
}
</style>
