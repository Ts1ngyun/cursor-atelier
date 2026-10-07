export type ZipEntry = { name: string; bytes: Uint8Array }

const encoder = new TextEncoder()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function put16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function put32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true)
}

/** ZIP32, with uncompressed entries so no third-party compressor is required. */
export function encodeZip(entries: ZipEntry[]): Uint8Array {
  if (entries.length === 0 || entries.length > 0xffff) {
    throw new RangeError('ZIP 条目数量无效。')
  }
  const names = new Set<string>()
  const records = entries.map(({ name, bytes }) => {
    if (!name || name.includes('..') || name.startsWith('/') || name.includes('\\') || names.has(name)) {
      throw new Error(`ZIP 文件名无效或重复：${name}`)
    }
    names.add(name)
    if (bytes.byteLength > 0xffffffff) throw new RangeError('ZIP 文件过大。')
    const nameBytes = encoder.encode(name)
    if (nameBytes.byteLength > 0xffff) throw new RangeError('ZIP 文件名过长。')
    return { nameBytes, bytes, crc: crc32(bytes) }
  })
  const localSize = records.reduce((sum, item) => sum + 30 + item.nameBytes.length + item.bytes.length, 0)
  const centralSize = records.reduce((sum, item) => sum + 46 + item.nameBytes.length, 0)
  if (localSize + centralSize + 22 > 0xffffffff) throw new RangeError('ZIP 总大小过大。')
  const output = new Uint8Array(localSize + centralSize + 22)
  const view = new DataView(output.buffer)
  const offsets: number[] = []
  let cursor = 0

  for (const item of records) {
    offsets.push(cursor)
    put32(view, cursor, 0x04034b50)
    put16(view, cursor + 4, 20)
    put16(view, cursor + 6, 0x0800)
    put32(view, cursor + 14, item.crc)
    put32(view, cursor + 18, item.bytes.length)
    put32(view, cursor + 22, item.bytes.length)
    put16(view, cursor + 26, item.nameBytes.length)
    output.set(item.nameBytes, cursor + 30)
    output.set(item.bytes, cursor + 30 + item.nameBytes.length)
    cursor += 30 + item.nameBytes.length + item.bytes.length
  }

  const centralOffset = cursor
  records.forEach((item, index) => {
    put32(view, cursor, 0x02014b50)
    put16(view, cursor + 4, 20)
    put16(view, cursor + 6, 20)
    put16(view, cursor + 8, 0x0800)
    put32(view, cursor + 16, item.crc)
    put32(view, cursor + 20, item.bytes.length)
    put32(view, cursor + 24, item.bytes.length)
    put16(view, cursor + 28, item.nameBytes.length)
    put32(view, cursor + 42, offsets[index])
    output.set(item.nameBytes, cursor + 46)
    cursor += 46 + item.nameBytes.length
  })

  put32(view, cursor, 0x06054b50)
  put16(view, cursor + 8, records.length)
  put16(view, cursor + 10, records.length)
  put32(view, cursor + 12, centralSize)
  put32(view, cursor + 16, centralOffset)
  return output
}
