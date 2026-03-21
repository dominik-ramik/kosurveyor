const SHARED_GROUP_HINTS = {
  label:
    'The group heading displayed in the form and used in data exports.',
  name:
    'Internal group identifier. Appears as a prefix in field paths in exported submissions. ' +
    'Must be snake_case and unique within the profile.',
}

export function defineGroup(overrides) {
  return {
    type: null,
    label: null,
    icon: null,
    description: null,

    defaultProps: {},

    configComponent: null,

    hints: SHARED_GROUP_HINTS,

    getSummaryBadges(group) {
      return []
    },

    generateSurveyRows(group, ctx, helpers) {
      throw new Error(`generateSurveyRows not implemented for group type: ${this.type}`)
    },

    generateTemplateSheet(group, wb, helpers) {},

    validateTemplateSheet(group, ws, rawData, helpers) {
      return { errors: [], warnings: [], parsedResult: null }
    },

    ...overrides,

    // Always merge — plugin-specific hints extend shared ones.
    hints: { ...SHARED_GROUP_HINTS, ...(overrides.hints ?? {}) },
  }
}