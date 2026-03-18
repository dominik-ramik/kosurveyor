import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportMedia, MEDIA_FETCH_CONCURRENCY } from '@/logic/export/mediaExporter'

describe('exportMedia', () => {
  let mockWritable
  let mockFileHandle
  let mockSubDir
  let mockDirHandle

  beforeEach(() => {
    mockWritable = {
      write: vi.fn(),
      close: vi.fn()
    }

    mockFileHandle = {
      createWritable: vi.fn().mockResolvedValue(mockWritable)
    }

    mockSubDir = {
      getDirectoryHandle: vi.fn().mockImplementation(() => Promise.resolve(mockSubDir)),
      getFileHandle: vi.fn().mockImplementation((name, opts) => {
        if (opts && opts.create) {
          return Promise.resolve(mockFileHandle)
        }
        return Promise.reject(Object.assign(new Error('Not found'), { name: 'NotFoundError' }))
      })
    }

    mockDirHandle = {
      getDirectoryHandle: vi.fn().mockImplementation(() => Promise.resolve(mockSubDir)),
      getFileHandle: vi.fn()
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        pipeTo: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('exports MEDIA_FETCH_CONCURRENCY as 5', () => {
    expect(MEDIA_FETCH_CONCURRENCY).toBe(5)
  })

  it('downloads files and calls onProgress', async () => {
    const mediaRows = [
      {
        download_url: 'https://example.com/photo.jpg',
        disk_path: 'photos/101/photo.jpg',
        original_filename: 'photo.jpg',
        session_id: 101
      }
    ]

    const progress = vi.fn()
    const result = await exportMedia(mediaRows, mockDirHandle, progress)

    expect(result.completed).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(progress).toHaveBeenCalledTimes(1)
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        completed: 1,
        currentFile: 'photo.jpg'
      })
    )
  })

  it('skips existing files without fetching', async () => {
    mockSubDir.getFileHandle.mockResolvedValue(mockFileHandle)

    const mediaRows = [
      {
        download_url: 'https://example.com/photo.jpg',
        disk_path: 'photos/101/photo.jpg',
        original_filename: 'photo.jpg',
        session_id: 101
      }
    ]

    const progress = vi.fn()
    const result = await exportMedia(mediaRows, mockDirHandle, progress)

    expect(result.skipped).toBe(1)
    expect(result.completed).toBe(1)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('records errors for failed fetches and continues', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))

    const mediaRows = [
      {
        download_url: 'https://example.com/photo.jpg',
        disk_path: 'photos/101/photo.jpg',
        original_filename: 'photo.jpg',
        session_id: 101
      }
    ]

    const progress = vi.fn()
    const result = await exportMedia(mediaRows, mockDirHandle, progress)

    expect(result.completed).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].disk_path).toBe('photos/101/photo.jpg')
  })

  it('creates subdirectories recursively', async () => {
    const mediaRows = [
      {
        download_url: 'https://example.com/photo.jpg',
        disk_path: 'photos/101/photo.jpg',
        original_filename: 'photo.jpg',
        session_id: 101
      }
    ]

    await exportMedia(mediaRows, mockDirHandle, vi.fn())

    expect(mockDirHandle.getDirectoryHandle).toHaveBeenCalledWith('photos', { create: true })
    expect(mockSubDir.getDirectoryHandle).toHaveBeenCalledWith('101', { create: true })
  })

  it('handles empty media rows', async () => {
    const progress = vi.fn()
    const result = await exportMedia([], mockDirHandle, progress)

    expect(result.completed).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('respects concurrency limit', async () => {
    let concurrentCount = 0
    let maxConcurrent = 0

    global.fetch.mockImplementation(() => {
      concurrentCount++
      maxConcurrent = Math.max(maxConcurrent, concurrentCount)
      return new Promise((resolve) => {
        setTimeout(() => {
          concurrentCount--
          resolve({
            ok: true,
            body: { pipeTo: vi.fn().mockResolvedValue(undefined) }
          })
        }, 10)
      })
    })

    const mediaRows = Array.from({ length: 10 }, (_, i) => ({
      download_url: `https://example.com/photo${i}.jpg`,
      disk_path: `photos/101/photo${i}.jpg`,
      original_filename: `photo${i}.jpg`,
      session_id: 101
    }))

    await exportMedia(mediaRows, mockDirHandle, vi.fn())
    expect(maxConcurrent).toBeLessThanOrEqual(MEDIA_FETCH_CONCURRENCY)
  })

  it('processes all files even when some fail', async () => {
    let callCount = 0
    global.fetch.mockImplementation(() => {
      callCount++
      if (callCount === 2) {
        return Promise.reject(new Error('fail'))
      }
      return Promise.resolve({
        ok: true,
        body: { pipeTo: vi.fn().mockResolvedValue(undefined) }
      })
    })

    const mediaRows = Array.from({ length: 3 }, (_, i) => ({
      download_url: `https://example.com/photo${i}.jpg`,
      disk_path: `photos/101/photo${i}.jpg`,
      original_filename: `photo${i}.jpg`,
      session_id: 101
    }))

    const result = await exportMedia(mediaRows, mockDirHandle, vi.fn())

    expect(result.completed).toBe(3) // all processed
    expect(result.errors).toHaveLength(1) // one failed
  })
})
