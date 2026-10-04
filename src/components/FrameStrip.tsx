import { useEffect, useRef } from 'react'
import type { CursorFrame, OutputSize } from '../cursor/cursor-types'
import { renderFrameToCanvas } from '../image/render-frame'

type FrameThumbnailProps = {
  frame: CursorFrame
  size: OutputSize
  smoothing: boolean
}

function FrameThumbnail({ frame, size, smoothing }: FrameThumbnailProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (ref.current) {
      renderFrameToCanvas(frame, size, smoothing, ref.current)
    }
  }, [frame, size, smoothing])

  return <canvas ref={ref} width={size} height={size} aria-hidden="true" />
}

type FrameStripProps = {
  frames: CursorFrame[]
  selectedIndex: number
  size: OutputSize
  smoothing: boolean
  onSelect: (index: number) => void
}

export function FrameStrip({
  frames,
  selectedIndex,
  size,
  smoothing,
  onSelect,
}: FrameStripProps) {
  return (
    <div className="frame-strip" aria-label="动画帧">
      {frames.map((frame, index) => (
        <button
          key={frame.id}
          type="button"
          className={index === selectedIndex ? 'frame-thumb is-selected' : 'frame-thumb'}
          onClick={() => onSelect(index)}
          aria-pressed={index === selectedIndex}
          title={frame.name}
        >
          <FrameThumbnail frame={frame} size={size} smoothing={smoothing} />
          <span>{index + 1}</span>
          <small>{frame.delayMs} ms</small>
        </button>
      ))}
    </div>
  )
}
