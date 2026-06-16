import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/admin/analytics — cross-ward analytics for super admin
export async function GET() {
  try {
    const [totalIssues, totalResolved, totalRejected, wards, types, adminCount, aiLogsCount] = await Promise.all([
      db.issue.count(),
      db.issue.count({ where: { status: 'resolved' } }),
      db.issue.count({ where: { status: 'rejected' } }),
      db.issue.groupBy({
        by: ['ward'],
        _count: { _all: true },
        orderBy: { ward: 'asc' },
      }),
      db.issue.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      db.adminUser.count(),
      db.aIDetectionLog.count(),
    ])

    // Per-ward resolution breakdown
    const wardStats = await Promise.all(
      wards.map(async (w) => {
        const [resolved, pending, inProgress] = await Promise.all([
          db.issue.count({ where: { ward: w.ward, status: 'resolved' } }),
          db.issue.count({ where: { ward: w.ward, status: 'pending' } }),
          db.issue.count({ where: { ward: w.ward, status: 'in_progress' } }),
        ])
        return {
          ward: w.ward,
          total: w._count._all,
          resolved,
          pending,
          inProgress,
          resolutionRate: w._count._all > 0 ? Math.round((resolved / w._count._all) * 100) : 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      analytics: {
        totalIssues,
        totalResolved,
        totalRejected,
        adminCount,
        aiLogsCount,
        overallResolutionRate: totalIssues > 0 ? Math.round((totalResolved / totalIssues) * 100) : 0,
        wardStats,
        typeStats: types.map((t) => ({ type: t.type, count: t._count._all })),
      },
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
