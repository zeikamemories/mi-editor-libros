import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

const ZEIKA_EMAIL = 'zeika.memories@gmail.com'

function getServiceAccountAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

export async function POST(req: NextRequest) {
  try {
    const { folderName, clientEmail } = await req.json()

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
