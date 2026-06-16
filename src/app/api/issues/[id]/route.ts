import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/issues/[id] — fetch a single issue by issueId or cuid
// Optional ?deviceId=... to compute likedByMe
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('deviceId') || undefined

    const issue = await db.issue.findFirst({
      where: { OR: [{ issueId: id }, { id }] },
      include: {
        timeline: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' }, take: 100 },
        likes: deviceId ? { where: { deviceId } } : false,
      },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const [likesCount, commentsCount] = await Promise.all([
      db.issueLike.count({ where: { issueId: issue.id } }),
      db.issueComment.count({ where: { issueId: issue.id } }),
    ])

    return NextResponse.json({
      success: true,
      issue: {
        ...issue,
        likesCount,
        commentsCount,
        likedByMe: deviceId ? (issue.likes?.some((l) => l.deviceId === deviceId) ?? false) : false,
        likes: undefined,
      },
    })
  } catch (err) {
    console.error('Get issue error:', err)
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 })
  }
}
