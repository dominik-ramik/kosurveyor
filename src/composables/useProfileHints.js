import { computed } from 'vue'

/**
 * Hints for the global survey profile settings form.
 * Returns a computed object with hint text for each profile field.
 */
export function useProfileHints() {
  return computed(() => ({
    profile_name:
      'A human-friendly name for this survey profile. Shown in the KoboToolbox project name.',
    form_id_stem:
      'It becomes the id_string of the deployed form — the unique machine identifier KoboToolbox uses to distinguish forms in its API, submission URLs, and data exports. Only alphanumeric characters and underscores are allowed.',
    profile_description:
      'Optional description included in form metadata and documentation.',
    profile_author: 'Author or organisation name.',
  }))
}
