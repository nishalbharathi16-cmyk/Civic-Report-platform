import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST /api/upload — accept a base64 image data URL, save it to /public/uploads,
// return the public URL path.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dataUrl } = body || {}

    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return NextResponse.json({ error: 'A base64 data URL is required' }, { status: 400 })
    }

    // Parse "data:image/jpeg;base64,..."
    const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
    if (!match) {
      return NextResponse.json({ error: 'Invalid image data URL' }, { status: 400 })
    }

    const mime = match[1]
    const base64 = match[2]
    const ext = mime.split('/')[1].split('+')[0] // jpeg -> jpg
    const fileName = `issue-${crypto.randomBytes(8).toString('hex')}.${ext === 'jpeg' ? 'jpg' : ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, Buffer.from(base64, 'base64'))

    // Return a relative path so the browser can load it directly
    const publicUrl = `/uploads/${fileName}`

    return NextResponse.json({ success: true, url: publicUrl, mime, size: base64.length })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
