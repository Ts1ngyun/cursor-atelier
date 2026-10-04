import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'

const outputDirectory = new URL('../samples-private/', import.meta.url)

function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
}

const crcTable = makeCrcTable()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type, 'ascii')
  const output = Buffer.alloc(12 + data.length)
  output.writeUInt32BE(data.length, 0)
  name.copy(output, 4)
  data.copy(output, 8)
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length)
  return output
}

function createPng(width, height, paint) {
  const scanlines = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4)
    scanlines[rowOffset] = 0
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = paint(x, y)
      const offset = rowOffset + 1 + x * 4
      scanlines[offset] = red
      scanlines[offset + 1] = green
      scanlines[offset + 2] = blue
      scanlines[offset + 3] = alpha
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function cursorShape(offsetX, color) {
  return (x, y) => {
    const localX = x - offsetX
    const inArrow = localX >= 5 && localX <= 30 && y >= 4 && y <= 43 && localX <= 5 + (y - 4) * 0.7
    const inStem = localX >= 17 && localX <= 24 && y >= 30 && y <= 54
    if (!inArrow && !inStem) return [0, 0, 0, 0]
    const edge = localX < 7 || y < 6 || localX > 28
    return edge ? [25, 35, 30, 255] : [...color, 255]
  }
}

await mkdir(outputDirectory, { recursive: true })
await writeFile(new URL('smoke-static.png', outputDirectory), createPng(64, 64, cursorShape(0, [54, 148, 105])))
await writeFile(new URL('frame-01.png', outputDirectory), createPng(64, 64, cursorShape(0, [54, 148, 105])))
await writeFile(new URL('frame-02.png', outputDirectory), createPng(64, 64, cursorShape(4, [225, 135, 65])))
await writeFile(new URL('frame-03.png', outputDirectory), createPng(64, 64, cursorShape(8, [93, 117, 190])))
await writeFile(
  new URL('smoke-animation.gif', outputDirectory),
  Buffer.from(
    'R0lGODlhAgACAPAAAP///wAAACH5BAAAAAAALAAAAAACAAIAAAICRAEAIfkEAAAAAAAsAAAAAAIAAgAAAgJEADs=',
    'base64',
  ),
)

console.log('Smoke fixtures written to samples-private/.')
