<template>
  <v-navigation-drawer
    location="right"
    :width="500"
    :model-value="true"
    permanent
  >
    <!-- ── Fixed header (always present — no layout shift) ──────────────
         The dot appears/disappears within its reserved space at the right.
         The header never grows or shrinks, so nothing below it ever shifts. -->
    <div class="drawer-header px-4 d-flex align-center flex-shrink-0">
      <span class="text-subtitle-2 font-weight-medium text-medium-emphasis">
        {{ drawerTitle }}
      </span>
      <v-spacer />
      <v-icon
        v-if="isDirty && !isNew"
        size="10"
        color="warning"
        title="Unsaved changes"
        style="opacity: 0.85"
        >mdi-circle-medium</v-icon
      >
    </div>
    <v-divider />

    <!-- ── Scrollable content ────────────────────────────────────────── -->
    <div class="pa-4 drawer-content">
      <!-- New group: type picker -->
      <template v-if="isNew && itemType === 'group' && !local.type">
        <div class="text-subtitle-1 font-weight-bold mb-3">
          Select Group Type
        </div>
        <v-card
          v-for="opt in groupTypeOptions"
          :key="opt.value"
          class="mb-3"
          variant="outlined"
          hover
          @click="local.type = opt.value"
        >
          <v-card-text class="d-flex align-start pa-3">
            <v-icon size="36" color="primary" class="mr-3">{{
              opt.icon
            }}</v-icon>
            <div>
              <div class="text-body-1 font-weight-bold">{{ opt.title }}</div>
              <div class="text-caption text-grey">{{ opt.desc }}</div>
            </div>
          </v-card-text>
        </v-card>
      </template>

      <!-- New field: widget picker -->
      <template v-else-if="isNew && itemType === 'field' && !local.widget">
        <div class="text-subtitle-1 font-weight-bold mb-3">
          Select Field Type
        </div>
        <v-card
          v-for="opt in fieldTypeOptions"
          :key="opt.value"
          class="mb-3"
          variant="outlined"
          hover
          @click="local.widget = opt.value"
        >
          <v-card-text class="d-flex align-start pa-3">
            <v-icon size="36" color="primary" class="mr-3 mt-1">{{
              opt.icon
            }}</v-icon>
            <div>
              <div class="text-body-1 font-weight-bold">{{ opt.title }}</div>
              <div class="text-caption text-grey">{{ opt.desc }}</div>
            </div>
          </v-card-text>
        </v-card>
      </template>

      <!-- Global profile settings -->
      <template v-else-if="itemType === 'global'">
        <v-text-field
          v-model="local.profile_name"
          label="Profile Name"
          :rules="[requiredRule]"
          density="compact"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          v-model="local.form_id_stem"
          label="Form ID Stem"
          :rules="[requiredRule, formIdRule]"
          density="compact"
          variant="outlined"
          class="mb-3 mono-field"
        />
        <v-textarea
          v-model="local.profile_description"
          label="Description"
          density="compact"
          variant="outlined"
          rows="3"
          class="mb-3"
        />
        <v-text-field
          v-model="local.profile_author"
          label="Author"
          density="compact"
          variant="outlined"
          class="mb-3"
        />
      </template>

      <!-- Group editor -->
      <template v-else-if="itemType === 'group'">
        <v-text-field
          :model-value="getGroupTitle(local.type)"
          label="Group Type"
          readonly
          variant="outlined"
          density="compact"
          color="primary"
          class="mb-8 font-weight-bold text-primary"
          hide-details
        >
          <template #prepend-inner>
            <v-icon
              :icon="getGroupIcon(local.type)"
              class="mr-2"
              color="primary"
            />
          </template>
        </v-text-field>

        <v-text-field
          :model-value="local.label"
          @update:model-value="onLabelUpdate"
          label="Group Label"
          :rules="[requiredRule]"
          density="compact"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          :model-value="local.name"
          @update:model-value="onNameUpdate"
          label="Group Name"
          :rules="[requiredRule, snakeCaseRule]"
          density="compact"
          variant="outlined"
          class="mb-3 mono-field"
        />

        <template v-if="local.type === 'repeat'">
          <v-text-field
            v-model.number="local.max_repeat"
            label="Max Repeat"
            type="number"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <v-switch
            v-model="local.sub_surveys"
            label="Enable Sub-Surveys"
            density="compact"
            color="primary"
            hide-details
            class="mb-3"
          >
            <template #append>
              <v-btn
                icon
                size="x-small"
                variant="text"
                @click="$emit('show-help', 'sub_surveys')"
              >
                <v-icon size="small">mdi-help-circle-outline</v-icon>
              </v-btn>
            </template>
          </v-switch>
          <v-switch
            v-model="local.free_option"
            label="Free-format survey"
            :disabled="isFreeOptionForced"
            density="compact"
            color="primary"
            hide-details
            class="mb-3"
          >
            <template #append>
              <v-btn
                icon
                size="x-small"
                variant="text"
                @click="$emit('show-help', 'free_option')"
              >
                <v-icon size="small">mdi-help-circle-outline</v-icon>
              </v-btn>
            </template>
          </v-switch>
          <div v-if="isFreeOptionForced" class="text-caption text-grey mb-3">
            Always on (no prefilled fields in this group)
          </div>
        </template>
      </template>

      <!-- Field editor -->
      <template v-else-if="itemType === 'field'">
        <v-text-field
          :model-value="getFieldTitle(local.widget)"
          label="Widget Type"
          readonly
          variant="outlined"
          density="compact"
          color="primary"
          class="mb-8 font-weight-bold text-primary"
          hide-details
        >
          <template #prepend-inner>
            <v-icon
              :icon="getFieldIcon(local.widget)"
              class="mr-2"
              color="primary"
            />
          </template>
        </v-text-field>

        <v-text-field
          :model-value="local.label"
          @update:model-value="onLabelUpdate"
          label="Field Label"
          :rules="[requiredRule]"
          density="compact"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          :model-value="local.name"
          @update:model-value="onNameUpdate"
          label="Field Name"
          :rules="[requiredRule, snakeCaseRule, noLeadingUnderscoreRule]"
          density="compact"
          variant="outlined"
          class="mb-3 mono-field"
        />
        <v-text-field
          v-model="local.hint"
          label="Hint"
          density="compact"
          variant="outlined"
          class="mb-3"
        />

        <div class="mb-1 text-subtitle-2 text-grey-darken-1">
          Prefill Behavior
        </div>
        <v-btn-toggle
          v-model="prefilledState"
          color="primary"
          variant="outlined"
          density="compact"
          divided
          mandatory
          class="mb-2 w-100"
        >
          <v-btn
            v-for="opt in prefilledOptions"
            :key="opt.title"
            :value="opt.value"
            class="flex-grow-1"
            size="small"
          >
            {{ opt.title }}
          </v-btn>
        </v-btn-toggle>

        <div
          :key="prefilledState"
          class="text-caption text-grey-darken-1 mb-4"
          style="line-height: 1.3"
        >
          <span v-if="prefilledState === 'none'">
            <strong>None:</strong> Standard behavior. The field starts empty to
            capture normal data entry.
          </span>
          <span v-else-if="prefilledState === 'editable'">
            <strong>Editable:</strong> Starts prefilled with data from your
            template, but allows user modifications. Ideal for follow-up surveys
            where prior data might need correction.
          </span>
          <span v-else-if="prefilledState === 'readonly'">
            <strong>Read-only:</strong> Displays fixed, uneditable data from your
            template. Useful for collecting data on predefined items (e.g.,
            surveying specific locations or providing terms to translate).
          </span>
        </div>

        <component
          v-if="activeFieldConfig"
          :is="activeFieldConfig"
          :local="local"
          :group-context="groupContext"
        />
      </template>

      <!-- Empty state -->
      <template v-else>
        <div
          class="d-flex flex-column align-center justify-center text-center pa-6"
          style="height: 100%; min-height: 240px"
        >
          <v-icon size="56" color="grey-lighten-1" class="mb-4"
            >mdi-cursor-pointer</v-icon
          >
          <div class="text-body-1 text-grey-darken-1 font-weight-medium mb-2">
            Nothing selected
          </div>
          <div class="text-body-2 text-grey">
            Click a field, group, or the survey profile header in the editor to view
            and edit its settings.
          </div>
        </div>
      </template>
    </div>
    <!-- /drawer-content -->

    <!-- ── Fixed footer ──────────────────────────────────────────────── -->
    <template v-if="showActionFooter">
      <v-divider />
      <div class="pa-4 flex-shrink-0">
        <!-- Blocking validation errors
             Shown immediately — gives the user a clear, actionable summary
             of everything that must be fixed before saving. -->
        <div v-if="errors.length > 0" class="mb-3">
          <div
            v-for="err in errors"
            :key="err"
            class="d-flex align-start ga-1 mb-1"
          >
            <v-icon
              size="14"
              color="error"
              class="flex-shrink-0"
              style="margin-top: 2px"
              >mdi-alert-circle-outline</v-icon
            >
            <span class="text-caption text-error" style="line-height: 1.4">{{
              err
            }}</span>
          </div>
        </div>

        <!-- Non-blocking warnings (if any) -->
        <div v-if="warnings.length > 0" class="mb-3">
          <div
            v-for="warn in warnings"
            :key="warn"
            class="d-flex align-start ga-1 mb-1"
          >
            <v-icon
              size="14"
              color="warning"
              class="flex-shrink-0"
              style="margin-top: 2px"
              >mdi-alert-outline</v-icon
            >
            <span
              class="text-caption"
              style="color: rgb(var(--v-theme-warning)); line-height: 1.4"
            >
              {{ warn }}
            </span>
          </div>
        </div>

        <!-- Action buttons + unsaved chip in one non-wrapping row -->
        <div class="d-flex align-center ga-2">
          <v-btn
            color="primary"
            variant="tonal"
            :disabled="!canSave"
            @click="saveChanges"
            >Save Changes</v-btn
          >

          <v-btn variant="tonal" @click="discardChanges">Discard</v-btn>

          <v-btn
            v-if="!isNew && (itemType === 'group' || itemType === 'field')"
            color="error"
            variant="tonal"
            @click="confirmDelete = true"
            >Delete</v-btn
          >

          <v-spacer />

          <!-- Unsaved indicator — floats to the right, no vertical layout shift.
               Only shown for existing items to avoid confusion with new ones. -->
          <span
            v-if="isDirty && !isNew"
            class="d-flex align-center ga-1 text-caption text-medium-emphasis"
          >
            <v-icon size="8" color="warning">mdi-circle</v-icon>
            Unsaved
          </span>
        </div>
      </div>
    </template>

    <!-- ── Delete confirmation dialog ───────────────────────────────── -->
    <v-dialog v-model="confirmDelete" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center ga-2 pt-5 px-6">
          <v-icon color="error">mdi-delete-outline</v-icon>
          Delete {{ itemType === "group" ? "Group" : "Field" }}
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          Are you sure you want to delete "{{ local.label || local.name }}"?
          This cannot be undone.
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, reactive, computed, watch, toRaw, toRef } from "vue";
import { getAllFields, getField } from "../../plugins/fields/index.js";
import { getAllGroups, getGroup } from "../../plugins/groups/index.js";
import { slugify } from "../../logic/slugify.js";
import { useDrawerValidation } from "../../composables/useDrawerValidation.js";
import SelectFieldConfig from "./fieldConfig/SelectFieldConfig.vue";
import ImageFieldConfig from "./fieldConfig/ImageFieldConfig.vue";
import TextFieldConfig from "./fieldConfig/TextFieldConfig.vue";
import NumericFieldConfig from "./fieldConfig/NumericFieldConfig.vue";
import DateFieldConfig from "./fieldConfig/DateFieldConfig.vue";

