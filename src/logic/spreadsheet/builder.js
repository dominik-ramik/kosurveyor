import * as XLSX from 'xlsx'

export function buildSpreadsheet(parsedResult) {
  const wb = XLSX.utils.book_new()

  addSheet(wb, '_session_', parsedResult._session_.columns, parsedResult._session_.rows)

  for (const rs of parsedResult.repeatSheets) {
    addSheet(wb, rs.name, rs.columns, rs.rows)
  }

  addSheet(wb, '_media_', parsedResult._media_.columns, parsedResult._media_.rows)

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}

function addSheet(wb, name, columns, rows) {
  const data = [columns]
  for (const row of rows) {
    data.push(columns.map((c) => (row[c] !== undefined ? row[c] : '')))
  }

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Bold headers
  for (let c = 0; c < columns.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[cellRef]) {
      ws[cellRef].s = { font: { bold: true } }
    }
  }

  // Auto-size columns
  ws['!cols'] = columns.map((col, i) => {
    let maxLen = col.length
    for (const row of rows) {
      const val = row[columns[i]]
      const len = val !== undefined && val !== null ? String(val).length : 0
      if (len > maxLen) maxLen = len
    }
    return { wch: Math.min(60, Math.max(8, maxLen)) }
  })

  XLSX.utils.book_append_sheet(wb, ws, name)
}
