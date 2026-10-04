import { describe, expect, it } from 'vitest'
import { delayMsToJiffies, encodeAni } from './encode-ani'

function fourCC(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + 4))
}

describe('ANI encoding', () => {
  it('converts milliseconds to 1/60-second jiffies', () => {
    expect(delayMsToJiffies(100)).toBe(6)
    expect(delayMsToJiffies(16)).toBe(1)
    expect(delayMsToJiffies(500)).toBe(30)
  })

  it('writes RIFF ACON, anih, rate, and LIST fram chunks', () => {
    const first = new Uint8Array([1, 2, 3])
    const second = new Uint8Array([4, 5, 6, 7])
    const ani = encodeAni({ curFrames: [first, second], delaysMs: [100, 250] })
    const view = new DataView(ani.buffer)

    expect(fourCC(ani, 0)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(ani.byteLength - 8)
    expect(fourCC(ani, 8)).toBe('ACON')

    expect(fourCC(ani, 12)).toBe('anih')
    expect(view.getUint32(16, true)).toBe(36)
    expect(view.getUint32(24, true)).toBe(2)
    expect(view.getUint32(28, true)).toBe(2)
    expect(view.getUint32(48, true)).toBe(6)
    expect(view.getUint32(52, true)).toBe(1)

    const rateOffset = 56
    expect(fourCC(ani, rateOffset)).toBe('rate')
    expect(view.getUint32(rateOffset + 8, true)).toBe(6)
    expect(view.getUint32(rateOffset + 12, true)).toBe(15)

    const listOffset = 72
    expect(fourCC(ani, listOffset)).toBe('LIST')
    expect(fourCC(ani, listOffset + 8)).toBe('fram')
    expect(fourCC(ani, listOffset + 12)).toBe('icon')
    expect(view.getUint32(listOffset + 16, true)).toBe(3)
    expect(fourCC(ani, listOffset + 24)).toBe('icon')
    expect(view.getUint32(listOffset + 28, true)).toBe(4)
  })

  it('requires matching frame and delay counts', () => {
    expect(() =>
      encodeAni({ curFrames: [new Uint8Array([1]), new Uint8Array([2])], delaysMs: [100] }),
    ).toThrow(RangeError)
  })
})
