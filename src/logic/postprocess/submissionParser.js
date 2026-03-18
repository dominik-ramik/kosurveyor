const EXTRA_METADATA_KEYS = new Set(['formhub/uuid'])
const DISCARD_SUBSTRING = '_COLLECTOR_NODATA_'
const FREE_SURVEY_SUFFIX = '_FREE_SURVEY_'

function isMetadataKey(key) {
  // Catch keys starting with _, meta/, or explicitly defined in the set
  return key.startsWith('_') || key.startsWith('meta/') || EXTRA_METADATA_KEYS.has(key)
}

function shouldDiscard(key) {
  return key.includes(DISCARD_SUBSTRING)
}

function zeroPad(num, width) {
  return String(num).padStart(width, '0')
}

function formatValue(val) {
  if (val === undefined) return undefined
  if (val === null || typeof val !== 'object') return val
  return JSON.stringify(val)
}

function stripKeyPath(fullKey, groupPath) {
  if (fullKey.startsWith(groupPath + '/')) {
    return fullKey.slice(groupPath.length + 1)
  }
  return fullKey
}

function detectKeysAtLevel(rowArrays) {
  const repeatSet = new Set()
  const allKeys = []
  const seen = new Set()

  for (const rows of rowArrays) {
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (shouldDiscard(key)) continue
        if (!seen.has(key)) {
          seen.add(key)
          allKeys.push(key)
        }
        if (Array.isArray(row[key])) {
          repeatSet.add(key)
        }
      }
    }
  }

  return {
    scalarKeys: allKeys.filter((k) => !repeatSet.has(k)),
    repeatKeys: allKeys.filter((k) => repeatSet.has(k))
  }
}

function buildAttachmentMap(submission) {
  const attachments = submission._attachments
  if (!Array.isArray(attachments)) return new Map()
  const map = new Map()
  for (const att of attachments) {
    if (att.is_deleted) continue
    const filename = att.filename || ''
    const basename = filename.split('/').pop()
    if (basename) {
      map.set(basename, {
        download_url: att.download_url,
        mimetype: att.mimetype || ''
      })
    }
  }
  return map
}

function classifyMimeType(mimetype) {
  if (mimetype.startsWith('image/')) return 'photos'
  if (mimetype.startsWith('audio/')) return 'audio'
  return 'other'
}

function buildRepeatSheetColumns(groupKey, allRowArrays) {
  const { scalarKeys, repeatKeys } = detectKeysAtLevel(allRowArrays)
  const groupName = groupKey.split('/').pop() || groupKey
  const idxCol = groupName + '_idx'
  const strippedScalar = scalarKeys.map((k) => stripKeyPath(k, groupKey))

  const cols = ['session_id', idxCol, ...strippedScalar]

  for (const nk of repeatKeys) {
    const nestedArrays = []
    for (const rows of allRowArrays) {
      for (const row of rows) {
        if (Array.isArray(row[nk])) {
          nestedArrays.push(row[nk])
        }
      }
    }
    cols.push(...buildNestedColumns(nk, nestedArrays))
  }

  return cols
}

function buildNestedColumns(groupKey, allRowArrays) {
  const { scalarKeys, repeatKeys } = detectKeysAtLevel(allRowArrays)
  const groupName = groupKey.split('/').pop() || groupKey
  const idxCol = groupName + '_idx'
  const strippedScalar = scalarKeys.map((k) => stripKeyPath(k, groupKey))

  const cols = [idxCol, ...strippedScalar]

  for (const nk of repeatKeys) {
    const nestedArrays = []
    for (const rows of allRowArrays) {
      for (const row of rows) {
        if (Array.isArray(row[nk])) {
          nestedArrays.push(row[nk])
        }
      }
    }
    cols.push(...buildNestedColumns(nk, nestedArrays))
  }

  return cols
}