const props = defineProps({
  selectedItem: { type: Object, default: null },
  itemType: { type: String, default: "" }, // 'global' | 'group' | 'field'
  groupContext: { type: Object, default: null }, // parent group when editing a field
  allGroups: { type: Array, default: () => [] },
  isNew: { type: Boolean, default: false },
});

const emit = defineEmits(["save", "close", "show-help", "delete"]);

// ── Local editing copy ─────────────────────────────────────────────────
// All sub-components mutate this directly.  It is only committed to the
// store when the user clicks "Save Changes".
const local = reactive({});

const confirmDelete = ref(false);
const nameTouched = ref(false);

watch(
  () => props.selectedItem,
  (newVal) => {
    if (newVal) {
      Object.keys(local).forEach((k) => delete local[k]);
      Object.assign(local, structuredClone(toRaw(newVal)));
      nameTouched.value = !props.isNew;
    }
  },
  { immediate: true, deep: true },
);

// ── Centralised validation + dirty tracking ────────────────────────────
const { errors, warnings, canSave, isDirty } = useDrawerValidation({
  local,
  itemType: toRef(props, "itemType"),
  groupContext: toRef(props, "groupContext"),
  selectedItem: toRef(props, "selectedItem"),
  isNew: toRef(props, "isNew"),
});

