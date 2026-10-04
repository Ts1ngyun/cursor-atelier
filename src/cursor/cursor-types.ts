export const OUTPUT_SIZES = [32, 48, 64] as const

export type OutputSize = (typeof OUTPUT_SIZES)[number]

export type Hotspot = {
  x: number
  y: number
}

export type CursorFrame = {
  id: string
  name: string
  imageData: ImageData
  delayMs: number
}

export type DecodedSource = {
  frames: CursorFrame[]
  kind: 'static' | 'animation'
  sourceType: 'png' | 'jpeg' | 'gif' | 'png-sequence'
  warning?: string
}
