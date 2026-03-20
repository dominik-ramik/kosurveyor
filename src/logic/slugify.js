/**
 * Converts a human-readable string to a snake_case identifier suitable for
 * XLSForm field names, group names, choice keys, and form ID stems.
 *
 * Rules applied:
 *  - Lowercased
 *  - Runs of non-alphanumeric / non-underscore characters replaced with "_"
 *  - Leading and trailing underscores stripped
 *  - Identifiers that would start with a digit are prefixed with "f_"
 */
export function slugify(str) {
  // Normalize Unicode to decompose accented characters, then remove diacritics
  const normalized = (str || '').normalize('NFKD').replace(/\p{M}/gu, '')
  let snake = normalized
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (/^[0-9]/.test(snake)) snake = 'f_' + snake
  return snake
}
