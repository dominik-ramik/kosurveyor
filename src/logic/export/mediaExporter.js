export const MEDIA_FETCH_CONCURRENCY = 5

export async function exportMedia(mediaRows, dirHandle, onProgress) {
  const total = mediaRows.length
  let completed = 0
  let skipped = 0
  const errors = []

  let active = 0
  let nextIdx = 0

  await new Promise((resolve) => {
    function scheduleNext() {
      while (active < MEDIA_FETCH_CONCURRENCY && nextIdx < total) {
        const idx = nextIdx++
        const row = mediaRows[idx]
        active++

        processFile(row, dirHandle)
          .then((result) => {
            if (result === 'skipped') skipped++
          })
          .catch((error) => {
            errors.push({ disk_path: row.disk_path, error })
          })
          .finally(() => {
            completed++
            active--
            onProgress({
              total,
              completed,
              currentFile: row.original_filename,
              skipped,
              errors: [...errors]
            })
            if (nextIdx >= total && active === 0) {
              resolve()
            } else {
              scheduleNext()
            }
          })
      }
      if (total === 0) resolve()
    }
    scheduleNext()
  })

  return { completed, skipped, errors }
}

async function processFile(row, rootDirHandle) {
  const parts = row.disk_path.split('/')
  const filename = parts.pop()

  let currentDir = rootDirHandle
  for (const dir of parts) {
    currentDir = await currentDir.getDirectoryHandle(dir, { create: true })
  }

  // Resumability check
  try {
    await currentDir.getFileHandle(filename)
    return 'skipped'
  } catch (e) {
    if (e.name !== 'NotFoundError') throw e
  }

  const response = await fetch(row.download_url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const fileHandle = await currentDir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await response.body.pipeTo(writable)

  return 'downloaded'
}
