import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/admin/ai-logs — list AI detection logs (super admin)
// Optional query: result filter, limit
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const result = searchParams.get('result') || undefined
    const limit = Math.min(Number(searchParams.get('limit') || 200), 500)

    const where = result ? { result } : {}
    const logs = await db.aIDetectionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const summary = {
      total: await db.aIDetectionLog.count(),
      real: await db.aIDetectionLog.count({ where: { result: 'real' } }),
      uncertain: await db.aIDetectionLog.count({ where: { result: 'uncertain' } }),
      aiGenerated: await db.aIDetectionLog.count({ where: { result: 'ai_generated' } }),
    }

    return NextResponse.json({ success: true, logs, summary })
  } catch (err) {
    console.error('AI logs error:', err)
    return NextResponse.json({ error: 'Failed to fetch AI logs' }, { status: 500 })
  }
}
