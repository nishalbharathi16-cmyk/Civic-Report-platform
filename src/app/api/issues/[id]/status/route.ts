import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// PATCH /api/issues/[id]/status — update issue status (admin only for real app)
// Body: { status, note?, actor? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, note, actor } = body || {}

    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const issue = await db.issue.findFirst({
      where: { OR: [{ issueId: id }, { id }] },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const fromStatus = issue.status
    const updated = await db.issue.update({
      where: { id: issue.id },
      data: {
        status,
        resolutionNote: status === 'resolved' || status === 'rejected' ? (note || issue.resolutionNote) : issue.resolutionNote,
        resolvedAt: status === 'resolved' ? new Date() : issue.resolvedAt,
      },
    })

    await db.issueTimeline.create({
      data: {
        issueId: issue.id,
        fromStatus,
        toStatus: status,
        note: note || null,
        actor: actor || 'admin',
      },
    })

    return NextResponse.json({ success: true, issue: updated })
  } catch (err) {
    console.error('Update status error:', err)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
