import { useState, type ChangeEvent, type DragEvent } from 'react'
import { AnimationPreview } from './components/AnimationPreview'
import { CursorTestArea } from './components/CursorTestArea'
import { EditorCanvas } from './components/EditorCanvas'
import { FrameStrip } from './components/FrameStrip'
import { encodeAni } from './cursor/encode-ani'
import { encodeCur } from './cursor/encode-cur'
import { clampHotspot } from './cursor/hotspot'
import {
  OUTPUT_SIZES,
  type DecodedSource,
  type Hotspot,
  type OutputSize,
} from './cursor/cursor-types'
import { downloadBytes, filenameStem } from './export/download'
import { decodeGifFile } from './image/decode-gif'
import { decodePngSequence, decodeStaticFile } from './image/decode-static'
import { renderFrameToPngBytes } from './image/render-frame'
import './App.css'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_SEQUENCE_FILES = 120
const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const

function isPng(file: File) {
  return file.type === 'image/png' || /\.png$/i.test(file.name)
}

function isJpeg(file: File) {
  return file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)
}

function isGif(file: File) {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name)
}

function App() {
  const [source, setSource] = useState<DecodedSource | null>(null)
  const [sourceName, setSourceName] = useState('cursor')
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0)
  const [size, setSize] = useState<OutputSize>(32)
  const [hotspot, setHotspot] = useState<Hotspot>({ x: 0, y: 0 })
  const [smoothing, setSmoothing] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedFrame = source?.frames[selectedFrameIndex]

  async function loadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    )
    if (files.length === 0) return

    setError(null)
    setMessage(null)

    if (files.length > MAX_SEQUENCE_FILES) {
      setError(`一次最多导入 ${MAX_SEQUENCE_FILES} 张图片。`)
      return
    }
    if (files.some((file) => file.size > MAX_FILE_SIZE)) {
      setError('单个文件不能超过 20 MB。')
      return
    }

    setIsLoading(true)
    try {
      let decoded: DecodedSource
      if (files.length > 1) {
        if (!files.every(isPng)) {
          throw new Error('多文件动画目前只接受 PNG；GIF 请单独导入。')
        }
        decoded = await decodePngSequence(files)
      } else {
        const file = files[0]
        if (isGif(file)) {
          decoded = await decodeGifFile(file)
        } else if (isPng(file) || isJpeg(file)) {
          decoded = await decodeStaticFile(file)
        } else {
          throw new Error('请选择 PNG、JPG/JPEG 或 GIF 文件。')
        }
      }

      setSource(decoded)
      setSourceName(filenameStem(files[0].name))
      setSelectedFrameIndex(0)
      setHotspot({ x: 0, y: 0 })
      setSpeed(1)
      setMessage(
        decoded.frames.length > 1
          ? `已在本地解析 ${decoded.frames.length} 帧。`
          : '图片已在本地解析。',
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '无法读取所选文件。')
    } finally {
      setIsLoading(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void loadFiles(event.target.files ?? [])
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    void loadFiles(event.dataTransfer.files)
  }

  function handleSizeChange(nextSize: OutputSize) {
    setSize(nextSize)
    setHotspot((current) => clampHotspot(current, nextSize))
  }

  function updateHotspot(axis: keyof Hotspot, rawValue: string) {
    const value = Number.parseInt(rawValue, 10)
    if (Number.isNaN(value)) return
    setHotspot((current) => clampHotspot({ ...current, [axis]: value }, size))
  }

  function updatePngSequenceDelay(rawValue: string) {
    const value = Math.min(5000, Math.max(17, Number.parseInt(rawValue, 10) || 100))
    setSource((current) =>
      current
        ? {
            ...current,
            frames: current.frames.map((frame) => ({ ...frame, delayMs: value })),
          }
        : current,
    )
  }

  async function exportCurrentCur() {
    if (!selectedFrame) return
    setIsExporting(true)
    setError(null)
    try {
      const pngBytes = await renderFrameToPngBytes(selectedFrame, size, smoothing)
      const curBytes = encodeCur(pngBytes, size, size, hotspot)
      const frameSuffix = source && source.frames.length > 1 ? `-frame-${selectedFrameIndex + 1}` : ''
      const saved = await downloadBytes(
        curBytes,
        `${sourceName}${frameSuffix}-${size}px.cur`,
        'image/x-icon',
      )
      setMessage(saved ? 'CUR 已生成并保存。' : '已取消保存 CUR。')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'CUR 导出失败。')
    } finally {
      setIsExporting(false)
    }
  }

  async function exportAnimationAni() {
    if (!source || source.frames.length < 2) return
    setIsExporting(true)
    setError(null)
    try {
      const curFrames: Uint8Array[] = []
      for (const frame of source.frames) {
        const pngBytes = await renderFrameToPngBytes(frame, size, smoothing)
        curFrames.push(encodeCur(pngBytes, size, size, hotspot))
      }
      const aniBytes = encodeAni({
        curFrames,
        delaysMs: source.frames.map((frame) => frame.delayMs / speed),
      })
      const saved = await downloadBytes(
        aniBytes,
        `${sourceName}-${size}px.ani`,
        'application/x-navi-animation',
      )
      setMessage(saved ? 'ANI 已生成并保存。' : '已取消保存 ANI。')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ANI 导出失败。')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Cursor Atelier 首页">
          <span className="brand-mark" aria-hidden="true">↖</span>
          <span>Cursor Atelier</span>
        </a>
        <span className="privacy-note">
          <span className="privacy-dot" aria-hidden="true" />
          仅在浏览器本地处理
        </span>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Windows Cursor Maker</p>
            <h1 id="page-title">把图片变成你的鼠标指针。</h1>
          </div>
          <p>
            导入 PNG、JPG、GIF 或一组 PNG，在 Canvas 中调整尺寸和热点，直接下载 CUR 或 ANI。
            文件不会离开你的设备。
          </p>
        </section>

        <label
          className={isLoading ? 'dropzone is-loading' : 'dropzone'}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,.png,.jpg,.jpeg,.gif"
            multiple
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <span className="dropzone-icon" aria-hidden="true">＋</span>
          <span className="dropzone-copy">
            <strong>{isLoading ? '正在本地解析…' : source ? '替换图片或动画' : '选择或拖入图片'}</strong>
            <small>单张 PNG / JPG / GIF，或多张 PNG · 单文件最大 20 MB</small>
          </span>
          <span className="dropzone-action">浏览文件</span>
        </label>

        <div className="feedback" aria-live="polite">
          {error && <p className="feedback-error">{error}</p>}
          {!error && source?.warning && <p className="feedback-warning">{source.warning}</p>}
          {!error && !source?.warning && message && <p className="feedback-success">{message}</p>}
        </div>

        {source && selectedFrame ? (
          <>
            <section className="studio" aria-label="指针编辑器">
              <article className="panel editor-panel">
                <div className="panel-heading">
                  <div>
                    <span className="step-label">01 · 画面与热点</span>
                    <h2>{selectedFrame.name}</h2>
                  </div>
                  <span className="file-kind">{source.sourceType.toUpperCase()}</span>
                </div>

                <EditorCanvas
                  frame={selectedFrame}
                  size={size}
                  smoothing={smoothing}
                  hotspot={hotspot}
                  onHotspotChange={setHotspot}
                />
              </article>

              <aside className="panel controls-panel">
                <div className="control-group">
                  <div className="control-heading">
                    <span className="step-label">02 · 输出规格</span>
                    <span>{size}×{size}</span>
                  </div>
                  <div className="size-options">
                    {OUTPUT_SIZES.map((option) => (
                      <label key={option} className={option === size ? 'size-option is-selected' : 'size-option'}>
                        <input
                          type="radio"
                          name="output-size"
                          value={option}
                          checked={option === size}
                          onChange={() => handleSizeChange(option)}
                        />
                        <strong>{option}</strong>
                        <small>{option === 32 ? '推荐' : 'px'}</small>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <div className="control-heading">
                    <span className="step-label">03 · 热点坐标</span>
                    <span>0–{size - 1}</span>
                  </div>
                  <div className="coordinate-inputs">
                    <label>
                      <span>X</span>
                      <input
                        type="number"
                        min="0"
                        max={size - 1}
                        value={hotspot.x}
                        onChange={(event) => updateHotspot('x', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Y</span>
                      <input
                        type="number"
                        min="0"
                        max={size - 1}
                        value={hotspot.y}
                        onChange={(event) => updateHotspot('y', event.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <div className="control-group inline-control">
                  <div>
                    <span className="control-title">平滑缩放</span>
                    <small>像素画建议关闭</small>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={smoothing}
                      onChange={(event) => setSmoothing(event.target.checked)}
                    />
                    <span aria-hidden="true" />
                  </label>
                </div>

                {source.frames.length > 1 && (
                  <div className="control-group animation-controls">
                    <label>
                      <span className="control-title">播放速度</span>
                      <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                        {SPEED_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}×</option>
                        ))}
                      </select>
                    </label>
                    {source.sourceType === 'png-sequence' && (
                      <label>
                        <span className="control-title">每帧时长</span>
                        <span className="number-with-unit">
                          <input
                            type="number"
                            min="17"
                            max="5000"
                            value={source.frames[0].delayMs}
                            onChange={(event) => updatePngSequenceDelay(event.target.value)}
                          />
                          ms
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </aside>
            </section>

            {source.frames.length > 1 && (
              <section className="panel frames-panel" aria-labelledby="frames-title">
                <div className="panel-heading compact">
                  <div>
                    <span className="step-label">动画帧</span>
                    <h2 id="frames-title">{source.frames.length} 帧 · 点击选择单帧</h2>
                  </div>
                </div>
                <FrameStrip
                  frames={source.frames}
                  selectedIndex={selectedFrameIndex}
                  size={size}
                  smoothing={smoothing}
                  onSelect={setSelectedFrameIndex}
                />
              </section>
            )}

            <section className="preview-grid">
              {source.frames.length > 1 && (
                <article className="panel preview-card">
                  <div className="panel-heading compact">
                    <div>
                      <span className="step-label">动画预览</span>
                      <h2>Canvas 合成结果</h2>
                    </div>
                    <span className="speed-badge">{speed}×</span>
                  </div>
                  <AnimationPreview
                    frames={source.frames}
                    size={size}
                    smoothing={smoothing}
                    speed={speed}
                  />
                </article>
              )}

              <article className="panel test-card">
                <div className="panel-heading compact">
                  <div>
                    <span className="step-label">指针测试</span>
                    <h2>热点 {hotspot.x}, {hotspot.y}</h2>
                  </div>
                </div>
                <CursorTestArea
                  frame={selectedFrame}
                  size={size}
                  smoothing={smoothing}
                  hotspot={hotspot}
                />
              </article>
            </section>

            <section className="export-bar" aria-label="导出">
              <div>
                <span className="step-label">04 · 导出</span>
                <h2>{source.frames.length > 1 ? '下载当前帧或完整动画' : '下载 Windows CUR 文件'}</h2>
                <p>PNG 图像数据嵌入 CUR；ANI 使用 RIFF ACON 和 1/60 秒时间单位。</p>
              </div>
              <div className="export-actions">
                {source.frames.length > 1 && (
                  <>
                    <button type="button" className="button secondary" onClick={exportCurrentCur} disabled={isExporting}>
                      下载当前帧 CUR
                    </button>
                    <button type="button" className="button primary" onClick={exportAnimationAni} disabled={isExporting}>
                      {isExporting ? '正在生成…' : '下载 ANI'}
                    </button>
                  </>
                )}
                {source.frames.length === 1 && (
                  <button type="button" className="button primary" onClick={exportCurrentCur} disabled={isExporting}>
                    {isExporting ? '正在生成…' : '下载 CUR'}
                  </button>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="empty-state">
            <div className="empty-grid" aria-hidden="true">
              <span /><span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            <div>
              <span className="step-label">准备开始</span>
              <h2>先导入一张图片</h2>
              <p>所有解码、缩放和文件编码都在这个页面中完成，不需要账户或服务器。</p>
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>Cursor Atelier</span>
        <span>Local-first · No uploads · MIT licensed</span>
      </footer>
    </div>
  )
}

export default App
