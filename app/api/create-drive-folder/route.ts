import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceAccountAuth, ZEIKA_EMAIL } from '../../lib/googleWorkspace'
import { getSessionEmail } from '../../lib/sessionUser'

export async function POST(req: NextRequest) {
  try {
    const { folderName } = await req.json()
    if (!folderName || typeof folderName !== 'string') {
      return NextResponse.json({ error: 'Falta folderName' }, { status: 400 })
    }
    // Nunca confiar en un `clientEmail` del body — se deriva de la sesión autenticada, si hay,
    // para que esto no se pueda usar para mandarle una notificación de Drive con contenido
    // arbitrario (folderName) a un tercero.
    const clientEmail = await getSessionEmail(req)

    const auth  = getServiceAccountAuth()
    const drive = google.drive({ version: 'v3', auth })

    const folder = await drive.files.create({
      requestBody: {
        name:     folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    })

    const folderId = folder.data.id!

    await drive.permissions.create({
      fileId: folderId,
      sendNotificationEmail: true,
      requestBody: { type: 'user', role: 'writer', emailAddress: ZEIKA_EMAIL },
    })

    if (clientEmail) {
      await drive.permissions.create({
        fileId: folderId,
        sendNotificationEmail: true,
        requestBody: { type: 'user', role: 'writer', emailAddress: clientEmail },
      })
    }

    return NextResponse.json({
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      folderId,
    })
  } catch (err) {
    console.error('create-drive-folder error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
