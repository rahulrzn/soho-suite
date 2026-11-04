import type { DownloadResult } from '../api/apiTransport'

export function saveCsvDownload(result: DownloadResult, fallback: string) {
  const filename = [...(result.filename ?? fallback).split(/[\\/]/).pop()!]
    .map((character) => {
      const code = character.codePointAt(0)!
      return code < 32 || code === 127 ? '_' : character
    })
    .join('')
  const safeName = filename.toLowerCase().endsWith('.csv') ? filename : filename + '.csv'
  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
