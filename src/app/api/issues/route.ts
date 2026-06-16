import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// Generate human-readable ID like ISS-2026-0042
async function generateIssueId(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `ISS-${year}-`
  const count = await db.issue.count({
    where: { issueId: { startsWith: prefix } },
  })
  const seq = String(count + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

// POST /api/issues — create a new issue (public, no auth)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      type, photoUrl, description, lat, lng, address, ward,
      aiResult, aiConfidence, aiApiUsed,
      authorName, authorAvatar,
    } = body || {}

    if (!type || !photoUrl || lat == null || lng == null) {
      return NextResponse.json(
        { error: 'Missing required fields: type, photoUrl, lat, lng' },
        { status: 400 }
      )
    }

    if (aiResult === 'ai_generated') {
      return NextResponse.json(
        { error: 'AI-generated image detected. Issue rejected.', aiResult, aiConfidence },
        { status: 422 }
      )
    }

    const issueId = await generateIssueId()
    const safeAuthorName = (authorName || 'anonymous_citizen').slice(0, 40)
    const safeAuthorAvatar = (authorAvatar || '🦊').slice(0, 8)

    const issue = await db.issue.create({
      data: {
        issueId,
        type,
        status: 'pending',
        photoUrl,
        description: description?.slice(0, 500) ?? null,
        lat: Number(lat),
        lng: Number(lng),
        address: address?.slice(0, 200) ?? null,
        ward: ward || 'Ward-12',
        authorName: safeAuthorName,
        authorAvatar: safeAuthorAvatar,
        aiResult,
        aiConfidence: Number(aiConfidence) || 0,
        aiApiUsed: aiApiUsed || 'vlm-zai',
      },
    })

    await db.issueTimeline.create({
      data: {
        issueId: issue.id,
        toStatus: 'pending',
        note: `Issue reported via citizen feed. AI detection: ${aiResult} (${Math.round((Number(aiConfidence) || 0) * 100)}% confidence)`,
        actor: 'system',
      },
    })

    try {
      const latestLog = await db.aIDetectionLog.findFirst({
        orderBy: { createdAt: 'desc' },
      })
      if (latestLog && !latestLog.issueId) {
        await db.aIDetectionLog.update({
          where: { id: latestLog.id },
          data: { issueId: issue.id },
        })
      }
    } catch {
      // non-critical
    }

    return NextResponse.json({ success: true, issue }, { status: 201 })
  } catch (err) {
    console.error('Create issue error:', err)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}

// GET /api/issues — list issues (with optional filters)
// Query params: status, type, ward, aiResult, limit, search, deviceId (for likedByMe)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const ward = searchParams.get('ward') || undefined
    const aiResult = searchParams.get('aiResult') || undefined
    const search = searchParams.get('search') || undefined
    const authorName = searchParams.get('authorName') || undefined
    const deviceId = searchParams.get('deviceId') || undefined
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    if (ward) where.ward = ward
    if (aiResult) where.aiResult = aiResult
    if (authorName) where.authorName = authorName
    if (search) {
      where.OR = [
        { issueId: { contains: search } },
        { description: { contains: search } },
        { address: { contains: search } },
        { authorName: { contains: search } },
      ]
    }

    const issues = await db.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        timeline: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' }, take: 3 },
        likes: deviceId ? { where: { deviceId } } : false,
      },
    })

    // Tack on counts + likedByMe flag
    const enriched = await Promise.all(
      issues.map(async (i) => {
        const [likesCount, commentsCount] = await Promise.all([
          db.issueLike.count({ where: { issueId: i.id } }),
          db.issueComment.count({ where: { issueId: i.id } }),
        ])
        return {
          ...i,
          likesCount,
          commentsCount,
          likedByMe: deviceId ? (i.likes?.some((l) => l.deviceId === deviceId) ?? false) : false,
          likes: undefined, // don't leak all likes
        }
      })
    )

    return NextResponse.json({ success: true, count: enriched.length, issues: enriched })
  } catch (err) {
    console.error('List issues error:', err)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}
