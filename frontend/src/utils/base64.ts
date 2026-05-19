/** UTF-8 safe Base64 helpers for WebView / older Android where btoa(unicode) fails. */

export function encodeUtf8ToBase64(text: string): string {
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    const chunkSize = 0x8000
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const slice = bytes.subarray(index, index + chunkSize)
      binary += String.fromCharCode(...slice)
    }
    return btoa(binary)
  }

  return btoa(
    encodeURIComponent(text).replace(/%([0-9A-F]{2})/gi, (_match, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    ),
  )
}

export function decodeBase64ToUtf8(base64: string): string {
  const normalized = base64.replace(/\s+/g, '')

  if (typeof TextDecoder !== 'undefined') {
    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new TextDecoder().decode(bytes)
  }

  return decodeURIComponent(
    atob(normalized)
      .split('')
      .map(char => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(''),
  )
}
