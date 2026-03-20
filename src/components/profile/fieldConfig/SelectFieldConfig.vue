<template>
  <div>
    <ChoiceBuilder
      v-model="local.choices"
      :dependent-child-names="childFieldNames"
      :locked-choice-values="lockedChoiceValues"
      :parent-choices="parentFieldChoices"
    />

    <div v-if="groupContext">
      <v-select
        v-if="availableParentSelectFields.length > 0"
        v-model="local.filtered_by"
        :items="availableParentSelectFields"
        label="Filtered By"
        density="compact"
        variant="outlined"
        clearable
        class="mt-3 mb-3"
      />
      <v-alert
        v-else
        type="info"
        density="compact"
        class="mb-3 mt-3"
      >
        The "Filtered By" option will appear when there is a preceding select field in this group to filter by.
      </v-alert>
    </div>
    <v-alert
      v-if="local.filtered_by && !isFilteredByValid"
      type="warning"
      density="compact"
      class="mb-3"
    >
      The referenced parent field is no longer valid.
    </v-alert>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getField } from '../../../plugins/fields/index.js'
import ChoiceBuilder from '../ChoiceBuilder.vue'

const props = defineProps({
  local: { type: Object, required: true },
  groupContext: { type: Object, default: null },
})

const childFieldNames = computed(() => {
  const groupFields = props.groupContext?.fields || []
  return groupFields.filter((f) => f.filtered_by === props.local.name).map((f) => f.name)
})

const lockedChoiceValues = computed(() => {
  const groupFields = props.groupContext?.fields || []
  const childFields = groupFields.filter((f) => f.filtered_by === props.local.name)
  const usedValues = new Set()
  for (const child of childFields) {
    for (const choice of (child.choices || [])) {
      if (choice.filter_value) usedValues.add(choice.filter_value)
    }
  }
  return [...usedValues]
})

const parentFieldChoices = computed(() => {
  if (!props.local.filtered_by || !props.groupContext) return []
  const parent = (props.groupContext.fields || []).find((f) => f.name === props.local.filtered_by)
  return parent?.choices || []
})

const availableParentSelectFields = computed(() => {
  if (!props.groupContext) return []
  const fields = props.groupContext.fields || []
  const result = []
  for (const f of fields) {
    if (f.name === props.local.name) break
    if (getField(f.widget)?.isCascadable) {
      result.push(f.name)
    }
  }
  return result
})

const isFilteredByValid = computed(() => {
  if (!props.local.filtered_by) return true
  return availableParentSelectFields.value.includes(props.local.filtered_by)
})
</script>
