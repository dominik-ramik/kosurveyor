import { computed, toRaw } from 'vue'
import { getField } from '../plugins/fields/index.js'

/**
 * Centralised validation and dirty-tracking for ConfigDrawer.
 *
 * This is the single source of truth for whether the drawer's local
 * editing state is valid and whether it differs from the committed store value.
 * Sub-components (SelectFieldConfig, NumericFieldConfig, etc.) still render
 * their own inline field-level feedback for UX, but all *blocking* logic lives
 * here so that canSave and isDirty are always computed consistently.
 *
 * To add new validation for a field/group type:
 *   - Add a block inside the appropriate `if (t === 'field')` / `if (t === 'group')` section.
 *   - Push a human-readable string to `errs` for blocking issues, or `warns` for advisory ones.
 *   - No changes needed anywhere else — canSave and the footer error list update automatically.
 *
 * @param {object} opts
 * @param {import('vue').UnwrapNestedRefs<{}>} opts.local
 *   The reactive editing copy maintained by ConfigDrawer. Sub-components mutate
 *   this directly, so all their changes are automatically tracked here.
 * @param {import('vue').Ref<'global'|'group'|'field'>} opts.itemType
 * @param {import('vue').Ref<object|null>} opts.groupContext
 *   The parent group when editing a field (null otherwise).
 * @param {import('vue').Ref<object|null>} opts.selectedItem
 *   The currently committed item from the store (null for brand-new items).
 * @param {import('vue').Ref<boolean>} opts.isNew
 *   True when the drawer is creating a new group/field (not editing an existing one).
 */
export function useDrawerValidation({ local, itemType, groupContext, selectedItem, isNew }) {
  const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/
  const FORM_ID_RE    = /^[a-zA-Z0-9_]+$/

  // ── Blocking errors ────────────────────────────────────────────────────
  // Any entry here disables "Save Changes" and is listed in the footer.
  const errors = computed(() => {
    const errs = []
    const t    = itemType.value

    // ── Global profile settings ──────────────────────────────────────────
    if (t === 'global') {
      if (!local.profile_name?.trim())
        errs.push('Survey profile name is required.')

      if (!local.form_id_stem?.trim())
        errs.push('Form ID stem is required.')
      else if (!FORM_ID_RE.test(local.form_id_stem))
        errs.push('Form ID stem: only letters, numbers, and underscores are allowed.')
    }

    // ── Group ────────────────────────────────────────────────────────────
    if (t === 'group') {
      if (!local.label?.trim())
        errs.push('Group Label is required.')

      if (!local.name?.trim())
        errs.push('Group Name is required.')
      else if (!SNAKE_CASE_RE.test(local.name))
        errs.push('Group Name must be snake_case (start with a lowercase letter; only letters, digits, and underscores).')
    }

    // ── Field (shared + widget-specific) ────────────────────────────────
    if (t === 'field') {
      if (!local.label?.trim())
        errs.push('Field Label is required.')

      if (!local.name?.trim()) {
        errs.push('Field Name is required.')
      } else if (!SNAKE_CASE_RE.test(local.name)) {
        errs.push('Field Name must be snake_case (start with a lowercase letter; only letters, digits, and underscores).')
      } else if (local.name.startsWith('_')) {
        errs.push('Field Name must not start with an underscore.')
      }

      // ── select_one / select_multiple ─────────────────────────────────
      if (local.widget === 'select_one' || local.widget === 'select_multiple') {
        const choices = local.choices || []

        if (choices.length === 0) {
          errs.push('At least one choice must be defined.')
        } else {
          const blankCount = choices.filter(c => !c.value?.trim()).length
          if (blankCount > 0) {
            errs.push(
              `${blankCount} choice${blankCount > 1 ? 's are' : ' is'} missing a key — ` +
              `every choice must have a unique, non-empty key.`
            )
          } else {
            const vals = choices.map(c => c.value)
            if (vals.length !== new Set(vals).size)
              errs.push('Choice keys must be unique — duplicate keys found.')
          }
        }

        // Cascade: filtered_by must reference a preceding cascadable field
        if (local.filtered_by) {
          const gc     = groupContext.value
          const fields = gc?.fields || []
          const preceding = []
          for (const f of fields) {
            if (f.name === local.name) break                   // stop before self
            if (getField(f.widget)?.isCascadable) preceding.push(f.name)
          }
          if (!preceding.includes(local.filtered_by)) {
            errs.push(
              `Cascade filter references "${local.filtered_by}", which no longer exists ` +
              `as a preceding select field in this group.`
            )
          }
        }
      }

      // ── integer / decimal ────────────────────────────────────────────
      if (local.widget === 'integer' || local.widget === 'decimal') {
        const hasMin = local.min_value !== undefined && local.min_value !== null && local.min_value !== ''
        const hasMax = local.max_value !== undefined && local.max_value !== null && local.max_value !== ''
        if (hasMin && hasMax && Number(local.min_value) >= Number(local.max_value))
          errs.push('Minimum value must be strictly less than Maximum value.')
      }

      // ── Add future widget-specific validation blocks here ────────────
    }

    return errs
  })

  // ── Non-blocking warnings ──────────────────────────────────────────────
  // These are shown in the footer but do NOT disable Save.
  // Currently empty — reserved for future advisory checks (e.g. very long labels,
  // hint text missing on a complex field, etc.).
  const warnings = computed(() => {
    // const warns = []
    // if (t === 'field' && !local.hint?.trim() && someCondition) {
    //   warns.push('Consider adding a hint to guide enumerators.')
    // }
    return []
  })

  // Derived — true when all blocking errors are resolved
  const canSave = computed(() => errors.value.length === 0)

  // ── Dirty tracking ─────────────────────────────────────────────────────
  // isDirty is true when there is something meaningful to lose on navigation:
  //   • a new item whose type/widget has been chosen (the user started filling in a form)
  //   • an existing item whose local state differs from the committed store value
  const isDirty = computed(() => {
    const t = itemType.value

    // Type / widget picker screen — nothing committed yet, nothing to lose
    if (isNew.value && t === 'group' && !local.type)   return false
    if (isNew.value && t === 'field' && !local.widget) return false

    // New item beyond the picker — always dirty (uncommitted work in progress)
    if (isNew.value) return true

    // Existing item — compare serialised forms so any property change is caught,
    // including deletions (e.g. clearing `prefilled`) and additions.
    if (!selectedItem.value) return false
    try {
      return JSON.stringify(toRaw(local)) !== JSON.stringify(toRaw(selectedItem.value))
    } catch {
      return false
    }
  })

  return { errors, warnings, canSave, isDirty }
}