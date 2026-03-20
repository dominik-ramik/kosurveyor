<template>
  <v-navigation-drawer
    location="right"
    :width="500"
    :model-value="true"
    permanent
  >
    <div class="pa-4 mt-4">
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

      <template v-else-if="itemType === 'global'">
        <v-text-field
          v-model="local.profile_name"
          label="Profile Name"
          :rules="[requiredRule]"
          density="compact"
          variant="outlined"
          class="mb-3"
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
        <v-text-field
          v-model="local.form_id_stem"
          label="Form ID Stem"
          :rules="[requiredRule, formIdRule]"
          density="compact"
          variant="outlined"
          class="mb-3"
        />
      </template>

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
          class="mb-3"
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
          class="mb-3"
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
            <strong>Readonly:</strong> Displays fixed, uneditable data from your
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

      <template v-else>
        <div class="d-flex flex-column align-center justify-center text-center pa-6" style="height: 100%; min-height: 240px;">
          <v-icon size="56" color="grey-lighten-1" class="mb-4">mdi-cursor-pointer</v-icon>
          <div class="text-body-1 text-grey-darken-1 font-weight-medium mb-2">Nothing selected</div>
          <div class="text-body-2 text-grey">Click a field, group, or the profile header in the editor to view and edit its settings.</div>
        </div>
      </template>
    </div>

    <v-divider />

    <div
      class="pa-4"
      v-if="(selectedItem || isNew) && (
        !isNew ||
        (itemType === 'group' && local.type) ||
        (itemType === 'field' && local.widget)
      )"
    >
      <div>
        <v-alert v-if="saveError" type="error" density="compact" class="mb-2">
          {{ saveError }}
        </v-alert>
      </div>
      <div class="d-flex ga-2">
        <v-btn color="primary" variant="tonal" :disabled="!canSave" @click="saveChanges"
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
      </div>

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
            <v-btn color="error" variant="tonal" @click="doDelete"
              >Delete</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, reactive, computed, watch, toRaw } from "vue";
import { getAllFields, getField } from "../../plugins/fields/index.js";
import { getAllGroups, getGroup } from "../../plugins/groups/index.js";
import { slugify } from "../../logic/slugify.js";
import SelectFieldConfig from "./fieldConfig/SelectFieldConfig.vue";
import ImageFieldConfig from "./fieldConfig/ImageFieldConfig.vue";

const props = defineProps({
  selectedItem: { type: Object, default: null },
  itemType: { type: String, default: "" }, // 'global' | 'group' | 'field'
  groupContext: { type: Object, default: null }, // The group this field belongs to (for field items)
  allGroups: { type: Array, default: () => [] },
  isNew: { type: Boolean, default: false }, // Tracks initialization vs edit mode
});

const emit = defineEmits(["save", "close", "show-help", "delete"]);

const local = reactive({});
const confirmDelete = ref(false);
const nameTouched = ref(false);
const saveError = ref("");

watch(
  () => props.selectedItem,
  (newVal) => {
    if (newVal) {
      Object.keys(local).forEach((k) => delete local[k]);
      Object.assign(local, structuredClone(toRaw(newVal)));
      nameTouched.value = !props.isNew; // Reset tracking if it's a completely new item
      saveError.value = '';
    }
  },
  { immediate: true, deep: true },
);

const drawerTitle = computed(() => {
  if (props.isNew && props.itemType === "group" && !local.type)
    return "Add Group";
  if (props.isNew && props.itemType === "field" && !local.widget)
    return "Add Field";
  if (props.isNew)
    return `New ${props.itemType === "group" ? "Group" : "Field"}`;

  if (props.itemType === "global") return "Profile Settings";
  if (props.itemType === "group")
    return `Group: ${local.label || local.name || ""}`;
  if (props.itemType === "field")
    return `Field: ${local.label || local.name || ""}`;
  return "Details";
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
    if (val === "none") {
      delete local.prefilled; // Removes the key entirely from the profile
    } else {
      local.prefilled = val;
    }
  },
});

const prefilledOptions = computed(() => {
  const opts = [
    { title: "None", value: "none" }, // Changed from undefined
    { title: "Readonly", value: "readonly" },
  ];
  const plugin = getField(local.widget);
  if (plugin && plugin.supportsEditablePrefill) {
    opts.push({ title: "Editable", value: "editable" });
  }
  return opts;
});

const isFreeOptionForced = computed(() => {
  if (props.itemType !== "group" || local.type !== "repeat") return false;
  const fields = props.selectedItem?.fields || [];
  return !fields.some(
    (f) => f.prefilled === "readonly" || f.prefilled === "editable",
  );
});

// Shared Label & Name interaction logic
function onLabelUpdate(val) {
  local.label = val;
  if (!nameTouched.value && props.isNew) {
    local.name = slugify(val);
  }
}

function onNameUpdate(val) {
  local.name = val;
  nameTouched.value = true; // Once modified manually, detach from auto-fill behaviour
}

// Validation rules
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

const canSave = computed(() => {
  if (props.itemType === 'global') {
    return !!local.profile_name && !!local.form_id_stem && formIdRule(local.form_id_stem) === true
  }
  if (props.itemType === 'group') {
    return !!local.label && !!local.name && snakeCaseRule(local.name) === true
  }
  if (props.itemType === 'field') {
    return (
      !!local.label &&
      !!local.name &&
      snakeCaseRule(local.name) === true &&
      noLeadingUnderscoreRule(local.name) === true
    )
  }
  return true
})

function doDelete() {
  confirmDelete.value = false;
  emit("delete");
}

function saveChanges() {
  // Reset previous error
  saveError.value = "";

  // Prevent saving a newly-created field without a valid non-empty name and label
  if (props.isNew && props.itemType === "field") {
    const labelOk = requiredRule(local.label) === true;
    const nameRequiredOk = requiredRule(local.name) === true;
    const nameSnakeOk = snakeCaseRule(local.name) === true;
    const nameNoUnderscoreOk = noLeadingUnderscoreRule(local.name) === true;
    const problems = [];
    if (!labelOk) problems.push("Field label is required.");
    if (!nameRequiredOk) problems.push("Field name is required.");
    else if (!nameSnakeOk)
      problems.push("Field name must be snake_case and start with a letter.");
    else if (!nameNoUnderscoreOk)
      problems.push("Field name must not start with an underscore.");

    if (problems.length > 0) {
      saveError.value = problems.join(" ");
      return;
    }
  }

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
</script>
