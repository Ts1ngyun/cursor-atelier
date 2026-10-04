import type { Hotspot } from './cursor-types'

const CUR_HEADER_SIZE = 6
const CUR_ENTRY_SIZE = 16
const CUR_IMAGE_OFFSET = CUR_HEADER_SIZE + CUR_ENTRY_SIZE

export function encodeCur(
  pngBytes: Uint8Array,
  width: number,
  height: number,
  hotspot: Hotspot,
): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError('Cursor dimensions must be positive integers.')
  }

  if (width > 256 || height > 256) {
    throw new RangeError('CUR dimensions cannot exceed 256 pixels.')
  }

  if (pngBytes.byteLength === 0) {
    throw new RangeError('PNG payload cannot be empty.')
  }

  const safeHotspot = {
    x: Math.min(width - 1, Math.max(0, Math.floor(hotspot.x))),
    y: Math.min(height - 1, Math.max(0, Math.floor(hotspot.y))),
  }
  const output = new Uint8Array(CUR_IMAGE_OFFSET + pngBytes.byteLength)
  const view = new DataView(output.buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 2, true)
  view.setUint16(4, 1, true)

  output[6] = width === 256 ? 0 : width
  output[7] = height === 256 ? 0 : height
  output[8] = 0
  output[9] = 0
  view.setUint16(10, safeHotspot.x, true)
  view.setUint16(12, safeHotspot.y, true)
  view.setUint32(14, pngBytes.byteLength, true)
  view.setUint32(18, CUR_IMAGE_OFFSET, true)
  output.set(pngBytes, CUR_IMAGE_OFFSET)

  return output
}
