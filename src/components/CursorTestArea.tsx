import { useEffect, useState } from 'react'
import type { CursorFrame, Hotspot, OutputSize } from '../cursor/cursor-types'
import { canvasToPngBlob, renderFrameToCanvas } from '../image/render-frame'

type CursorTestAreaProps = {
  frame: CursorFrame
  size: OutputSize
  smoothing: boolean
  hotspot: Hotspot
}

export function CursorTestArea({ frame, size, smoothing, hotspot }: CursorTestAreaProps) {
  const [cursorUrl, setCursorUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let createdUrl: string | null = null

    async function createCursorPreview() {
      const blob = await canvasToPngBlob(renderFrameToCanvas(frame, size, smoothing))
      createdUrl = URL.createObjectURL(blob)
      if (active) {
        setCursorUrl(createdUrl)
      } else {
        URL.revokeObjectURL(createdUrl)
      }
    }

    void createCursorPreview()
    return () => {
      active = false
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [frame, size, smoothing])

  return (
    <div
      className="cursor-test-area"
      style={{
        cursor: cursorUrl
          ? `url("${cursorUrl}") ${hotspot.x} ${hotspot.y}, crosshair`
          : 'crosshair',
      }}
    >
      <span>在这里移动鼠标</span>
      <small>浏览器使用当前 PNG 和热点模拟指针效果</small>
    </div>
  )
}
