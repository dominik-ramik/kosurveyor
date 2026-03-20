import page from './page.js'
import repeat from './repeat.js'

const registry = new Map()
;[page, repeat].forEach(p => registry.set(p.type, p))

export const getGroup = (type) => registry.get(type) ?? null
export const getAllGroups = () => [...registry.values()]
