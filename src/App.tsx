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
import { buildThemePackage, type ThemeCursors } from './theme/build-theme'
import { CURSOR_ROLES, type CursorRoleId } from './theme/roles'
import './App.css'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_SEQUENCE_FILES = 120
const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const

type EditorDraft = {
  source: DecodedSource | null
  sourceName: string
  selectedFrameIndex: number
  hotspot: Hotspot
  smoothing: boolean
  speed: number
}

const EMPTY_DRAFT: EditorDraft = {
  source: null,
  sourceName: 'cursor',
  selectedFrameIndex: 0,
  hotspot: { x: 0, y: 0 },
  smoothing: true,
  speed: 1,
}

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
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic')
  const [basicDraft, setBasicDraft] = useState<EditorDraft>(EMPTY_DRAFT)
  const [themeDrafts, setThemeDrafts] = useState<Partial<Record<CursorRoleId, EditorDraft>>>({})
  const [selectedRole, setSelectedRole] = useState<CursorRoleId>('Arrow')
  const [themeName, setThemeName] = useState('Cursor Atelier 自定义方案')
  const [size, setSize] = useState<OutputSize>(32)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const draft = mode === 'basic' ? basicDraft : themeDrafts[selectedRole] ?? EMPTY_DRAFT
  const { source, sourceName, selectedFrameIndex, hotspot, smoothing, speed } = draft
  const selectedFrame = source?.frames[selectedFrameIndex]
  const filledRoles = CURSOR_ROLES.filter((role) => themeDrafts[role.id]?.source).length

  function updateDraft(updater: (current: EditorDraft) => EditorDraft) {
    if (mode === 'basic') {
      setBasicDraft(updater)
    } else {
      setThemeDrafts((current) => ({
        ...current,
        [selectedRole]: updater(current[selectedRole] ?? EMPTY_DRAFT),
      }))
    }
  }

  async function loadFiles(fileList: FileList | File[]) {
    const targetMode = mode
    const targetRole = selectedRole
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

      const nextDraft: EditorDraft = {
        ...EMPTY_DRAFT,
        source: decoded,
        sourceName: filenameStem(files[0].name),
      }
      if (targetMode === 'basic') {
        setBasicDraft(nextDraft)
      } else {
        setThemeDrafts((current) => ({ ...current, [targetRole]: nextDraft }))
      }
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
    setBasicDraft((current) => ({ ...current, hotspot: clampHotspot(current.hotspot, nextSize) }))
    setThemeDrafts((current) => Object.fromEntries(
      Object.entries(current).map(([role, value]) => [
        role,
        { ...value, hotspot: clampHotspot(value.hotspot, nextSize) },
      ]),
    ) as Partial<Record<CursorRoleId, EditorDraft>>)
  }

  function updateHotspot(axis: keyof Hotspot, rawValue: string) {
    const value = Number.parseInt(rawValue, 10)
    if (Number.isNaN(value)) return
    updateDraft((current) => ({
      ...current,
      hotspot: clampHotspot({ ...current.hotspot, [axis]: value }, size),
    }))
  }

  function updatePngSequenceDelay(rawValue: string) {
    const value = Math.min(5000, Math.max(17, Number.parseInt(rawValue, 10) || 100))
    updateDraft((current) => ({
      ...current,
      source: current.source
        ? {
            ...current.source,
            frames: current.source.frames.map((frame) => ({ ...frame, delayMs: value })),
          }
        : null,
    }))
  }

  async function exportThemeZip() {
    if (filledRoles !== CURSOR_ROLES.length) {
      setError('请先为全部 15 个状态设置图片。')
      return
    }
    setIsExporting(true)
    setError(null)
    try {
      const cursors = {} as ThemeCursors
      for (const role of CURSOR_ROLES) {
        const roleDraft = themeDrafts[role.id]
        if (!roleDraft?.source) throw new Error(`缺少「${role.label}」的指针。`)
        setMessage(`正在生成「${role.label}」…`)
        const curFrames: Uint8Array[] = []
        for (const frame of roleDraft.source.frames) {
          const png = await renderFrameToPngBytes(frame, size, roleDraft.smoothing)
          curFrames.push(encodeCur(png, size, size, roleDraft.hotspot))
        }
        if (curFrames.length > 1) {
          cursors[role.id] = {
            extension: 'ani',
            bytes: encodeAni({
              curFrames,
              delaysMs: roleDraft.source.frames.map((frame) => frame.delayMs / roleDraft.speed),
            }),
          }
        } else {
          cursors[role.id] = { extension: 'cur', bytes: curFrames[0] }
        }
      }
      const zip = buildThemePackage(themeName, cursors)
      const saved = await downloadBytes(zip, `${filenameStem(themeName)}-${size}px.zip`, 'application/zip')
      setMessage(saved ? '主题 ZIP 已生成。解压后请阅读 README.txt，再右键安装 install.inf。' : '已取消保存主题包。')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '主题导出失败。')
    } finally {
      setIsExporting(false)
    }
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

        <section className="mode-panel" aria-label="制作模式">
          <div className="mode-switch">
            <button type="button" className={mode === 'basic' ? 'is-active' : ''} onClick={() => { setMode('basic'); setError(null); setMessage(null) }}>
              基础版 <small>单个指针</small>
            </button>
            <button type="button" className={mode === 'advanced' ? 'is-active' : ''} onClick={() => { setMode('advanced'); setError(null); setMessage(null) }}>
              进阶版 <small>完整指针方案</small>
            </button>
          </div>
          <p>{mode === 'basic' ? '和之前一样，导入图片即可下载一个 CUR 或 ANI。' : '为 Windows 的 15 个经典状态分别指定图片或动画，最后打包为可安装的方案。'}</p>
        </section>

        {mode === 'advanced' && (
          <section className="theme-panel panel" aria-label="指针方案状态">
            <div className="theme-panel-heading">
              <div>
                <span className="step-label">完整指针方案</span>
                <h2>逐个设计，每一种状态都算数。</h2>
                <p>已设置 {filledRoles}/{CURSOR_ROLES.length} · 选择状态后，在下方导入它的图片。</p>
              </div>
              <label className="theme-name">
                <span>方案名称</span>
                <input value={themeName} maxLength={60} onChange={(event) => setThemeName(event.target.value)} placeholder="为方案取个名字" />
              </label>
            </div>
            <div className="role-grid">
              {CURSOR_ROLES.map((role, index) => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-card${selectedRole === role.id ? ' is-selected' : ''}${themeDrafts[role.id]?.source ? ' is-ready' : ''}`}
                  onClick={() => { setSelectedRole(role.id); setError(null); setMessage(null) }}
                  aria-pressed={selectedRole === role.id}
                >
                  <span className="role-number">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{role.label}</strong>
                  <span className="role-status">{themeDrafts[role.id]?.source ? '✓ 已设置' : '＋ 待设置'}</span>
                </button>
              ))}
            </div>
            <div className="theme-panel-footer">
              <p>缺少的“水平调整”也已补齐。安装文件是 Windows 使用的 <code>install.inf</code>，不是 <code>.ini</code>。</p>
              <button type="button" onClick={() => {
                const arrow = themeDrafts.Arrow
                if (!arrow?.source) return
                setThemeDrafts((current) => Object.fromEntries(
                  CURSOR_ROLES.map((role) => [role.id, current[role.id] ?? arrow]),
                ) as Partial<Record<CursorRoleId, EditorDraft>>)
                setMessage('已将“正常选择”复制到空白状态；仍可逐一替换。')
              }} disabled={!themeDrafts.Arrow?.source || isExporting}>
                用“正常选择”补齐空白状态
              </button>
            </div>
            <div className="theme-export">
              <div>
                <strong>导出整套 Windows 指针方案</strong>
                <small>ZIP 内含 15 个 CUR/ANI、install.inf 和中英双语说明。先解压，再右键安装。</small>
              </div>
              <button type="button" className="button primary" onClick={exportThemeZip} disabled={isExporting || filledRoles !== CURSOR_ROLES.length}>
                {isExporting ? '正在生成…' : `下载主题 ZIP · ${filledRoles}/${CURSOR_ROLES.length}`}
              </button>
            </div>
          </section>
        )}

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
            <strong>{isLoading ? '正在本地解析…' : mode === 'advanced' ? `为“${CURSOR_ROLES.find((role) => role.id === selectedRole)?.label}”${source ? '替换' : '导入'}图片` : source ? '替换图片或动画' : '选择或拖入图片'}</strong>
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
                  onHotspotChange={(nextHotspot) => updateDraft((current) => ({ ...current, hotspot: nextHotspot }))}
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
                      onChange={(event) => updateDraft((current) => ({ ...current, smoothing: event.target.checked }))}
                    />
                    <span aria-hidden="true" />
                  </label>
                </div>

                {source.frames.length > 1 && (
                  <div className="control-group animation-controls">
                    <label>
                      <span className="control-title">播放速度</span>
                      <select value={speed} onChange={(event) => updateDraft((current) => ({ ...current, speed: Number(event.target.value) }))}>
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
                  onSelect={(nextIndex) => updateDraft((current) => ({ ...current, selectedFrameIndex: nextIndex }))}
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

            {mode === 'basic' && <section className="export-bar" aria-label="导出">
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
            </section>}
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
