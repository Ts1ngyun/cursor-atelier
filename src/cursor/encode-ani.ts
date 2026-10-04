const encoder = new TextEncoder()

type AniOptions = {
  curFrames: Uint8Array[]
  delaysMs: number[]
}

function ascii(value: string): Uint8Array {
  return encoder.encode(value)
}

function writeFourCC(target: Uint8Array, offset: number, value: string) {
  if (value.length !== 4) {
    throw new Error('RIFF identifiers must contain four ASCII characters.')
  }
  target.set(ascii(value), offset)
}

function makeChunk(id: string, data: Uint8Array): Uint8Array {
  const paddedLength = data.byteLength + (data.byteLength % 2)
  const chunk = new Uint8Array(8 + paddedLength)
  const view = new DataView(chunk.buffer)
  writeFourCC(chunk, 0, id)
  view.setUint32(4, data.byteLength, true)
  chunk.set(data, 8)
  return chunk
}

export function delayMsToJiffies(delayMs: number): number {
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return 1
  }
  return Math.max(1, Math.round((delayMs * 60) / 1000))
}

export function encodeAni({ curFrames, delaysMs }: AniOptions): Uint8Array {
  if (curFrames.length < 2) {
    throw new RangeError('ANI export requires at least two cursor frames.')
  }
  if (curFrames.length !== delaysMs.length) {
    throw new RangeError('Each ANI frame must have one delay value.')
  }

  const rates = delaysMs.map(delayMsToJiffies)
  const anihData = new Uint8Array(36)
  const anihView = new DataView(anihData.buffer)
  anihView.setUint32(0, 36, true)
  anihView.setUint32(4, curFrames.length, true)
  anihView.setUint32(8, curFrames.length, true)
  anihView.setUint32(12, 0, true)
  anihView.setUint32(16, 0, true)
  anihView.setUint32(20, 0, true)
  anihView.setUint32(24, 0, true)
  anihView.setUint32(28, rates[0], true)
  anihView.setUint32(32, 1, true)

  const rateData = new Uint8Array(rates.length * 4)
  const rateView = new DataView(rateData.buffer)
  rates.forEach((rate, index) => rateView.setUint32(index * 4, rate, true))

  const iconChunks = curFrames.map((frame) => makeChunk('icon', frame))
  const framSize = 4 + iconChunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const framList = new Uint8Array(8 + framSize)
  const framView = new DataView(framList.buffer)
  writeFourCC(framList, 0, 'LIST')
  framView.setUint32(4, framSize, true)
  writeFourCC(framList, 8, 'fram')
  let framOffset = 12
  for (const chunk of iconChunks) {
    framList.set(chunk, framOffset)
    framOffset += chunk.byteLength
  }

  const chunks = [makeChunk('anih', anihData), makeChunk('rate', rateData), framList]
  const riffLength = 12 + chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const output = new Uint8Array(riffLength)
  const view = new DataView(output.buffer)
  writeFourCC(output, 0, 'RIFF')
  view.setUint32(4, riffLength - 8, true)
  writeFourCC(output, 8, 'ACON')

  let offset = 12
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }

  return output
}
