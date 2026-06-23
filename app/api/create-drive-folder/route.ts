import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { folderName, clientEmail } = await req.json()

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    const drive = google.drive({ version: 'v3', auth })

    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    })

    const folderId = folder.data.id!

    await drive.permissions.create({
      fileId: folderId,
      sendNotificationEmail: false,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: 'zeika.memories@gmail.com',
      },
    })

    if (clientEmail) {
      await drive.permissions.create({
        fileId: folderId,
        sendNotificationEmail: false,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: clientEmail,
        },
      })
    }

    return NextResponse.json({
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
    })
  } catch (err) {
    console.error('create-drive-folder error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
