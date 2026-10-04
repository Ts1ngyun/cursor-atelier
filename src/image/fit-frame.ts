export type ContainRect = {
  x: number
  y: number
  width: number
  height: number
}

export function calculateContainRect(
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
): ContainRect {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetSize <= 0) {
    throw new RangeError('Image and target dimensions must be positive.')
  }

  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    x: (targetSize - width) / 2,
    y: (targetSize - height) / 2,
    width,
    height,
  }
}