function generateLeafRows(rows, groupKey, sessionId, ancestorData) {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const { scalarKeys, repeatKeys } = detectKeysAtLevel([rows])
  const groupName = groupKey.split('/').pop() || groupKey
  const idxCol = groupName + '_idx'
  const padWidth = Math.max(1, String(rows.length).length)

  const leafRows = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const idxValue = zeroPad(i + 1, padWidth)

    const thisFields = scalarKeys.map((k) => ({
      col: stripKeyPath(k, groupKey),
      value: formatValue(row[k])
    }))

    const thisLevel = { idxCol, idxValue, fields: thisFields }

    if (repeatKeys.length === 0) {
      leafRows.push(buildLeafRow(sessionId, [...ancestorData, thisLevel]))
    } else {
      let hasNested = false
      for (const nk of repeatKeys) {
        const nestedRows = row[nk]
        if (Array.isArray(nestedRows) && nestedRows.length > 0) {
          hasNested = true
          leafRows.push(
            ...generateLeafRows(nestedRows, nk, sessionId, [
              ...ancestorData,
              thisLevel
            ])
          )
        }
      }
      if (!hasNested) {
        leafRows.push(buildLeafRow(sessionId, [...ancestorData, thisLevel]))
      }
    }
  }

  return leafRows
}

function buildLeafRow(sessionId, levels) {
  const row = { session_id: sessionId }
  for (const level of levels) {
    row[level.idxCol] = level.idxValue
    for (const f of level.fields) {
      row[f.col] = f.value
    }
  }
  return row
}

function fixSessionPadding(rows) {
  const idxCols = new Set()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key.endsWith('_idx')) idxCols.add(key)
    }
  }

  for (const col of idxCols) {
    const sessionMax = new Map()
    for (const row of rows) {
      const sid = row.session_id
      const v = parseInt(row[col], 10)
      if (!isNaN(v)) {
        sessionMax.set(sid, Math.max(sessionMax.get(sid) || 0, v))
      }
    }

    for (const row of rows) {
      const sid = row.session_id
      const maxVal = sessionMax.get(sid) || 1
      const width = Math.max(1, String(maxVal).length)
      if (row[col] !== undefined) {
        const v = parseInt(row[col], 10)
        if (!isNaN(v)) {
          row[col] = zeroPad(v, width)
        }
      }
    }
  }
}

function collectRepeatMedia(rows, sessionId, attachmentMap, sheetName, mediaRows) {
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (shouldDiscard(key)) continue
      const val = row[key]
      if (Array.isArray(val)) {
        collectRepeatMedia(val, sessionId, attachmentMap, sheetName, mediaRows)
      } else if (typeof val === 'string' && attachmentMap.has(val)) {
        const att = attachmentMap.get(val)
        mediaRows.push({
          session_id: sessionId,
          sheet: sheetName,
          field_key: key,
          original_filename: val,
          mimetype: att.mimetype,
          download_url: att.download_url,
          disk_path: `${classifyMimeType(att.mimetype)}/${sessionId}/${val}`
        })
      }
    }
  }
}

function checkMedia(val, sessionId, sheet, fieldKey, attachmentMap, mediaRows) {
  if (typeof val === 'string' && attachmentMap.has(val)) {
    const att = attachmentMap.get(val)
    mediaRows.push({
      session_id: sessionId,
      sheet,
      field_key: fieldKey,
      original_filename: val,
      mimetype: att.mimetype,
      download_url: att.download_url,
      disk_path: `${classifyMimeType(att.mimetype)}/${sessionId}/${val}`
    })
  }
}

const FREE_SURVEY_NUM_SUFFIX = /_\d{3}$/

function stripNumericSuffix(key) {
  return key.replace(FREE_SURVEY_NUM_SUFFIX, '')
}

function renameFreeSurveyCols(columns, oldPrefix, newPrefix) {
  const oldIdx = oldPrefix + '_idx'
  const newIdx = newPrefix + '_idx'
  return columns.map(c => {
    if (c === oldIdx) return newIdx
    return stripNumericSuffix(c)
  })
}

