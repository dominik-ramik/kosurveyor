<template>
<DrawerSection title="Repeat options">

    <DrawerField label="Sub-surveys" :hint="hints.sub_surveys">
      <v-switch
        v-model="local.sub_surveys"
        color="primary"
        density="compact"
        class="ml-1"
        hide-details
      />
    </DrawerField>

    <DrawerField label="Free-format survey" :hint="hints.free_option">
      <div class="d-flex align-center ga-3 flex-wrap">

        <!-- Forced state -->
        <template v-if="isFreeOptionForced">
          <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-lock" label>
            Always on
          </v-chip>
          <span class="text-caption text-medium-emphasis">No prefilled fields in this group</span>
        </template>

        <!-- User-controlled -->
        <v-switch
          v-else
          v-model="local.free_option"
          color="primary"
          density="compact"
          class="ml-1 flex-shrink-0"
          hide-details
        />

        <!-- Limit toggle + input — shown whenever free option is active -->
        <template v-if="isFreeOptionForced || local.free_option">
          <v-btn-toggle
            :model-value="limitMode"
            mandatory
            density="compact"
            color="primary"
            variant="outlined"
            divided
            class="flex-shrink-0"
            :class="isFreeOptionForced ? 'ml-0' : 'ml-4'"
            @update:model-value="setLimitMode"
          >
            <v-btn value="unlimited" size="small">Unlimited entries</v-btn>
            <v-btn value="limited" size="small">Limited</v-btn>
          </v-btn-toggle>

          <template v-if="limitMode === 'limited'">
            <v-text-field
              v-model.number="local.max_repeat"
              type="number"
              density="compact"
              variant="outlined"
              hide-details="auto"
              :rules="[minOneRule]"
              style="max-width: 72px"
              class="flex-shrink-0"
            />
          </template>
        </template>

      </div>
    </DrawerField>

  </DrawerSection>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import DrawerSection from '../DrawerSection.vue'
import DrawerField from '../DrawerField.vue'

const props = defineProps({
  local:        { type: Object, required: true },
  selectedItem: { type: Object, default: null },
  hints:        { type: Object, default: () => ({}) },
})

// Free-format is forced when no fields in the saved group have prefill set.
// Uses selectedItem (the committed store value) so it reflects the actual
// saved field states, not any unsaved edits to local.
const isFreeOptionForced = computed(() => {
  const fields = props.selectedItem?.fields || []
  return !fields.some(f => f.prefilled === 'readonly' || f.prefilled === 'editable')
})

// Independent ref so the toggle stays on "limited" while the input is still
// empty — matching the pattern in NumericFieldConfig and SelectFieldConfig.
const isLimited = ref(
  props.local.max_repeat !== null && props.local.max_repeat !== undefined
)

// Re-sync when a different group is loaded
watch(() => props.local.name, () => {
  isLimited.value =
    props.local.max_repeat !== null && props.local.max_repeat !== undefined
})

const limitMode = computed(() => isLimited.value ? 'limited' : 'unlimited')

function setLimitMode(val) {
  isLimited.value = val === 'limited'
  if (val === 'unlimited') delete props.local.max_repeat
}

function minOneRule(v) {
  if (v === null || v === undefined || v === '') return true
  return Number(v) >= 1 || 'Must be 1 or higher'
}
</script>