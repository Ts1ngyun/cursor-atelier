import { describe, expect, it } from 'vitest'
import { calculateContainRect } from './fit-frame'

describe('calculateContainRect', () => {
  it('centers a landscape image in a square', () => {
    expect(calculateContainRect(200, 100, 32)).toEqual({
      x: 0,
      y: 8,
      width: 32,
      height: 16,
    })
  })

  it('centers a portrait image in a square', () => {
    expect(calculateContainRect(50, 100, 64)).toEqual({
      x: 16,
      y: 0,
      width: 32,
      height: 64,
    })
  })

  it('rejects invalid dimensions', () => {
    expect(() => calculateContainRect(0, 10, 32)).toThrow(RangeError)
  })
})
