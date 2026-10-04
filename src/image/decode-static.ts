import type { CursorFrame, DecodedSource } from '../cursor/cursor-types'

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('当前浏览器无法创建 Canvas 2D 上下文。')
  }
  return context
}

export async function decodeStaticFile(file: File): Promise<DecodedSource> {
  const bitmap = await createImageBitmap(file)

  try {
    if (bitmap.width > 4096 || bitmap.height > 4096 || bitmap.width * bitmap.height > 16_777_216) {
      throw new Error('图片尺寸过大；请使用不超过 4096×4096 且不超过 1600 万像素的图片。')
    }

    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = getContext(canvas)
    context.drawImage(bitmap, 0, 0)

    const frame: CursorFrame = {
      id: crypto.randomUUID(),
      name: file.name,
      imageData: context.getImageData(0, 0, canvas.width, canvas.height),
      delayMs: 100,
    }
    const isJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)

    return {
      frames: [frame],
      kind: 'static',
      sourceType: isJpeg ? 'jpeg' : 'png',
      warning: isJpeg ? 'JPG 不支持透明背景；空白区域会保持透明，但图片本身通常带有不透明背景。' : undefined,
    }
  } finally {
    bitmap.close()
  }
}

export async function decodePngSequence(files: File[]): Promise<DecodedSource> {
  const decoded: DecodedSource[] = []
  for (const file of files) {
    decoded.push(await decodeStaticFile(file))
  }
  return {
    frames: decoded.map((source) => source.frames[0]),
    kind: 'animation',
    sourceType: 'png-sequence',
  }
}
