import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBytes, filenameStem } from './download'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('filenameStem', () => {
  it('removes extensions and Windows-reserved characters', () => {
    expect(filenameStem('my:cursor?.png')).toBe('my-cursor')
  })

  it('provides a fallback name', () => {
    expect(filenameStem('?.png')).toBe('cursor')
  })

  it('uses the Tauri save command in the desktop app', async () => {
    const invoke = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('window', { __TAURI__: { core: { invoke } } })

    await expect(
      downloadBytes(new Uint8Array([1, 2, 3]), 'sample.cur', 'image/x-icon'),
    ).resolves.toBe(true)
    expect(invoke).toHaveBeenCalledWith('save_cursor_file', {
      fileName: 'sample.cur',
      bytes: [1, 2, 3],
    })
  })
})
