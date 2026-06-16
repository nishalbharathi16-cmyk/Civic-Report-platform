import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/issues/[id]/comments — list all comments for an issue
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const issue = await db.issue.findFirst({
      where: { OR: [{ issueId: id }, { id }] },
      select: { id: true },
    })
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const comments = await db.issueComment.findMany({
      where: { issueId: issue.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    return NextResponse.json({ success: true, comments })
  } catch (err) {
    console.error('List comments error:', err)
    return NextResponse.json({ error: 'Failed to list comments' }, { status: 500 })
  }
}

// POST /api/issues/[id]/comments — add a comment
// Body: { text, authorName?, authorAvatar?, deviceId? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { text, authorName, authorAvatar } = body || {}

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }
    if (text.length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })
    }

    const issue = await db.issue.findFirst({
      where: { OR: [{ issueId: id }, { id }] },
      select: { id: true },
    })
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const comment = await db.issueComment.create({
      data: {
        issueId: issue.id,
        text: text.trim().slice(0, 500),
        authorName: (authorName || 'anonymous_citizen').slice(0, 40),
        authorAvatar: (authorAvatar || '🦊').slice(0, 8),
      },
    })

    const commentsCount = await db.issueComment.count({ where: { issueId: issue.id } })

    return NextResponse.json({ success: true, comment, commentsCount }, { status: 201 })
  } catch (err) {
    console.error('Create comment error:', err)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