// ── Computed helpers ───────────────────────────────────────────────────
const drawerTitle = computed(() => {
  if (props.isNew && props.itemType === "group" && !local.type)
    return "Add Group";
  if (props.isNew && props.itemType === "field" && !local.widget)
    return "Add Field";
  if (props.isNew)
    return `New ${props.itemType === "group" ? "Group" : "Field"}`;
  if (props.itemType === "global") return "Survey profile settings";
  if (props.itemType === "group")
    return `Group: ${local.label || local.name || ""}`;
  if (props.itemType === "field")
    return `Field: ${local.label || local.name || ""}`;
  return "Details";
});

// Footer is only shown once there is something to save or discard
const showActionFooter = computed(() => {
  if (!props.selectedItem && !props.isNew) return false;
  if (!props.isNew) return true;
  if (props.itemType === "group") return !!local.type;
  if (props.itemType === "field") return !!local.widget;
  return true;
});

const groupTypeOptions = computed(() =>
  getAllGroups().map((p) => ({
    value: p.type,
    title: p.label,
    icon: p.icon,
    desc: p.description,
  })),
);

const fieldTypeOptions = computed(() =>
  getAllFields().map((p) => ({
    value: p.type,
    title: p.label,
    icon: p.icon,
    desc: p.description,
  })),
);

