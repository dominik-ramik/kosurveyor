import { computed } from 'vue'
import { getField } from '../plugins/fields/index.js'
import { getGroup } from '../plugins/groups/index.js'

/**
 * Returns a computed containing the fully merged hints object for a field plugin.
 * Shared hints (from defineField) are already merged inside the plugin;
 * this composable is just a thin typed accessor.
 *
 * @param {import('vue').Ref<string>} widgetRef  — reactive ref to local.widget
 */
export function useFieldHints(widgetRef) {
  return computed(() => getField(widgetRef.value)?.hints ?? {})
}

/**
 * Returns a computed containing the fully merged hints object for a group plugin.
 *
 * @param {import('vue').Ref<string>} typeRef  — reactive ref to local.type
 */
export function useGroupHints(typeRef) {
  return computed(() => getGroup(typeRef.value)?.hints ?? {})
}