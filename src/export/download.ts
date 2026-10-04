export function downloadBytes(bytes: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function filenameStem(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  const withoutControlCharacters = Array.from(withoutExtension)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
  const safe = withoutControlCharacters
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return safe || 'cursor'
}
