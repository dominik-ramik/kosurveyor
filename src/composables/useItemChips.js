import { computed } from 'vue'
import { getGroup } from '../plugins/groups/index.js'

// Shared descriptor shape: { icon, label?, color, title }
// `label` is optional short text shown beside the icon.
// `title` is always the full tooltip shown on hover.

const CONDITIONAL_CHIP = {
  icon:  'mdi-eye-off-outline',
  color: 'deep-purple',
  title: 'Only shown conditionally',
}

/**
 * Returns a computed array of chip descriptors for a field row.
 * @param {import('vue').Ref<object>}  fieldRef
 * @param {import('vue').Ref<Set>}     brokenFieldsRef
 */
export function useFieldChips(fieldRef, brokenFieldsRef) {
  return computed(() => {
    const field = fieldRef.value
    const chips = []

    if (field.relevant)
      chips.push(CONDITIONAL_CHIP)

    if (field.prefilled === 'readonly')
      chips.push({ icon: 'mdi-pencil-off-outline',        color: 'orange', title: 'Read-only prefill' })
    else if (field.prefilled === 'editable')
      chips.push({ icon: 'mdi-pencil-lock-outline',  color: 'blue',   title: 'Editable prefill' })

    if (brokenFieldsRef.value.has(field.name))
      chips.push({ icon: 'mdi-alert', label: 'Filter broken', color: 'error', title: 'Cascade filter references a field that no longer exists' })

    return chips
  })
}

/**
 * Returns a computed array of chip descriptors for a group header.
 * Merges the conditional-visibility chip with whatever the group plugin declares.
 * @param {import('vue').Ref<object>} groupRef
 */
export function useGroupChips(groupRef) {
  return computed(() => {
    const group = groupRef.value
    const chips = []

    if (group.relevant)
      chips.push(CONDITIONAL_CHIP)

    const plugin = getGroup(group.type)
    if (plugin) {
      for (const badge of plugin.getSummaryBadges(group)) {
        chips.push({
          icon:  badge.icon  || 'mdi-information-outline',
          label: badge.label || '',
          color: badge.color || 'primary',
          title: badge.label || '',
        })
      }
    }

    return chips
  })
}