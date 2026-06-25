import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'

const ZEIKA_EMAIL = 'zeika.memories@gmail.com'

function getZeikaAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.ZEIKA_OAUTH_CLIENT_ID,
    process.env.ZEIKA_OAUTH_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: process.env.ZEIKA_OAUTH_REFRESH_TOKEN })
  return oauth2Client
}

function buildTemplate(bookName: string, extraText: boolean): string {
  if (extraText) {
    return [
      `TEXTOS PARA EL FOTOLIBRO — ${bookName}`,
      '',
      '──────────────────────────────',
      'TÍTULO DE TAPA',
      '──────────────────────────────',
      '(Escribí acá el título que querés en la tapa)',
      '',
      '',
      '──────────────────────────────',
      'SUBTÍTULO / TEXTO DE TAPA',
      '──────────────────────────────',
      '(Opcional — una fecha, un lugar, una frase corta)',
      '',
      '',
      '──────────────────────────────',
      'CARTA / TEXTO 1',
      '──────────────────────────────',
      '(Indicá en qué parte del libro va este texto)',
      '',
      '',
      '──────────────────────────────',
      'CARTA / TEXTO 2',
      '──────────────────────────────',
      '',
      '',
      '──────────────────────────────',
      'CARTA / TEXTO 3',
      '──────────────────────────────',
      '',
      '',
      '──────────────────────────────',
      'NOTAS PARA EL EQUIPO',
      '──────────────────────────────',
      '(Cualquier aclaración sobre el estilo, tono, etc.)',
    ].join('\n')
  }

  return [
    `TEXTOS PARA EL FOTOLIBRO — ${bookName}`,
    '',
    '──────────────────────────────',
    'TÍTULO DE TAPA',
    '──────────────────────────────',
    '(Escribí acá el título que querés en la tapa)',
    '',
    '',
    '──────────────────────────────',
    'SUBTÍTULO / TEXTO DE TAPA',
    '──────────────────────────────',
    '(Opcional — una fecha, un lugar, una frase corta)',
    '',
    '',
    '──────────────────────────────',
    'TEXTO EXTRA (dedicatoria, pie de foto, etc.)',
    '──────────────────────────────',
    '(Opcional)',
  ].join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const { bookName, clientEmail, extraText, folderId } = await req.json()

    const auth  = getZeikaAuth()
    const drive = google.drive({ version: 'v3', auth })

    // Create a Google Doc via Drive API (upload plain text → convert to Docs format)
    const templateText = buildTemplate(bookName, extraText ?? false)
    const stream = Readable.from([Buffer.from(templateText, 'utf-8')])

    const file = await drive.files.create({
      requestBody: {
        name:     `Textos — ${bookName}`,
        mimeType: 'application/vnd.google-apps.document',
        ...(folderId ? { parents: [folderId] } : {}),
      },
      media: {
        mimeType: 'text/plain',
        body:     stream,
      },
      fields: 'id',
    })

    const docId = file.data.id!

    // Share with Zeika and client
    await drive.permissions.create({
      fileId: docId,
      sendNotificationEmail: false,
      requestBody: { type: 'user', role: 'writer', emailAddress: ZEIKA_EMAIL },
    })

    if (clientEmail) {
      await drive.permissions.create({
        fileId: docId,
        sendNotificationEmail: false,
        requestBody: { type: 'user', role: 'writer', emailAddress: clientEmail },
      })
    }

    return NextResponse.json({
      docsUrl: `https://docs.google.com/document/d/${docId}/edit`,
    })
  } catch (err) {
    console.error('create-docs error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
