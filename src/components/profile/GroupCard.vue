<template>
  <v-card
    class="group-card mb-4"
    :class="{ 'group-card--selected': isSelected }"
    variant="outlined"
    @click.self="$emit('select-group', group)"
  >
    <v-card-title
      class="d-flex align-center py-2"
      @click="$emit('select-group', group)"
    >
      <!-- Type chip: driven entirely by the group plugin -->
      <v-chip
        :color="groupPlugin?.type === 'page' ? 'primary' : 'secondary'"
        size="small"
        class="mr-2"
      >
        <v-icon size="default">{{ groupPlugin?.icon }}</v-icon>
        <span class="ml-2">{{ groupPlugin?.label }}</span>
      </v-chip>

      <span class="text-subtitle-1 font-weight-bold">{{ group.label }}</span>
      <span v-if="showNames" class="text-caption text-grey ml-2">({{ group.name }})</span>

      <v-spacer />

      <StatusChip
        v-for="(chip, i) in chips"
        :key="i"
        v-bind="chip"
        class="mr-1"
      />

      <v-btn icon size="x-small" variant="text" :disabled="!canMoveUp"  @click.stop="$emit('move', 'up')">
        <v-icon size="small">mdi-arrow-up</v-icon>
      </v-btn>
      <v-btn icon size="x-small" variant="text" :disabled="!canMoveDown" @click.stop="$emit('move', 'down')">
        <v-icon size="small">mdi-arrow-down</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text class="pt-0" @click.self="$emit('select-group', group)">
      <FieldSummaryItem
        v-for="(field, idx) in group.fields"
        :key="field.name"
        :field="field"
        :index="idx"
        :is-selected="selectedFieldName === field.name"
        :broken-fields="brokenFields"
        @select="$emit('select-field', $event)"
        @drop="onFieldDrop"
      />

      <v-btn
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        class="mt-2"
        @click="$emit('add-field')"
      >Add Field</v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, toRef } from 'vue'
import { useUiPrefs } from '../../composables/useUiPrefs.js'
import { getGroup } from '../../plugins/groups/index.js'
import { useGroupChips } from '../../composables/useItemChips.js'
import FieldSummaryItem from './FieldSummaryItem.vue'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  group:             { type: Object,  required: true },
  isSelected:        { type: Boolean, default: false },
  selectedFieldName: { type: String,  default: '' },
  brokenFields:      { type: Set,     default: () => new Set() },
  canMoveUp:         { type: Boolean, default: true },
  canMoveDown:       { type: Boolean, default: true },
})

const emit = defineEmits(['select-group', 'select-field', 'add-field', 'move', 'reorder-field'])

const groupPlugin = computed(() => getGroup(props.group.type))
const chips       = useGroupChips(toRef(props, 'group'))

const { showNames } = useUiPrefs()

function onFieldDrop({ from, to }) {
  emit('reorder-field', { from, to })
}
</script>

<style scoped>
.group-card {
  transition: border-color 0.15s;
}
.group-card--selected {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}
</style>