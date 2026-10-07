import { encodeZip, type ZipEntry } from '../export/encode-zip'
import { CURSOR_ROLES, type CursorRoleId } from './roles'

export type ThemeCursor = { bytes: Uint8Array; extension: 'cur' | 'ani' }
export type ThemeCursors = Record<CursorRoleId, ThemeCursor>

function encodeUtf16Le(text: string): Uint8Array {
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes.set([0xff, 0xfe])
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < text.length; index += 1) {
    view.setUint16(2 + index * 2, text.charCodeAt(index), true)
  }
  return bytes
}

function folderName(name: string): string {
  let hash = 2166136261
  for (const character of name) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }
  return `theme-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function buildThemePackage(rawName: string, cursors: ThemeCursors): Uint8Array {
  const name = Array.from(rawName.trim())
    .filter((character) => character.charCodeAt(0) >= 32 && character !== '"' && character !== '%')
    .join('')
    .slice(0, 60)
  if (!name) throw new Error('请填写方案名称。')
  const folder = `Cursors\\CursorAtelier\\${folderName(name)}`
  const cursorFiles = CURSOR_ROLES.map((role) => {
    const cursor = cursors[role.id]
    if (!cursor?.bytes.length || !['cur', 'ani'].includes(cursor.extension)) {
      throw new Error(`缺少「${role.label}」的指针文件。`)
    }
    return { name: `${role.file}.${cursor.extension}`, bytes: cursor.bytes }
  })
  const paths = cursorFiles.map((file) => `%10%\\${folder}\\${file.name}`)
  const inf = [
    '[Version]',
    'Signature="$CHICAGO$"',
    'Provider="Ts1ngyun"',
    '',
    '[DefaultInstall]',
    'CopyFiles=Cursor.Files',
    'AddReg=Cursor.Scheme',
    '',
    '[DestinationDirs]',
    `Cursor.Files=10,"${folder}"`,
    '',
    '[Cursor.Files]',
    ...cursorFiles.map((file) => file.name),
    '',
    '[Cursor.Scheme]',
    `HKCU,"Control Panel\\Cursors\\Schemes","${name}",0x00000000,"${paths.join(',')}"`,
    '',
    '[SourceDisksNames]',
    '1="Cursor Atelier"',
    '',
    '[SourceDisksFiles]',
    ...cursorFiles.map((file) => `${file.name}=1`),
    '',
  ].join('\r\n')
  const instructions = [
    'Cursor Atelier — 鼠标指针方案安装',
    '',
    '1. 先完整解压 ZIP，不要直接在压缩包内运行。',
    '2. 右键单击 install.inf，选择“安装”。Windows 11 可能需要先点“显示更多选项”。',
    '3. 打开“鼠标属性”→“指针”，在“方案”中选择本方案并点击“应用”。',
    '4. 如需卸载，在“鼠标属性”中切换方案，再手动删除注册的方案和指针文件。',
    '',
    'Cursor Atelier — Cursor scheme installation',
    '',
    '1. Extract the complete ZIP before installing.',
    '2. Right-click install.inf and choose Install (on Windows 11, use Show more options if needed).',
    '3. Open Mouse Properties > Pointers, select this scheme, then click Apply.',
    '',
    'This INF registers a per-user cursor scheme. It does not auto-apply it.',
  ].join('\r\n')
  const entries: ZipEntry[] = [
    { name: 'install.inf', bytes: encodeUtf16Le(inf) },
    { name: 'README.txt', bytes: encodeUtf16Le(instructions) },
    ...cursorFiles,
  ]
  return encodeZip(entries)
}
