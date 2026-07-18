import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceAccountAuth, buildDocsTemplateRequests, ZEIKA_EMAIL } from '../../lib/googleWorkspace'
import { getSessionEmail } from '../../lib/sessionUser'

export async function POST(req: NextRequest) {
  try {
    const { bookName, extraText, folderId } = await req.json()
    // Nunca confiar en un `clientEmail` del body — se deriva de la sesión autenticada, si hay
    // (mismo motivo que en /api/create-drive-folder).
    const clientEmail = await getSessionEmail(req)

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
      requestBody: { requests: buildDocsTemplateRequests(bookName, extraText ?? false) },
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
