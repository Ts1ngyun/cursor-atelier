import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js'
import type { CursorFrame, DecodedSource } from '../cursor/cursor-types'

type Rgba = readonly [number, number, number, number]

function compositePixel(target: Uint8ClampedArray, offset: number, patch: Uint8ClampedArray, patchOffset: number) {
  const sourceAlpha = patch[patchOffset + 3] / 255
  if (sourceAlpha === 0) {
    return
  }

  if (sourceAlpha === 1) {
    target[offset] = patch[patchOffset]
    target[offset + 1] = patch[patchOffset + 1]
    target[offset + 2] = patch[patchOffset + 2]
    target[offset + 3] = 255
    return
  }

  const targetAlpha = target[offset + 3] / 255
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha)
  target[offset] = Math.round(
    (patch[patchOffset] * sourceAlpha + target[offset] * targetAlpha * (1 - sourceAlpha)) /
      outputAlpha,
  )
  target[offset + 1] = Math.round(
    (patch[patchOffset + 1] * sourceAlpha +
      target[offset + 1] * targetAlpha * (1 - sourceAlpha)) /
      outputAlpha,
  )
  target[offset + 2] = Math.round(
    (patch[patchOffset + 2] * sourceAlpha +
      target[offset + 2] * targetAlpha * (1 - sourceAlpha)) /
      outputAlpha,
  )
  target[offset + 3] = Math.round(outputAlpha * 255)
}

export function compositeGifFrames(
  width: number,
  height: number,
  frames: Pick<ParsedFrame, 'dims' | 'patch' | 'disposalType'>[],
  background: Rgba = [0, 0, 0, 0],
): Uint8ClampedArray[] {
  const screen = new Uint8ClampedArray(width * height * 4)
  const results: Uint8ClampedArray[] = []

  for (const frame of frames) {
    const restoreSnapshot = frame.disposalType === 3 ? screen.slice() : null
    const { left, top, width: patchWidth, height: patchHeight } = frame.dims

    for (let patchY = 0; patchY < patchHeight; patchY += 1) {
      const targetY = top + patchY
      if (targetY < 0 || targetY >= height) continue

      for (let patchX = 0; patchX < patchWidth; patchX += 1) {
        const targetX = left + patchX
        if (targetX < 0 || targetX >= width) continue

        const patchOffset = (patchY * patchWidth + patchX) * 4
        const targetOffset = (targetY * width + targetX) * 4
        compositePixel(screen, targetOffset, frame.patch, patchOffset)
      }
    }

    results.push(screen.slice())

    if (frame.disposalType === 2) {
      for (let patchY = 0; patchY < patchHeight; patchY += 1) {
        const targetY = top + patchY
        if (targetY < 0 || targetY >= height) continue

        for (let patchX = 0; patchX < patchWidth; patchX += 1) {
          const targetX = left + patchX
          if (targetX < 0 || targetX >= width) continue

          const targetOffset = (targetY * width + targetX) * 4
          screen.set(background, targetOffset)
        }
      }
    } else if (frame.disposalType === 3 && restoreSnapshot) {
      screen.set(restoreSnapshot)
    }
  }

  return results
}

export async function decodeGifFile(file: File): Promise<DecodedSource> {
  const parsed = parseGIF(await file.arrayBuffer())
  const decompressed = decompressFrames(parsed, true)

  if (decompressed.length === 0) {
    throw new Error('GIF 中没有可用帧。')
  }
  if (parsed.lsd.width > 4096 || parsed.lsd.height > 4096) {
    throw new Error('GIF 尺寸过大；宽和高都不能超过 4096 像素。')
  }
  if (decompressed.length > 240) {
    throw new Error('GIF 帧数过多；当前版本最多处理 240 帧。')
  }
  if (parsed.lsd.width * parsed.lsd.height * decompressed.length > 24_000_000) {
    throw new Error('GIF 解码后的总像素量过大，请先缩小尺寸或减少帧数。')
  }

  const backgroundColor = parsed.gct[parsed.lsd.backgroundColorIndex]
  const backgroundIsTransparent = decompressed.some(
    (frame) => frame.transparentIndex === parsed.lsd.backgroundColorIndex,
  )
  const background: Rgba =
    backgroundColor && !backgroundIsTransparent
      ? [backgroundColor[0], backgroundColor[1], backgroundColor[2], 255]
      : [0, 0, 0, 0]

  const composited = compositeGifFrames(
    parsed.lsd.width,
    parsed.lsd.height,
    decompressed,
    background,
  )

  const frames: CursorFrame[] = composited.map((pixels, index) => {
    const imageDataPixels = new Uint8ClampedArray(pixels.length)
    imageDataPixels.set(pixels)
    return {
      id: crypto.randomUUID(),
      name: `${file.name} · 帧 ${index + 1}`,
      imageData: new ImageData(imageDataPixels, parsed.lsd.width, parsed.lsd.height),
      delayMs: Math.max(20, decompressed[index].delay || 100),
    }
  })

  return {
    frames,
    kind: frames.length > 1 ? 'animation' : 'static',
    sourceType: 'gif',
  }
}
