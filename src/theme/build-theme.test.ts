import { describe, expect, it } from 'vitest'
import { buildThemePackage, type ThemeCursors } from './build-theme'
import { CURSOR_ROLES } from './roles'

function extractStored(zip: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>()
  const view = new DataView(zip.buffer)
  let offset = 0
  while (view.getUint32(offset, true) === 0x04034b50) {
    const nameLength = view.getUint16(offset + 26, true)
    const contentLength = view.getUint32(offset + 18, true)
    const name = new TextDecoder().decode(zip.slice(offset + 30, offset + 30 + nameLength))
    files.set(name, zip.slice(offset + 30 + nameLength, offset + 30 + nameLength + contentLength))
    offset += 30 + nameLength + contentLength
  }
  return files
}

describe('Windows cursor theme package', () => {
  const cursors = Object.fromEntries(CURSOR_ROLES.map((role) => [
    role.id,
    { bytes: new Uint8Array([1, 2, 3]), extension: role.id === 'Wait' ? 'ani' : 'cur' },
  ])) as ThemeCursors

  it('contains all 15 roles and a UTF-16LE INF in Windows scheme order', () => {
    const files = extractStored(buildThemePackage('星空方案', cursors))
    expect(files.size).toBe(17)
    expect(files.has('wait.ani')).toBe(true)
    const infBytes = files.get('install.inf')!
    expect(Array.from(infBytes.slice(0, 2))).toEqual([0xff, 0xfe])
    const inf = new TextDecoder('utf-16le').decode(infBytes)
    expect(inf).toContain('HKCU,"Control Panel\\Cursors\\Schemes","星空方案"')
    expect(inf).toContain('CopyFiles=Cursor.Files')
    expect(inf).toContain('Provider="Ts1ngyun"')
    const schemeLine = inf.split('\r\n').find((line) => line.startsWith('HKCU,'))!
    const paths = schemeLine.split('"').at(-2)!.split(',')
    expect(paths).toHaveLength(15)
    expect(paths[0]).toMatch(/arrow\.cur$/)
    expect(paths[3]).toMatch(/wait\.ani$/)
    expect(paths[14]).toMatch(/link\.cur$/)
  })

  it('does not export an incomplete theme', () => {
    expect(() => buildThemePackage('Test', { ...cursors, Hand: undefined } as unknown as ThemeCursors)).toThrow('链接选择')
  })
})
