import { computed } from 'vue'
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
 *   Used only for uniqueness checks — NOT for dirty tracking.
 * @param {import('vue').Ref<object|null>} opts.savedSnapshot
 *   A plain-object snapshot of selectedItem taken at the moment the drawer
 *   opened (or when selectedItem's reference last changed). This is exactly
 *   what discardChanges() reverts to, so isDirty compares local against it.
 *   Using a snapshot rather than the live selectedItem ref means in-place
 *   store mutations (e.g. fields being added to a group while its settings
 *   panel is open) do not corrupt the dirty baseline.
 * @param {import('vue').Ref<boolean>} opts.isNew
 *   True when the drawer is creating a new group/field (not editing an existing one).
 */
export function useDrawerValidation({ local, itemType, groupContext, selectedItem, savedSnapshot, isNew, allGroups, profileFormIdStem }) {
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

        // Uniqueness within the same group: no two fields in the same group
        // may share the same name (ignore the currently-edited field when present).
        try {
          const gc = groupContext?.value
          const fieldsInGroup = gc?.fields || []
          for (const f of fieldsInGroup) {
            if (f === selectedItem?.value) continue // ignore self when editing
            if (f.name === local.name) {
              errs.push(`Field Name "${local.name}" is already used in this group. Field names must be unique within a group.`)
              throw new Error('dup-found')
            }
          }
        } catch (e) {
          if (e.message !== 'dup-found') throw e
        }

        // Global uniqueness: field name must not appear in any other group
        try {
          const groups = (allGroups?.value) || []
          const currentGroupName = groupContext?.value?.name
          for (const g of groups) {
            if (g.name === currentGroupName) continue // ignore same group
            if (!g.fields) continue
            for (const f of g.fields) {
              if (f.name === local.name) {
                errs.push(
                  `Field Name "${local.name}" is already used in group "${g.label || g.name}". Field names must be unique across groups.`
                )
                // stop after first match
                throw new Error('dup-found')
              }
            }
          }
        } catch (e) {
          if (e.message !== 'dup-found') throw e
        }

        // Collision with profile form id stem (disallow exact matches)
        const stem = profileFormIdStem?.value
        if (stem && local.name === stem) {
          errs.push(`Field Name must not collide with the form ID stem "${stem}".`)
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

      // ── numeric constraints ───────────────────────────────────────────
      if (getField(local.widget)?.hasNumericConstraints) {
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
  //   • an existing item whose local state differs from the savedSnapshot
  //
  // We compare against savedSnapshot (a plain POJO captured when selectedItem's
  // reference last changed) rather than the live selectedItem ref. This prevents
  // in-place store mutations — such as fields being added to a group while its
  // settings panel is open — from silently shifting the dirty baseline and
  // producing incorrect true/false results.
  //
  // savedSnapshot is exactly what discardChanges() reverts local to, so the
  // invariant "isDirty ↔ Discard would change something" always holds.
  const isDirty = computed(() => {
    const t = itemType.value

    // Type / widget picker screen — nothing committed yet, nothing to lose
    if (isNew.value && t === 'group' && !local.type)   return false
    if (isNew.value && t === 'field' && !local.widget) return false

    // New item beyond the picker — always dirty (uncommitted work in progress)
    if (isNew.value) return true

    // Existing item — compare against the snapshot taken when the item was
    // first loaded. Both sides are plain objects so JSON.stringify is reliable.
    const snapshot = savedSnapshot?.value
    if (!snapshot) return false
    try {
      // JSON.stringify(local) reads every property through the reactive proxy,
      // registering them as dependencies so the computed re-evaluates on any change.
      // toRaw() would bypass the proxy and break reactivity tracking entirely.
      return JSON.stringify(local) !== JSON.stringify(snapshot)
    } catch {
      return false
    }
  })

  return { errors, warnings, canSave, isDirty }
}