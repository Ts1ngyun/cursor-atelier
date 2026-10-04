import { describe, expect, it } from 'vitest'
import { filenameStem } from './download'

describe('filenameStem', () => {
  it('removes extensions and Windows-reserved characters', () => {
    expect(filenameStem('my:cursor?.png')).toBe('my-cursor')
  })

  it('provides a fallback name', () => {
    expect(filenameStem('?.png')).toBe('cursor')
  })
})
