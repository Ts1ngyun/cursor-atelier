import { describe, expect, it } from 'vitest'
import { compositeGifFrames } from './decode-gif'

const red = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255])
const blue = new Uint8ClampedArray([0, 0, 255, 255])
const green = new Uint8ClampedArray([0, 255, 0, 255])

describe('compositeGifFrames', () => {
  it('applies partial frames and restore-to-background disposal', () => {
    const output = compositeGifFrames(2, 1, [
      { dims: { left: 0, top: 0, width: 2, height: 1 }, patch: red, disposalType: 1 },
      { dims: { left: 1, top: 0, width: 1, height: 1 }, patch: blue, disposalType: 2 },
      { dims: { left: 0, top: 0, width: 1, height: 1 }, patch: green, disposalType: 1 },
    ])

    expect(Array.from(output[0])).toEqual(Array.from(red))
    expect(Array.from(output[1])).toEqual([255, 0, 0, 255, 0, 0, 255, 255])
    expect(Array.from(output[2])).toEqual([0, 255, 0, 255, 0, 0, 0, 0])
  })

  it('restores the previous canvas for disposal type 3', () => {
    const output = compositeGifFrames(2, 1, [
      { dims: { left: 0, top: 0, width: 2, height: 1 }, patch: red, disposalType: 1 },
      { dims: { left: 0, top: 0, width: 1, height: 1 }, patch: blue, disposalType: 3 },
      { dims: { left: 1, top: 0, width: 1, height: 1 }, patch: green, disposalType: 1 },
    ])

    expect(Array.from(output[1])).toEqual([0, 0, 255, 255, 255, 0, 0, 255])
    expect(Array.from(output[2])).toEqual([255, 0, 0, 255, 0, 255, 0, 255])
  })

  it('keeps underlying pixels when a GIF patch pixel is transparent', () => {
    const transparent = new Uint8ClampedArray([0, 0, 0, 0])
    const output = compositeGifFrames(2, 1, [
      { dims: { left: 0, top: 0, width: 2, height: 1 }, patch: red, disposalType: 1 },
      { dims: { left: 0, top: 0, width: 1, height: 1 }, patch: transparent, disposalType: 1 },
    ])
    expect(Array.from(output[1])).toEqual(Array.from(red))
  })
})