function getGroupTitle(val) {
  return getGroup(val)?.label || val;
}
function getGroupIcon(val) {
  return getGroup(val)?.icon || "mdi-folder";
}
function getFieldTitle(val) {
  return getField(val)?.label || val;
}
function getFieldIcon(val) {
  return getField(val)?.icon || "mdi-file-document";
}

const fieldConfigMap = {
  select_one: SelectFieldConfig,
  select_multiple: SelectFieldConfig,
  image: ImageFieldConfig,
  text: TextFieldConfig,
  integer: NumericFieldConfig,
  decimal: NumericFieldConfig,
  date: DateFieldConfig,
};

const activeFieldConfig = computed(() => {
  if (props.itemType !== "field") return null;
  return fieldConfigMap[local.widget] || null;
});

const prefilledState = computed({
  get() {
    return local.prefilled || "none";
  },
  set(val) {
    if (val === "none") delete local.prefilled;
    else local.prefilled = val;
  },
});

const prefilledOptions = computed(() => {
  const opts = [
    { title: "None", value: "none" },
    { title: "Read-only", value: "readonly" },
  ];
  const plugin = getField(local.widget);
  if (plugin?.supportsEditablePrefill)
    opts.push({ title: "Editable", value: "editable" });
  return opts;
});

const isFreeOptionForced = computed(() => {
  if (props.itemType !== "group" || local.type !== "repeat") return false;
  const fields = props.selectedItem?.fields || [];
  return !fields.some(
    (f) => f.prefilled === "readonly" || f.prefilled === "editable",
  );
});

// ── Vuetify inline rule functions ─────────────────────────────────────
// These drive per-field red borders / helper text inside the form itself.
// The composable handles the same logic for the consolidated footer list.
function requiredRule(v) {
  return !!v || "Required";
}
function snakeCaseRule(v) {
  if (!v) return true;
  return (
    /^[a-z][a-z0-9_]*$/.test(v) ||
    "Must be snake_case (lowercase, underscores, start with letter)"
  );
}
function noLeadingUnderscoreRule(v) {
  if (!v) return true;
  return !v.startsWith("_") || "Must not start with underscore";
}
function formIdRule(v) {
  if (!v) return true;
  return /^[a-zA-Z0-9_]+$/.test(v) || "Only alphanumeric and underscores";
}

// ── Label / name coupling ──────────────────────────────────────────────
function onLabelUpdate(val) {
  local.label = val;
  if (!nameTouched.value && props.isNew) {
    local.name = slugify(val);
  }
}
function onNameUpdate(val) {
  local.name = val;
  nameTouched.value = true;
}

// ── Actions ────────────────────────────────────────────────────────────
function saveChanges() {
  // canSave is already checked by the disabled state of the button,
  // but guard defensively in case this is called programmatically.
  if (!canSave.value) return;
  emit("save", structuredClone(toRaw(local)));
}

function discardChanges() {
  if (props.isNew) {
    emit("close");
  } else if (props.selectedItem) {
    Object.keys(local).forEach((k) => delete local[k]);
    Object.assign(local, structuredClone(toRaw(props.selectedItem)));
  }
}

function doDelete() {
  confirmDelete.value = false;
  emit("delete");
}

// ── Exposed API (for ProfileEditor's navigation guard) ─────────────────
// Parent uses these to implement "Save & Continue" / "Discard & Continue"
// without needing to replicate logic.
defineExpose({
  /** Whether local edits differ from the committed store value. */
  get isDirty() {
    return isDirty.value;
  },
  /** Whether all blocking validation errors are resolved. */
  get canSave() {
    return canSave.value;
  },
  /**
   * Commit the current local state to the store (via the 'save' emit).
   * Returns false and does nothing if there are blocking errors.
   */
  triggerSave() {
    if (!canSave.value) return false;
    emit("save", structuredClone(toRaw(local)));
    return true;
  },
  /** Revert local state to the last committed value (or close if new). */
  triggerDiscard() {
    discardChanges();
  },
});
</script>

<style scoped>
/* Monospace input for IDs / keys to match choice key styling */
.mono-field :deep(input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Segoe UI Mono', 'Courier New', monospace;
  font-size: 13px;
}

.mono-field :deep(.v-field__outline) {
  /* slightly muted outline to match key styling */
  opacity: 0.9;
}
</style>

<style scoped>
/* Fixed-height header — the dot indicator lives here, so its
   appearance / disappearance never shifts any content below. */
.drawer-header {
  height: 44px;
  flex-shrink: 0;
}

/* The content area scrolls independently of the sticky header/footer. */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
