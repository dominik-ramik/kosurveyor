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

    <DrawerField
      v-if="!isFreeOptionForced"
      label="Free-format survey"
      :hint="hints.free_option"
    >
      <v-switch
        v-model="local.free_option"
        color="primary"
        density="compact"
        class="ml-1"
        hide-details
      />
    </DrawerField>

    <div v-if="isFreeOptionForced" class="text-caption text-grey mb-4">
      Free-format survey always on — no prefilled fields in this group.
    </div>

    <DrawerField
      v-if="isFreeOptionForced || local.free_option"
      label="Free entries limit"
      :hint="hints.free_entries_limit"
    >
      <v-text-field
        v-model.number="local.max_repeat"
        type="number"
        density="compact"
        variant="outlined"
        placeholder="Unlimited"
        :rules="[minOneRule]"
        hide-details="auto"
      />
    </DrawerField>
  </DrawerSection>
</template>

<script setup>
import { computed } from 'vue'
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

function minOneRule(v) {
  if (v === null || v === undefined || v === '') return true
  return Number(v) >= 1 || 'Must be 1 or higher'
}
</script>