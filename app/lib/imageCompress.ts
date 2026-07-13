// Compress + resize an image File before upload.
// Scales down to MAX_PX on the longest side and re-encodes as JPEG.
const MAX_PX       = 3000
const JPEG_QUALITY = 0.88

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
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
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
