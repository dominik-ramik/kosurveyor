export function defineGroup(overrides) {
  return {
    type: null,
    label: null,
    icon: null,
    description: null,

    defaultProps: {},

    configComponent: null,

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
  }
}
