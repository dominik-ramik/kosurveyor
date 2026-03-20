import text from './text.js'
import integer from './integer.js'
import decimal from './decimal.js'
import date from './date.js'
import datetime from './datetime.js'
import time from './time.js'
import gps from './gps.js'
import select_one from './select_one.js'
import select_multiple from './select_multiple.js'
import image from './image.js'
import audio from './audio.js'
import label from './label.js'

const registry = new Map()
;[text, integer, decimal, date, datetime, time, gps, select_one, select_multiple, image, audio, label].forEach(p => registry.set(p.type, p))

export const getField = (type) => registry.get(type) ?? null
export const getAllFields = () => [...registry.values()]
