// Compress + resize an image File before upload.
// Scales down to MAX_PX on the longest side and re-encodes as JPEG.
const MAX_PX       = 3000
const JPEG_QUALITY = 0.88

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  return /\.(heic|heif)$/i.test(file.name)
}

// Browsers other than Safari can't decode HEIC/HEIF in an <img> or <canvas> — the
// resize step below silently fails for it, so we convert it to JPEG first via a
// WASM decoder. After this, `file` is always a format every browser can draw.
async function toDecodableFile(file: File): Promise<File> {
  if (!isHeic(file)) return file
  const heic2any = (await import('heic2any')).default
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY })
  const blob = Array.isArray(converted) ? converted[0] : converted
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}

export async function compressImage(file: File): Promise<File> {
  let decodable: File
  try {
    decodable = await toDecodableFile(file)
  } catch {
    // Conversion failed (corrupt file, unsupported HEIC variant, etc.) — fall back
    // to the original file rather than blocking the whole upload.
    return file
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(decodable)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width: w, height: h } = img
      const scale = Math.min(1, MAX_PX / Math.max(w, h))
      const outW = Math.round(w * scale)
      const outH = Math.round(h * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, outW, outH)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(decodable); return }
          resolve(new File([blob], decodable.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(decodable) }
    img.src = url
  })
}
