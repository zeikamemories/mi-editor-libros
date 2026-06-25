import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

function getZeikaAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.ZEIKA_OAUTH_CLIENT_ID,
    process.env.ZEIKA_OAUTH_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: process.env.ZEIKA_OAUTH_REFRESH_TOKEN })
  return oauth2Client
}

export async function POST(req: NextRequest) {
  try {
    const { folderName, clientEmail } = await req.json()

    const auth  = getZeikaAuth()
    const drive = google.drive({ version: 'v3', auth })

    const folder = await drive.files.create({
      requestBody: {
        name:     folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    })

    const folderId = folder.data.id!

    if (clientEmail) {
      await drive.permissions.create({
        fileId: folderId,
        sendNotificationEmail: false,
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
