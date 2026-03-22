/**
 * Translates an XPath relevant expression into a human-readable string.
 *
 * @param {string} xpath
 * @param {Map<string, {label: string, groupLabel: string}>} nameMap
 * @returns {string}
 */
export function relevantToLabel(xpath, nameMap) {
  if (!xpath || !xpath.trim()) return 'Always shown'

  let result = xpath

    try{

  // Pass 1 — structural pattern replacement (before generic ${name} substitution)
  // not(selected(...)) must come before selected(...)
  result = result.replace(
    /not\(selected\(\$\{([^}]+)\},\s*'([^']*)'\)\)/g,
    (_, name, value) => {
      const entry = nameMap.get(name)
      const label = entry ? entry.label : '${' + name + '}'
      return `"${label}" excludes "${value}"`
    },
  )
  result = result.replace(
    /selected\(\$\{([^}]+)\},\s*'([^']*)'\)/g,
    (_, name, value) => {
      const entry = nameMap.get(name)
      const label = entry ? entry.label : '${' + name + '}'
      return `"${label}" includes "${value}"`
    },
  )

  // Pass 2 — replace remaining ${name} tokens with labels
  result = result.replace(/\$\{([^}]+)\}/g, (match, name) => {
    const entry = nameMap.get(name)
    return "<b>" + (entry ? entry.label : match) + "</b>"
  })

  // Pass 3 — operator substitution
  result = result.replace(/ = ''/g, ' is empty')
  result = result.replace(/ != ''/g, ' is not empty')
  result = result.replace(/ = '([^']*)'/g, ' equals "$1"')
  result = result.replace(/ != '([^']*)'/g, ' is not "$1"')
  result = result.replace(/ >= /g, ' is at least ')
  result = result.replace(/ <= /g, ' is at most ')
  result = result.replace(/ > /g, ' is greater than ')
  result = result.replace(/ < /g, ' is less than ')
  result = result.replace(/ and /g, ' AND ')
  result = result.replace(/ or /g, ' OR ')

  return result.trim()

}
catch(e){
return xpath

}
}

/**
 * Attempts to parse a raw XPath string into structured builder rows.
 * Returns null if the expression is too complex to represent in the builder.
 *
 * @param {string} xpath
 * @returns {{ rows: Array<{fieldName: string, operator: string, value: string}>, combinator: 'and'|'or' } | null}
 */
export function parseRelevantToBuilder(xpath) {
  if (!xpath || !xpath.trim()) return null

  const trimmed = xpath.trim()

  // Determine combinator — check for mixed usage
  const hasAnd = / and /i.test(trimmed)
  const hasOr = / or /i.test(trimmed)
  if (hasAnd && hasOr) return null

  const combinator = hasOr ? 'or' : 'and'
  const separator = hasOr ? ' or ' : ' and '

  const atoms = trimmed.split(separator)
  const rows = []

  for (const raw of atoms) {
    const atom = raw.trim()
    const row = parseAtom(atom)
    if (!row) return null
    rows.push(row)
  }

  if (rows.length === 0) return null
  return { rows, combinator }
}

/**
 * Parse a single condition atom into a builder row.
 * @param {string} atom
 * @returns {{fieldName: string, operator: string, value: string} | null}
 */
function parseAtom(atom) {
  let m

  // not(selected(${name}, 'value'))
  m = atom.match(/^not\(selected\(\$\{([^}]+)\},\s*'([^']*)'\)\)$/)
  if (m) return { fieldName: m[1], operator: 'not_selected', value: m[2] }

  // selected(${name}, 'value')
  m = atom.match(/^selected\(\$\{([^}]+)\},\s*'([^']*)'\)$/)
  if (m) return { fieldName: m[1], operator: 'selected', value: m[2] }

  // ${name} = ''
  m = atom.match(/^\$\{([^}]+)\} = ''$/)
  if (m) return { fieldName: m[1], operator: 'is_empty', value: '' }

  // ${name} != ''
  m = atom.match(/^\$\{([^}]+)\} != ''$/)
  if (m) return { fieldName: m[1], operator: 'is_not_empty', value: '' }

  // ${name} = 'value' (string equality)
  m = atom.match(/^\$\{([^}]+)\} = '([^']*)'$/)
  if (m) return { fieldName: m[1], operator: 'eq', value: m[2] }

  // ${name} != 'value' (string inequality)
  m = atom.match(/^\$\{([^}]+)\} != '([^']*)'$/)
  if (m) return { fieldName: m[1], operator: 'neq', value: m[2] }

  // ${name} >= n
  m = atom.match(/^\$\{([^}]+)\} >= (.+)$/)
  if (m) return { fieldName: m[1], operator: 'gte', value: m[2].trim() }

  // ${name} <= n
  m = atom.match(/^\$\{([^}]+)\} <= (.+)$/)
  if (m) return { fieldName: m[1], operator: 'lte', value: m[2].trim() }

  // ${name} > n
  m = atom.match(/^\$\{([^}]+)\} > (.+)$/)
  if (m) return { fieldName: m[1], operator: 'gt', value: m[2].trim() }

  // ${name} < n
  m = atom.match(/^\$\{([^}]+)\} < (.+)$/)
  if (m) return { fieldName: m[1], operator: 'lt', value: m[2].trim() }

  // ${name} = n (numeric equality — no quotes)
  m = atom.match(/^\$\{([^}]+)\} = ([^'].+)$/)
  if (m) return { fieldName: m[1], operator: 'eq', value: m[2].trim() }

  // ${name} != n (numeric inequality — no quotes)
  m = atom.match(/^\$\{([^}]+)\} != ([^'].+)$/)
  if (m) return { fieldName: m[1], operator: 'neq', value: m[2].trim() }

  return null
}
