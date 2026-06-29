import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

const ZEIKA_EMAIL = 'zeika.memories@gmail.com'

function getServiceAccountAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  })
}

function buildRequests(bookName: string, extraText: boolean) {
  const sections = extraText
    ? [
        { title: 'TITULO DE TAPA',           hint: '(Escribi aca el titulo que queres en la tapa)' },
        { title: 'SUBTITULO / TEXTO DE TAPA', hint: '(Opcional - una fecha, un lugar, una frase corta)' },
        { title: 'CARTA / TEXTO 1',           hint: '(Indica en que parte del libro va este texto)' },
        { title: 'CARTA / TEXTO 2',           hint: '' },
        { title: 'CARTA / TEXTO 3',           hint: '' },
        { title: 'NOTAS PARA EL EQUIPO',      hint: '(Cualquier aclaracion sobre el estilo, tono, etc.)' },
      ]
    : [
        { title: 'TITULO DE TAPA',               hint: '(Escribi aca el titulo que queres en la tapa)' },
        { title: 'SUBTITULO / TEXTO DE TAPA',    hint: '(Opcional - una fecha, un lugar, una frase corta)' },
        { title: 'TEXTO EXTRA (dedicatoria, pie de foto, etc.)', hint: '(Opcional)' },
      ]

  // Build the full text to insert (bottom-up for index safety, but we insert all at once at index 1)
  const lines: string[] = [
    `TEXTOS PARA EL FOTOLIBRO - ${bookName}`,
    '',
  ]
  for (const s of sections) {
    lines.push('------------------------------')
    lines.push(s.title)
    lines.push('------------------------------')
    if (s.hint) lines.push(s.hint)
    lines.push('')
    lines.push('')
  }

  const text = lines.join('\n')

  return [
    {
      insertText: {
        location: { index: 1 },
        text,
      },
    },
  ]
}

export async function POST(req: NextRequest) {
  try {
    const { bookName, clientEmail, extraText, folderId } = await req.json()

    const auth  = getServiceAccountAuth()
    const drive = google.drive({ version: 'v3', auth })
    const docs  = google.docs({ version: 'v1', auth })

    // Step 1: create empty Google Doc inside the folder (metadata only, no multipart upload)
    const file = await drive.files.create({
      requestBody: {
        name:     `Textos - ${bookName}`,
        mimeType: 'application/vnd.google-apps.document',
        ...(folderId ? { parents: [folderId] } : {}),
      },
      fields: 'id',
    })

    const docId = file.data.id!

    // Step 2: insert template content via Docs API (plain JSON, no upload issues)
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: buildRequests(bookName, extraText ?? false) },
    })

    // Step 3: share with Zeika and client
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