function renameFreeSurveyRows(rows, oldPrefix, newPrefix) {
  const oldIdx = oldPrefix + '_idx'
  const newIdx = newPrefix + '_idx'
  return rows.map(row => {
    const out = {}
    for (const [key, val] of Object.entries(row)) {
      if (key === oldIdx) {
        out[newIdx] = val
      } else {
        out[stripNumericSuffix(key)] = val
      }
    }
    return out
  })
}

function mergeFreeSurveySheets(sheets) {
  const merged = []
  const consumed = new Set()

  for (const sheet of sheets) {
    if (consumed.has(sheet.name)) continue

    if (sheet.name.endsWith(FREE_SURVEY_SUFFIX)) {
      const baseName = sheet.name.slice(0, -FREE_SURVEY_SUFFIX.length)
      const baseSheet = sheets.find(s => s.name === baseName)
      const renamedCols = renameFreeSurveyCols(sheet.columns, sheet.name, baseName)
      const renamedRows = renameFreeSurveyRows(sheet.rows, sheet.name, baseName)
      if (baseSheet) {
        const mergedCols = [...baseSheet.columns]
        for (const col of renamedCols) {
          if (!mergedCols.includes(col)) mergedCols.push(col)
        }
        consumed.add(sheet.name)
        consumed.add(baseName)
        merged.push({
          name: baseName,
          columns: mergedCols,
          rows: [...baseSheet.rows, ...renamedRows]
        })
      } else {
        consumed.add(sheet.name)
        merged.push({
          name: baseName,
          columns: renamedCols,
          rows: renamedRows
        })
      }
    } else {
      const fsName = sheet.name + FREE_SURVEY_SUFFIX
      const fsSheet = sheets.find(s => s.name === fsName)
      if (fsSheet) {
        const renamedCols = renameFreeSurveyCols(fsSheet.columns, fsName, sheet.name)
        const renamedRows = renameFreeSurveyRows(fsSheet.rows, fsName, sheet.name)
        const mergedCols = [...sheet.columns]
        for (const col of renamedCols) {
          if (!mergedCols.includes(col)) mergedCols.push(col)
        }
        consumed.add(sheet.name)
        consumed.add(fsName)
        merged.push({
          name: sheet.name,
          columns: mergedCols,
          rows: [...sheet.rows, ...renamedRows]
        })
      } else {
        merged.push(sheet)
      }
    }
  }

  return merged
}

