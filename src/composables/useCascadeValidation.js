import { computed } from 'vue'
import { getField } from '../plugins/fields/index.js'

export function useCascadeValidation(profilesStore) {
  const brokenFields = computed(() => {
    const broken = new Set()
    const profile = profilesStore.activeProfile
    if (!profile || !profile.groups) return broken

    for (const group of profile.groups) {
      if (!group.fields) continue
      // Use an array so we can look up parent field objects for choice validation
      const precedingSelectFields = []

      for (const field of group.fields) {
        if (field.filtered_by) {
          const parentField = precedingSelectFields.find(
            (f) => f.name === field.filtered_by
          )
          if (!parentField) {
            // Parent field no longer exists or is not a preceding cascadable field
            broken.add(field.name)
          } else {
            // Parent exists — also check that all non-empty filter_value entries
            // on this child still match a defined choice value on the parent
            const validParentValues = new Set(
              (parentField.choices || [])
                .map((c) => c.value)
                .filter(Boolean)
            )
            if (validParentValues.size > 0) {
              const hasOrphan = (field.choices || []).some(
                (c) => c.filter_value && !validParentValues.has(c.filter_value)
              )
              if (hasOrphan) broken.add(field.name)
            }
          }
        }
        if (getField(field.widget)?.isCascadable) {
          precedingSelectFields.push(field)
        }
      }
    }

    return broken
  })

  return { brokenFields }
}
