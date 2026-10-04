import { describe, expect, it } from 'vitest'
import { clampHotspot, pointerToHotspot } from './hotspot'

describe('hotspot helpers', () => {
  it('clamps coordinates to cursor bounds', () => {
    expect(clampHotspot({ x: -3, y: 80 }, 32)).toEqual({ x: 0, y: 31 })
  })

  it('maps pointer coordinates from a scaled preview', () => {
    const bounds = { left: 100, top: 50, width: 320, height: 320 }
    expect(pointerToHotspot(260, 210, bounds, 32)).toEqual({ x: 16, y: 16 })
  })

  it('maps the visual bottom-right edge to the last pixel', () => {
    const bounds = { left: 0, top: 0, width: 100, height: 100 }
    expect(pointerToHotspot(100, 100, bounds, 48)).toEqual({ x: 47, y: 47 })
  })
})
