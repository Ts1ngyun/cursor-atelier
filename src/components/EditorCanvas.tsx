import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import type { CursorFrame, Hotspot, OutputSize } from '../cursor/cursor-types'
import { clampHotspot, pointerToHotspot } from '../cursor/hotspot'
import { renderFrameToCanvas } from '../image/render-frame'

type EditorCanvasProps = {
  frame: CursorFrame
  size: OutputSize
  smoothing: boolean
  hotspot: Hotspot
  onHotspotChange: (hotspot: Hotspot) => void
}

export function EditorCanvas({
  frame,
  size,
  smoothing,
  hotspot,
  onHotspotChange,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      renderFrameToCanvas(frame, size, smoothing, canvasRef.current)
    }
  }, [frame, size, smoothing])

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onHotspotChange(
      pointerToHotspot(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), size),
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const movement: Record<string, Hotspot> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    }
    const delta = movement[event.key]
    if (!delta) return

    event.preventDefault()
    onHotspotChange(
      clampHotspot({ x: hotspot.x + delta.x, y: hotspot.y + delta.y }, size),
    )
  }

  return (
    <div className="editor-canvas-shell">
      <button
        type="button"
        className={smoothing ? 'editor-canvas' : 'editor-canvas pixelated'}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`点击设置热点，当前坐标 ${hotspot.x}, ${hotspot.y}`}
      >
        <canvas ref={canvasRef} width={size} height={size} />
        <span
          className="hotspot-marker"
          style={{
            left: `${((hotspot.x + 0.5) / size) * 100}%`,
            top: `${((hotspot.y + 0.5) / size) * 100}%`,
          }}
          aria-hidden="true"
        />
      </button>
      <p className="canvas-help">点击画布设置热点；聚焦后可用方向键微调。</p>
    </div>
  )
}
