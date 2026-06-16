import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// POST /api/issues/[id]/like — toggle like for a given device
// Body: { deviceId, authorName? } (only deviceId is required)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { deviceId } = body || {}

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    const issue = await db.issue.findFirst({
      where: { OR: [{ issueId: id }, { id }] },
      select: { id: true },
    })
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const existing = await db.issueLike.findUnique({
      where: { issueId_deviceId: { issueId: issue.id, deviceId } },
    })

    if (existing) {
      await db.issueLike.delete({ where: { id: existing.id } })
      const likesCount = await db.issueLike.count({ where: { issueId: issue.id } })
      return NextResponse.json({ success: true, liked: false, likesCount })
    } else {
      await db.issueLike.create({ data: { issueId: issue.id, deviceId } })
      const likesCount = await db.issueLike.count({ where: { issueId: issue.id } })
      return NextResponse.json({ success: true, liked: true, likesCount })
    }
  } catch (err) {
    console.error('Toggle like error:', err)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
