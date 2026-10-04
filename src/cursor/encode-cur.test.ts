import { describe, expect, it } from 'vitest'
import { encodeCur } from './encode-cur'

describe('encodeCur', () => {
  it('writes a single-image PNG CUR with hotspot coordinates', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    const cur = encodeCur(png, 32, 32, { x: 4, y: 9 })
    const view = new DataView(cur.buffer)

    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(2)
    expect(view.getUint16(4, true)).toBe(1)
    expect(cur[6]).toBe(32)
    expect(cur[7]).toBe(32)
    expect(view.getUint16(10, true)).toBe(4)
    expect(view.getUint16(12, true)).toBe(9)
    expect(view.getUint32(14, true)).toBe(png.byteLength)
    expect(view.getUint32(18, true)).toBe(22)
    expect(Array.from(cur.slice(22))).toEqual(Array.from(png))
  })

  it('clamps an out-of-range hotspot independently by width and height', () => {
    const cur = encodeCur(new Uint8Array([1]), 48, 32, { x: 80, y: 80 })
    const view = new DataView(cur.buffer)
    expect(view.getUint16(10, true)).toBe(47)
    expect(view.getUint16(12, true)).toBe(31)
  })
})
