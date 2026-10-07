export const CURSOR_ROLES = [
  { id: 'Arrow', label: '正常选择', file: 'arrow' },
  { id: 'Help', label: '帮助', file: 'help' },
  { id: 'AppStarting', label: '后台运行', file: 'app-starting' },
  { id: 'Wait', label: '忙', file: 'wait' },
  { id: 'Crosshair', label: '精确选择', file: 'crosshair' },
  { id: 'IBeam', label: '文本选择', file: 'text' },
  { id: 'NWPen', label: '手写', file: 'handwriting' },
  { id: 'No', label: '不可用', file: 'unavailable' },
  { id: 'SizeNS', label: '垂直调整', file: 'resize-vertical' },
  { id: 'SizeWE', label: '水平调整', file: 'resize-horizontal' },
  { id: 'SizeNWSE', label: '对角线左', file: 'resize-nwse' },
  { id: 'SizeNESW', label: '对角线右', file: 'resize-nesw' },
  { id: 'SizeAll', label: '移动', file: 'move' },
  { id: 'UpArrow', label: '候选', file: 'alternate' },
  { id: 'Hand', label: '链接选择', file: 'link' },
] as const

export type CursorRoleId = (typeof CURSOR_ROLES)[number]['id']
