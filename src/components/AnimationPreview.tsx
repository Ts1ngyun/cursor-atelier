import { useEffect, useRef } from 'react'
import type { CursorFrame, OutputSize } from '../cursor/cursor-types'
import { renderFrameToCanvas } from '../image/render-frame'

type AnimationPreviewProps = {
  frames: CursorFrame[]
  size: OutputSize
  smoothing: boolean
  speed: number
}

export function AnimationPreview({ frames, size, smoothing, speed }: AnimationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) return

    let index = 0
    let timeoutId = 0
    let cancelled = false

    function drawNextFrame() {
      if (!canvas || cancelled) return
      const frame = frames[index]
      renderFrameToCanvas(frame, size, smoothing, canvas)
      timeoutId = window.setTimeout(() => {
        index = (index + 1) % frames.length
        drawNextFrame()
      }, Math.max(16, frame.delayMs / speed))
    }

    drawNextFrame()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [frames, size, smoothing, speed])

  return (
    <div className={smoothing ? 'animation-preview' : 'animation-preview pixelated'}>
      <canvas ref={canvasRef} width={size} height={size} />
    </div>
  )
}
