import { describe, expect, it } from 'vitest'
import { encodeZip } from './encode-zip'

describe('ZIP encoding', () => {
  it('writes a valid stored entry, CRC and central directory', () => {
    const zip = encodeZip([{ name: 'test.cur', bytes: new TextEncoder().encode('123456789') }])
    const view = new DataView(zip.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(14, true)).toBe(0xcbf43926)
    expect(view.getUint32(18, true)).toBe(9)
    expect(new TextDecoder().decode(zip.slice(30, 38))).toBe('test.cur')
    expect(view.getUint32(47, true)).toBe(0x02014b50)
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50)
    expect(view.getUint16(zip.length - 14, true)).toBe(1)
  })

  it('rejects duplicate and unsafe paths', () => {
    expect(() => encodeZip([])).toThrow(RangeError)
    expect(() => encodeZip([{ name: '../bad', bytes: new Uint8Array() }])).toThrow()
    expect(() => encodeZip([
      { name: 'a', bytes: new Uint8Array() },
      { name: 'a', bytes: new Uint8Array() },
    ])).toThrow()
  })
})
