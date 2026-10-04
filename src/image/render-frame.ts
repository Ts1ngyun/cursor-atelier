import type { CursorFrame, OutputSize } from '../cursor/cursor-types'
import { calculateContainRect } from './fit-frame'

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前浏览器无法创建 Canvas 2D 上下文。')
  }
  return context
}

export function renderFrameToCanvas(
  frame: CursorFrame,
  size: OutputSize,
  smoothing: boolean,
  targetCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = targetCanvas ?? document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const source = document.createElement('canvas')
  source.width = frame.imageData.width
  source.height = frame.imageData.height
  requireContext(source).putImageData(frame.imageData, 0, 0)

  const context = requireContext(canvas)
  context.clearRect(0, 0, size, size)
  context.imageSmoothingEnabled = smoothing
  context.imageSmoothingQuality = 'high'

  const rect = calculateContainRect(source.width, source.height, size)
  context.drawImage(source, rect.x, rect.y, rect.width, rect.height)
  return canvas
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('无法从 Canvas 生成 PNG。'))
      }
    }, 'image/png')
  })
}

export async function renderFrameToPngBytes(
  frame: CursorFrame,
  size: OutputSize,
  smoothing: boolean,
): Promise<Uint8Array> {
  const canvas = renderFrameToCanvas(frame, size, smoothing)
  const blob = await canvasToPngBlob(canvas)
  return new Uint8Array(await blob.arrayBuffer())
}
