import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/stats — dashboard statistics
// Optional query: ward (to filter by ward)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ward = searchParams.get('ward') || undefined

    const where = ward ? { ward } : {}

    const [total, pending, inProgress, resolved, rejected, aiReal, aiUncertain, aiGenerated, today] = await Promise.all([
      db.issue.count({ where }),
      db.issue.count({ where: { ...where, status: 'pending' } }),
      db.issue.count({ where: { ...where, status: 'in_progress' } }),
      db.issue.count({ where: { ...where, status: 'resolved' } }),
      db.issue.count({ where: { ...where, status: 'rejected' } }),
      db.issue.count({ where: { ...where, aiResult: 'real' } }),
      db.issue.count({ where: { ...where, aiResult: 'uncertain' } }),
      db.issue.count({ where: { ...where, aiResult: 'ai_generated' } }),
      db.issue.count({
        where: {
          ...where,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ])

    // Average resolution time (hours) for resolved issues
    const resolvedIssues = await db.issue.findMany({
      where: { ...where, status: 'resolved', resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    })

    let avgResolutionHours = 0
    if (resolvedIssues.length > 0) {
      const totalMs = resolvedIssues.reduce((sum, i) => {
        if (i.resolvedAt) return sum + (i.resolvedAt.getTime() - i.createdAt.getTime())
        return sum
      }, 0)
      avgResolutionHours = totalMs / resolvedIssues.length / (1000 * 60 * 60)
    }

    // Issues by type
    const byType = await db.issue.groupBy({
      by: ['type'],
      _count: { _all: true },
      where,
    })

    // Issues by ward
    const byWard = await db.issue.groupBy({
      by: ['ward'],
      _count: { _all: true },
      where,
    })

    return NextResponse.json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        today,
        aiReal,
        aiUncertain,
        aiGenerated,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        byType: byType.map((b) => ({ type: b.type, count: b._count._all })),
        byWard: byWard.map((b) => ({ ward: b.ward, count: b._count._all })),
      },
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
