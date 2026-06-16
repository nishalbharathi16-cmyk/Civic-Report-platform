import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function hash(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex')
}

// POST /api/seed — populate demo data (idempotent-ish: skips if already seeded)
export async function POST() {
  try {
    const result = { admins: 0, issues: 0, skipped: false }

    // Check if admins already exist
    const existingAdmins = await db.adminUser.count()
    if (existingAdmins > 0) {
      // Still seed sample issues if none exist
      const existingIssues = await db.issue.count()
      if (existingIssues > 0) {
        return NextResponse.json({
          success: true,
          message: 'Already seeded. Skipping.',
          result: { ...result, skipped: true },
        })
      }
    }

    // ── Seed admin users ──────────────────────────────────────
    const admins = [
      { name: 'Priya Sundaram', email: 'priya@chennaicorp.gov.in', password: 'admin123', role: 'super_admin' as const, ward: null },
      { name: 'Kumar Rajan', email: 'kumar@chennaicorp.gov.in', password: 'admin123', role: 'admin' as const, ward: 'Ward-12' },
      { name: 'Lakshmi Iyer', email: 'lakshmi@chennaicorp.gov.in', password: 'admin123', role: 'admin' as const, ward: 'Ward-08' },
      { name: 'Murugan S', email: 'murugan@chennaicorp.gov.in', password: 'admin123', role: 'admin' as const, ward: 'Ward-15' },
    ]

    for (const a of admins) {
      const exists = await db.adminUser.findUnique({ where: { email: a.email } })
      if (!exists) {
        await db.adminUser.create({
          data: {
            name: a.name,
            email: a.email,
            passwordHash: hash(a.password),
            role: a.role,
            ward: a.ward,
          },
        })
        result.admins++
      }
    }

    // ── Seed sample issues (Chennai coords) ───────────────────
    const chennaiCenter = { lat: 13.0827, lng: 80.2707 }
    const sampleIssues = [
      {
        type: 'pothole',
        description: 'Large pothole near bus stop causing accidents',
        lat: 13.0827 + 0.01, lng: 80.2707 + 0.01,
        address: 'Anna Salai, near Teynampet',
        ward: 'Ward-12',
        aiResult: 'real', aiConfidence: 0.94, status: 'pending',
      },
      {
        type: 'garbage',
        description: 'Garbage pile not collected for 3 days',
        lat: 13.0827 - 0.015, lng: 80.2707 + 0.02,
        address: 'T. Nagar, near Ranganathan Street',
        ward: 'Ward-12',
        aiResult: 'real', aiConfidence: 0.91, status: 'in_progress',
      },
      {
        type: 'light',
        description: 'Streetlight not working for past week',
        lat: 13.0827 + 0.02, lng: 80.2707 - 0.01,
        address: 'Adyar, near LB Road',
        ward: 'Ward-08',
        aiResult: 'real', aiConfidence: 0.88, status: 'pending',
      },
      {
        type: 'water',
        description: 'Water leak from main pipeline, road flooded',
        lat: 13.05 - 0.005, lng: 80.25 + 0.015,
        address: 'Mylapore, near Kapaleeshwarar Temple',
        ward: 'Ward-08',
        aiResult: 'uncertain', aiConfidence: 0.65, status: 'pending',
      },
      {
        type: 'pothole',
        description: 'Multiple potholes on this stretch',
        lat: 13.0 + 0.005, lng: 80.28 - 0.01,
        address: 'Velachery Main Road',
        ward: 'Ward-15',
        aiResult: 'real', aiConfidence: 0.96, status: 'resolved',
      },
      {
        type: 'garbage',
        description: 'Construction debris dumped on sidewalk',
        lat: 13.1 - 0.005, lng: 80.29 + 0.005,
        address: 'Tambaram, near GST Road',
        ward: 'Ward-15',
        aiResult: 'real', aiConfidence: 0.92, status: 'pending',
      },
      {
        type: 'other',
        description: 'Fallen tree blocking main road',
        lat: 13.07, lng: 80.26,
        address: 'Guindy, near Race Course',
        ward: 'Ward-12',
        aiResult: 'real', aiConfidence: 0.89, status: 'in_progress',
      },
    ]

    const year = new Date().getFullYear()
    let seq = await db.issue.count({ where: { issueId: { startsWith: `ISS-${year}-` } } })

    for (const s of sampleIssues) {
      seq++
      const issueId = `ISS-${year}-${String(seq).padStart(4, '0')}`
      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // last 7 days
      const resolvedAt = s.status === 'resolved' ? new Date(createdAt.getTime() + 18 * 60 * 60 * 1000) : null

      const issue = await db.issue.create({
        data: {
          issueId,
          type: s.type,
          status: s.status,
          photoUrl: `/uploads/placeholder-${s.type}.svg`,
          description: s.description,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          ward: s.ward,
          aiResult: s.aiResult,
          aiConfidence: s.aiConfidence,
          aiApiUsed: 'vlm-zai',
          aiCheckedAt: createdAt,
          resolvedAt,
          resolutionNote: s.status === 'resolved' ? 'Issue addressed by field team' : null,
          createdAt,
          updatedAt: createdAt,
        },
      })

      // timeline
      await db.issueTimeline.create({
        data: {
          issueId: issue.id,
          toStatus: 'pending',
          note: `Issue reported. AI detection: ${s.aiResult} (${Math.round(s.aiConfidence * 100)}%)`,
          actor: 'system',
          createdAt,
        },
      })
      if (s.status !== 'pending') {
        await db.issueTimeline.create({
          data: {
            issueId: issue.id,
            fromStatus: 'pending',
            toStatus: s.status,
            note: s.status === 'resolved' ? 'Resolved by field team' : 'Picked up by ward officer',
            actor: 'admin',
            createdAt: new Date(createdAt.getTime() + 4 * 60 * 60 * 1000),
          },
        })
      }

      result.issues++

      // Also log to AI detection log
      await db.aIDetectionLog.create({
        data: {
          imageUrl: `/uploads/placeholder-${s.type}.svg`,
          result: s.aiResult,
          confidence: s.aiConfidence,
          apiUsed: 'vlm-zai',
          reasoning: 'Seeded sample detection result',
          issueId: issue.id,
          createdAt,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${result.admins} admins and ${result.issues} issues.`,
      result,
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 })
  }
}
