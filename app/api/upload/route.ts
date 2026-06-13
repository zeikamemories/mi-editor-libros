import { v2 as cloudinary } from 'cloudinary'
import { NextRequest, NextResponse } from 'next/server'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type) && file.type !== '') {
      return NextResponse.json({ error: 'Formato no permitido' }, { status: 400 })
    }

    const folder = (formData.get('folder') as string | null) ?? 'zeika/fotos'
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<{
      secure_url: string
      public_id:  string
      width:      number
      height:     number
    }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type:  'image',
          format:         'jpg',
          transformation: [{ format: 'jpg', quality: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            console.error('[upload] Cloudinary error:', JSON.stringify(error, null, 2))
            reject(error ?? new Error('Upload failed'))
          } else {
            resolve(result as typeof result & { width: number; height: number })
          }
        },
      ).end(buffer)
    })

    return NextResponse.json({
      url:      result.secure_url,
      publicId: result.public_id,
      width:    result.width,
      height:   result.height,
    })
  } catch (err) {
    console.error('[upload] Cloudinary error:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
