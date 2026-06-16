import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function hash(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex')
}

// POST /api/seed — populate demo data with author info, likes, comments
export async function POST() {
  try {
    const result = { admins: 0, issues: 0, comments: 0, likes: 0, skipped: false }

    const existingAdmins = await db.adminUser.count()
    if (existingAdmins > 0) {
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

    // ── Seed sample issues (Chennai coords) with author handles ──
    const sampleIssues = [
      {
        type: 'pothole' as const,
        description: 'Massive pothole right at the bus stop — saw two bikes skid this morning. Please fix ASAP 🙏',
        lat: 13.0827 + 0.01, lng: 80.2707 + 0.01,
        address: 'Anna Salai, near Teynampet',
        ward: 'Ward-12',
        aiResult: 'real' as const, aiConfidence: 0.94, status: 'pending' as const,
        authorName: 'ravi_chennai', authorAvatar: '🦊',
        comments: [
          { text: 'Same issue here! Almost fell yesterday.', authorName: 'meena_tnagar', authorAvatar: '🐼' },
          { text: 'Reported this 2 weeks ago too 😤', authorName: 'suresh_anna', authorAvatar: '🦉' },
        ],
        likes: 24,
      },
      {
        type: 'garbage' as const,
        description: 'Garbage pile hasn\'t been collected for 3 days now. The smell is unbearable in this heat 🤢',
        lat: 13.0827 - 0.015, lng: 80.2707 + 0.02,
        address: 'T. Nagar, near Ranganathan Street',
        ward: 'Ward-12',
        aiResult: 'real' as const, aiConfidence: 0.91, status: 'in_progress' as const,
        authorName: 'deepika_tnagar', authorAvatar: '🦄',
        comments: [
          { text: 'They picked up yesterday on my street, hopefully yours soon!', authorName: 'kumar_ward12', authorAvatar: '🐯' },
        ],
        likes: 18,
      },
      {
        type: 'light' as const,
        description: 'Streetlight outside my house has been dead for a week. Whole stretch is pitch dark at night, unsafe for women walking home.',
        lat: 13.0827 + 0.02, lng: 80.2707 - 0.01,
        address: 'Adyar, near LB Road',
        ward: 'Ward-08',
        aiResult: 'real' as const, aiConfidence: 0.88, status: 'pending' as const,
        authorName: 'lakshmi_adyar', authorAvatar: '🦜',
        comments: [
          { text: 'Yes! Same on 2nd street.Filed complaint 5 times already.', authorName: 'raghav_adyar', authorAvatar: '🐸' },
          { text: 'Tag the councilor on Twitter, that works sometimes 🤐', authorName: 'priya_voice', authorAvatar: '🦋' },
        ],
        likes: 31,
      },
      {
        type: 'water' as const,
        description: 'Water leak from main pipeline — road is fully flooded, autos refusing to come this side. Help!',
        lat: 13.05 - 0.005, lng: 80.25 + 0.015,
        address: 'Mylapore, near Kapaleeshwarar Temple',
        ward: 'Ward-08',
        aiResult: 'uncertain' as const, aiConfidence: 0.65, status: 'pending' as const,
        authorName: 'karthik_mylapore', authorAvatar: '🐢',
        comments: [],
        likes: 9,
      },
      {
        type: 'pothole' as const,
        description: 'Multiple potholes on this stretch — every monsoon the same story. When will it get a proper re-lay?',
        lat: 13.0 + 0.005, lng: 80.28 - 0.01,
        address: 'Velachery Main Road',
        ward: 'Ward-15',
        aiResult: 'real' as const, aiConfidence: 0.96, status: 'resolved' as const,
        authorName: 'anitha_velachery', authorAvatar: '🐝',
        comments: [
          { text: 'Finally fixed! Took 3 weeks but roads are smooth now 🙌', authorName: 'anitha_velachery', authorAvatar: '🐝' },
        ],
        likes: 42,
      },
      {
        type: 'garbage' as const,
        description: 'Construction debris dumped on sidewalk — can\'t walk on the footpath anymore, forcing pedestrians onto the road.',
        lat: 13.1 - 0.005, lng: 80.29 + 0.005,
        address: 'Tambaram, near GST Road',
        ward: 'Ward-15',
        aiResult: 'real' as const, aiConfidence: 0.92, status: 'pending' as const,
        authorName: 'mohan_tambaram', authorAvatar: '🦝',
        comments: [],
        likes: 12,
      },
      {
        type: 'other' as const,
        description: 'Huge tree branch fell during last night\'s storm, blocking half the road. Need emergency clearance!',
        lat: 13.07, lng: 80.26,
        address: 'Guindy, near Race Course',
        ward: 'Ward-12',
        aiResult: 'real' as const, aiConfidence: 0.89, status: 'in_progress' as const,
        authorName: 'farida_guindy', authorAvatar: '🦅',
        comments: [
          { text: 'Saw the corporation van there this morning 👍', authorName: 'vijay_guindy', authorAvatar: '🐺' },
        ],
        likes: 27,
      },
      {
        type: 'pothole' as const,
        description: 'Pothole so deep it could swallow a scooter tire 🙀 Be careful on this road at night.',
        lat: 13.04 + 0.005, lng: 80.23 - 0.005,
        address: 'Perungudi, OMR',
        ward: 'Ward-15',
        aiResult: 'real' as const, aiConfidence: 0.93, status: 'pending' as const,
        authorName: 'rohit_omr', authorAvatar: '🦓',
        comments: [],
        likes: 15,
      },
    ]

    const year = new Date().getFullYear()
    let seq = await db.issue.count({ where: { issueId: { startsWith: `ISS-${year}-` } } })

    for (const s of sampleIssues) {
      seq++
      const issueId = `ISS-${year}-${String(seq).padStart(4, '0')}`
      const createdAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
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
          authorName: s.authorName,
          authorAvatar: s.authorAvatar,
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

      // Add comments (timestamps spread after createdAt)
      for (let i = 0; i < s.comments.length; i++) {
        const c = s.comments[i]
        await db.issueComment.create({
          data: {
            issueId: issue.id,
            text: c.text,
            authorName: c.authorName,
            authorAvatar: c.authorAvatar,
            createdAt: new Date(createdAt.getTime() + (i + 1) * 60 * 60 * 1000),
          },
        })
        result.comments++
      }

      // Add likes (with synthetic device IDs)
      for (let i = 0; i < s.likes; i++) {
        try {
          await db.issueLike.create({
            data: {
              issueId: issue.id,
              deviceId: `seed-${issue.id}-${i}`,
            },
          })
          result.likes++
        } catch {
          // ignore unique constraint races
        }
      }

      result.issues++

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
      message: `Seeded ${result.admins} admins, ${result.issues} posts, ${result.comments} comments, ${result.likes} likes.`,
      result,
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 })
  }
}
