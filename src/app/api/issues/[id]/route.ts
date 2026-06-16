import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/issues/[id] — fetch a single issue by issueId or cuid
// Also accepts ?id=... query style for the public tracking page
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Try by issueId first (human-readable), then by cuid
    const issue = await db.issue.findFirst({
      where: {
        OR: [{ issueId: id }, { id }],
      },
      include: { timeline: { orderBy: { createdAt: 'asc' } } },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, issue })
  } catch (err) {
    console.error('Get issue error:', err)
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 })
  }
}
