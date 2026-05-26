import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from '../push'

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url string with implicit padding to UTF-8 bytes', () => {
    // "hello world" — base64url has no trailing "="
    const decoded = urlBase64ToUint8Array('aGVsbG8gd29ybGQ')
    expect(new TextDecoder().decode(decoded)).toBe('hello world')
  })

  it('round-trips a 65-byte buffer (the shape of an EC P-256 VAPID key)', () => {
    const bytes = new Uint8Array(65)
    for (let i = 0; i < 65; i++) bytes[i] = (i * 7) % 256
    const std = btoa(String.fromCharCode(...bytes))
    const urlSafe = std.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const decoded = urlBase64ToUint8Array(urlSafe)
    expect(Array.from(decoded)).toEqual(Array.from(bytes))
  })

  it('translates URL-safe alphabet (- and _) back to standard base64', () => {
    // base64url "-_-_" → standard "+/+/" → bytes [0xFB, 0xFF, 0xBF]
    const decoded = urlBase64ToUint8Array('-_-_')
    expect(Array.from(decoded)).toEqual([0xfb, 0xff, 0xbf])
  })
})