export function parseSubmissions(submissions) {
  const topRepeatSet = new Set()
  const topUserKeys = []
  const topSeen = new Set()

  for (const sub of submissions) {
    for (const key of Object.keys(sub)) {
      if (shouldDiscard(key)) continue
      if (isMetadataKey(key)) continue
      if (!topSeen.has(key)) {
        topSeen.add(key)
        topUserKeys.push(key)
      }
      if (Array.isArray(sub[key])) topRepeatSet.add(key)
    }
  }

  const sessionScalarKeys = topUserKeys.filter((k) => !topRepeatSet.has(k))
  const rootRepeatKeys = topUserKeys.filter((k) => topRepeatSet.has(k))

  const standardGroups = new Map() 
  const pureSessionKeys = [] 

  for (const key of sessionScalarKeys) {
    if (key.includes('/')) {
      const groupPath = key.split('/')[0]
      const sheetName = groupPath.substring(0, 31) 

      if (!standardGroups.has(sheetName)) {
        standardGroups.set(sheetName, { groupPath, keys: [] })
      }
      standardGroups.get(sheetName).keys.push(key)
    } else {
      pureSessionKeys.push(key)
    }
  }

  const metadataKeys = []
  const metaSeen = new Set()
  for (const sub of submissions) {
    for (const key of Object.keys(sub)) {
      if (shouldDiscard(key)) continue
      if (isMetadataKey(key) && !metaSeen.has(key) && key !== '_id' && key !== '_attachments') {
        metaSeen.add(key)
        metadataKeys.push(key)
      }
    }
  }

  const groupSheetCols = new Map()
  const groupSheetRowsMap = new Map()
  for (const [sheetName, groupInfo] of standardGroups.entries()) {
    const strippedCols = groupInfo.keys.map(k => stripKeyPath(k, groupInfo.groupPath))
    groupSheetCols.set(sheetName, ['session_id', ...strippedCols])
    groupSheetRowsMap.set(sheetName, [])
  }

  const repeatRowArrays = new Map()
  for (const rk of rootRepeatKeys) repeatRowArrays.set(rk, [])
  for (const sub of submissions) {
    for (const rk of rootRepeatKeys) {
      if (Array.isArray(sub[rk]) && sub[rk].length > 0) {
        repeatRowArrays.get(rk).push(sub[rk])
      }
    }
  }

  const repeatSheetCols = new Map()
  for (const rk of rootRepeatKeys) {
    repeatSheetCols.set(rk, buildRepeatSheetColumns(rk, repeatRowArrays.get(rk)))
  }

  const sessionColumns = ['session_id', ...metadataKeys, ...pureSessionKeys]
  const sessionRows = []
  const mediaRows = []
  const repeatSheetRowsMap = new Map()
  for (const rk of rootRepeatKeys) repeatSheetRowsMap.set(rk, [])

  for (const sub of submissions) {
    const sessionId = sub._id
    const attachmentMap = buildAttachmentMap(sub)

    const sessionRow = { session_id: sessionId }
    for (const mk of metadataKeys) {
      sessionRow[mk] = formatValue(sub[mk])
    }
    for (const sk of pureSessionKeys) {
      sessionRow[sk] = formatValue(sub[sk])
    }
    sessionRows.push(sessionRow)

    for (const [sheetName, groupInfo] of standardGroups.entries()) {
      const row = { session_id: sessionId }
      for (const key of groupInfo.keys) {
        const colName = stripKeyPath(key, groupInfo.groupPath)
        row[colName] = formatValue(sub[key])
      }
      groupSheetRowsMap.get(sheetName).push(row)
    }

    for (const sk of pureSessionKeys) {
      checkMedia(sub[sk], sessionId, '_session_', sk, attachmentMap, mediaRows)
    }
    for (const [sheetName, groupInfo] of standardGroups.entries()) {
      for (const key of groupInfo.keys) {
        const colName = stripKeyPath(key, groupInfo.groupPath)
        checkMedia(sub[key], sessionId, sheetName, colName, attachmentMap, mediaRows)
      }
    }
    for (const mk of metadataKeys) {
      checkMedia(sub[mk], sessionId, '_session_', mk, attachmentMap, mediaRows)
    }

    for (const rk of rootRepeatKeys) {
      const rows = sub[rk]
      if (!Array.isArray(rows) || rows.length === 0) continue
      const leafRows = generateLeafRows(rows, rk, sessionId, [])
      repeatSheetRowsMap.get(rk).push(...leafRows)
      collectRepeatMedia(rows, sessionId, attachmentMap, rk, mediaRows)
    }
  }

  for (const rk of rootRepeatKeys) {
    fixSessionPadding(repeatSheetRowsMap.get(rk))
  }

  const standardGroupSheetsArr = Array.from(standardGroups.keys()).map((sheetName) => ({
    name: sheetName,
    columns: groupSheetCols.get(sheetName),
    rows: groupSheetRowsMap.get(sheetName)
  }))

  const repeatSheetsArr = rootRepeatKeys.map((rk) => ({
    name: rk,
    columns: repeatSheetCols.get(rk),
    rows: repeatSheetRowsMap.get(rk)
  }))

  const allSheets = [...standardGroupSheetsArr, ...repeatSheetsArr]

  return {
    _session_: { columns: sessionColumns, rows: sessionRows },
    repeatSheets: mergeFreeSurveySheets(allSheets),
    _media_: {
      columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
      rows: mediaRows
    }
  }
}