import type { Hotspot } from './cursor-types'

export function clampHotspot(hotspot: Hotspot, size: number): Hotspot {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError('Cursor size must be a positive integer.')
  }

  return {
    x: Math.min(size - 1, Math.max(0, Math.floor(hotspot.x))),
    y: Math.min(size - 1, Math.max(0, Math.floor(hotspot.y))),
  }
}

export function pointerToHotspot(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  size: number,
): Hotspot {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 }
  }

  return clampHotspot(
    {
      x: ((clientX - bounds.left) / bounds.width) * size,
      y: ((clientY - bounds.top) / bounds.height) * size,
    },
    size,
  )
}
