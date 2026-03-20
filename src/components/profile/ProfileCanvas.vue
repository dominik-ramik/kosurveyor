<template>
  <v-container>
    <GlobalSettingsWidget
      :profile="profilesStore.activeProfile"
      :is-selected="selectionType === 'global'"
      @select="selectGlobal"
    />

    <GroupCard
      v-for="(group, idx) in groups"
      :key="group.name"
      :group="group"
      :is-selected="selectionType === 'group' && selectedGroupName === group.name"
      :selected-field-name="selectionType === 'field' && selectedGroupName === group.name ? selectedFieldName : ''"
      :broken-fields="brokenFieldsForGroup(group)"
      :can-move-up="idx > 0"
      :can-move-down="idx < groups.length - 1"
      @select-group="selectGroup(group)"
      @select-field="selectField(group, $event)"
      @add-field="$emit('init-add-field', group)"
      @move="(dir) => profilesStore.moveGroup(group.name, dir)"
      @reorder-field="(payload) => onReorderField(group, payload)"
    />

    <div class="d-flex align-center mt-4">
      <v-btn
        variant="tonal"
        color="primary"
        prepend-icon="mdi-plus"
        @click="$emit('init-add-group')"
      >
        Add Group
      </v-btn>
      <v-spacer />
      <v-switch
        v-model="showNames"
        density="compact"
        color="primary"
        hide-details
        class="ml-2"
      >
        <template #label>
          <span class="text-body-small">Show names alongside labels</span>
        </template>
      </v-switch>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProfilesStore } from '../../stores/profiles.js'
import { useCascadeValidation } from '../../composables/useCascadeValidation.js'
import GlobalSettingsWidget from './GlobalSettingsWidget.vue'
import GroupCard from './GroupCard.vue'
import { useUiPrefs } from '../../composables/useUiPrefs.js'

const profilesStore = useProfilesStore()
const { brokenFields } = useCascadeValidation(profilesStore)

const emit = defineEmits(['select-item', 'init-add-group', 'init-add-field'])

const selectionType = ref('') // 'global' | 'group' | 'field'
const selectedGroupName = ref('')
const selectedFieldName = ref('')

const groups = computed(() => profilesStore.activeProfile?.groups || [])

const { showNames } = useUiPrefs()

function brokenFieldsForGroup(group) {
  const result = new Set()
  for (const f of group.fields || []) {
    if (brokenFields.value.has(f.name)) {
      result.add(f.name)
    }
  }
  return result
}

function selectGlobal() {
  selectionType.value = 'global'
  selectedGroupName.value = ''
  selectedFieldName.value = ''
  emit('select-item', {
    type: 'global',
    item: profilesStore.activeProfile,
    group: null,
  })
}

function selectGroup(group) {
  selectionType.value = 'group'
  selectedGroupName.value = group.name
  selectedFieldName.value = ''
  emit('select-item', {
    type: 'group',
    item: group,
    group: null,
  })
}

function selectField(group, field) {
  selectionType.value = 'field'
  selectedGroupName.value = group.name
  selectedFieldName.value = field.name
  emit('select-item', {
    type: 'field',
    item: field,
    group,
  })
}

function onReorderField(group, { from, to }) {
  if (from === to) return
  const fields = group.fields
  const item = fields.splice(from, 1)[0]
  fields.splice(to, 0, item)
}
</script>