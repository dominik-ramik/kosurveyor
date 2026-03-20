import { computed } from 'vue'
import { getField } from '../plugins/fields/index.js'

/**
 * Tracks broken cascade filter references in the active profile.
 * Returns a computed Set of field names whose `filtered_by` reference
 * points to a parent that no longer exists or is no longer a select field.
 */
export function useCascadeValidation(profilesStore) {
  const brokenFields = computed(() => {
    const broken = new Set()
    const profile = profilesStore.activeProfile
    if (!profile || !profile.groups) return broken

    for (const group of profile.groups) {
      if (!group.fields) continue
      const precedingSelects = new Set()
      for (const field of group.fields) {
        if (field.filtered_by) {
          // Check if parent exists as a preceding select field in this group
          if (!precedingSelects.has(field.filtered_by)) {
            broken.add(field.name)
          }
        }
        if (getField(field.widget)?.isCascadable) {
          precedingSelects.add(field.name)
        }
      }
    }

    return broken
  })

  return { brokenFields }
}
