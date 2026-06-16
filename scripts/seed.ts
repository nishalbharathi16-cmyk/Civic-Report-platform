// Direct DB seed script — bypasses HTTP API
import { db } from '../src/lib/db'

async function main() {
  console.log('Checking existing data...')
  const adminCount = await db.adminUser.count()
  const issueCount = await db.issue.count()
  console.log(`Admins: ${adminCount}, Issues: ${issueCount}`)

  if (issueCount > 0) {
    console.log('Already have issues. Wiping Issue/IssueLike/IssueComment/IssueTimeline/AIDetectionLog...')
    await db.issueLike.deleteMany()
    await db.issueComment.deleteMany()
    await db.issueTimeline.deleteMany()
    await db.aIDetectionLog.deleteMany()
    await db.issue.deleteMany()
    console.log('Wiped.')
  }

  if (adminCount === 0) {
    console.log('Seeding admins...')
    const crypto = await import('crypto')
    const hash = (pw: string) => crypto.createHash('sha256').update(pw).digest('hex')
    const admins = [
      { name: 'Priya Sundaram', email: 'priya@chennaicorp.gov.in', password: 'admin123', role: 'super_admin', ward: null },
      { name: 'Kumar Rajan', email: 'kumar@chennaicorp.gov.in', password: 'admin123', role: 'admin', ward: 'Ward-12' },
      { name: 'Lakshmi Iyer', email: 'lakshmi@chennaicorp.gov.in', password: 'admin123', role: 'admin', ward: 'Ward-08' },
      { name: 'Murugan S', email: 'murugan@chennaicorp.gov.in', password: 'admin123', role: 'admin', ward: 'Ward-15' },
    ]
    for (const a of admins) {
      await db.adminUser.create({
        data: {
          name: a.name, email: a.email, passwordHash: hash(a.password),
          role: a.role, ward: a.ward,
        },
      })
    }
    console.log(`Seeded ${admins.length} admins.`)
  }

  console.log('Seeding issues...')
  const sampleIssues = [
    {
      type: 'pothole' as const,
      description: 'Massive pothole right at the bus stop — saw two bikes skid this morning. Please fix ASAP 🙏',
      lat: 13.0927, lng: 80.2807, address: 'Anna Salai, near Teynampet', ward: 'Ward-12',
      aiResult: 'real' as const, aiConfidence: 0.94, status: 'pending' as const,
      authorName: 'ravi_chennai', authorAvatar: '🦊',
      comments: [
        { text: 'Same issue here! Almost fell yesterday.', authorName: 'meena_tnagar', authorAvatar: '🐼' },
        { text: 'Reported this 2 weeks ago too 😤', authorName: 'suresh_anna', authorAvatar: '🦉' },
      ],
      likes: 24, daysAgo: 0.3,
    },
    {
      type: 'garbage' as const,
      description: "Garbage pile hasn't been collected for 3 days now. The smell is unbearable in this heat 🤢",
      lat: 13.0677, lng: 80.2907, address: 'T. Nagar, near Ranganathan Street', ward: 'Ward-12',
      aiResult: 'real' as const, aiConfidence: 0.91, status: 'in_progress' as const,
      authorName: 'deepika_tnagar', authorAvatar: '🦄',
      comments: [
        { text: 'They picked up yesterday on my street, hopefully yours soon!', authorName: 'kumar_ward12', authorAvatar: '🐯' },
      ],
      likes: 18, daysAgo: 1.2,
    },
    {
      type: 'light' as const,
      description: 'Streetlight outside my house has been dead for a week. Whole stretch is pitch dark at night, unsafe for women walking home.',
      lat: 13.1027, lng: 80.2607, address: 'Adyar, near LB Road', ward: 'Ward-08',
      aiResult: 'real' as const, aiConfidence: 0.88, status: 'pending' as const,
      authorName: 'lakshmi_adyar', authorAvatar: '🦜',
      comments: [
        { text: 'Yes! Same on 2nd street. Filed complaint 5 times already.', authorName: 'raghav_adyar', authorAvatar: '🐸' },
        { text: 'Tag the councilor on Twitter, that works sometimes 🤐', authorName: 'priya_voice', authorAvatar: '🦋' },
      ],
      likes: 31, daysAgo: 0.8,
    },
    {
      type: 'water' as const,
      description: 'Water leak from main pipeline — road is fully flooded, autos refusing to come this side. Help!',
      lat: 13.045, lng: 80.265, address: 'Mylapore, near Kapaleeshwarar Temple', ward: 'Ward-08',
      aiResult: 'uncertain' as const, aiConfidence: 0.65, status: 'pending' as const,
      authorName: 'karthik_mylapore', authorAvatar: '🐢',
      comments: [],
      likes: 9, daysAgo: 0.5,
    },
    {
      type: 'pothole' as const,
      description: 'Multiple potholes on this stretch — every monsoon the same story. When will it get a proper re-lay?',
      lat: 13.005, lng: 80.27, address: 'Velachery Main Road', ward: 'Ward-15',
      aiResult: 'real' as const, aiConfidence: 0.96, status: 'resolved' as const,
      authorName: 'anitha_velachery', authorAvatar: '🐝',
      comments: [
        { text: 'Finally fixed! Took 3 weeks but roads are smooth now 🙌', authorName: 'anitha_velachery', authorAvatar: '🐝' },
      ],
      likes: 42, daysAgo: 4.5,
    },
    {
      type: 'garbage' as const,
      description: "Construction debris dumped on sidewalk — can't walk on the footpath anymore, forcing pedestrians onto the road.",
      lat: 13.095, lng: 80.295, address: 'Tambaram, near GST Road', ward: 'Ward-15',
      aiResult: 'real' as const, aiConfidence: 0.92, status: 'pending' as const,
      authorName: 'mohan_tambaram', authorAvatar: '🦝',
      comments: [],
      likes: 12, daysAgo: 2.1,
    },
    {
      type: 'other' as const,
      description: "Huge tree branch fell during last night's storm, blocking half the road. Need emergency clearance!",
      lat: 13.07, lng: 80.26, address: 'Guindy, near Race Course', ward: 'Ward-12',
      aiResult: 'real' as const, aiConfidence: 0.89, status: 'in_progress' as const,
      authorName: 'farida_guindy', authorAvatar: '🦅',
      comments: [
        { text: 'Saw the corporation van there this morning 👍', authorName: 'vijay_guindy', authorAvatar: '🐺' },
      ],
      likes: 27, daysAgo: 0.9,
    },
    {
      type: 'pothole' as const,
      description: 'Pothole so deep it could swallow a scooter tire 🙀 Be careful on this road at night.',
      lat: 13.045, lng: 80.225, address: 'Perungudi, OMR', ward: 'Ward-15',
      aiResult: 'real' as const, aiConfidence: 0.93, status: 'pending' as const,
      authorName: 'rohit_omr', authorAvatar: '🦓',
      comments: [],
      likes: 15, daysAgo: 1.6,
    },
  ]

  const year = new Date().getFullYear()
  let seq = 0

  for (const s of sampleIssues) {
    seq++
    const issueId = `ISS-${year}-${String(seq).padStart(4, '0')}`
    const createdAt = new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000)
    const resolvedAt = s.status === 'resolved' ? new Date(createdAt.getTime() + 18 * 60 * 60 * 1000) : null

    const issue = await db.issue.create({
      data: {
        issueId, type: s.type, status: s.status,
        photoUrl: `/uploads/placeholder-${s.type}.svg`,
        description: s.description,
        lat: s.lat, lng: s.lng, address: s.address, ward: s.ward,
        authorName: s.authorName, authorAvatar: s.authorAvatar,
        aiResult: s.aiResult, aiConfidence: s.aiConfidence,
        aiApiUsed: 'vlm-zai', aiCheckedAt: createdAt,
        resolvedAt,
        resolutionNote: s.status === 'resolved' ? 'Issue addressed by field team' : null,
        createdAt, updatedAt: createdAt,
      },
    })

    await db.issueTimeline.create({
      data: {
        issueId: issue.id, toStatus: 'pending',
        note: `Issue reported. AI detection: ${s.aiResult} (${Math.round(s.aiConfidence * 100)}%)`,
        actor: 'system', createdAt,
      },
    })
    if (s.status !== 'pending') {
      await db.issueTimeline.create({
        data: {
          issueId: issue.id, fromStatus: 'pending', toStatus: s.status,
          note: s.status === 'resolved' ? 'Resolved by field team' : 'Picked up by ward officer',
          actor: 'admin', createdAt: new Date(createdAt.getTime() + 4 * 60 * 60 * 1000),
        },
      })
    }

    for (let i = 0; i < s.comments.length; i++) {
      const c = s.comments[i]
      await db.issueComment.create({
        data: {
          issueId: issue.id, text: c.text,
          authorName: c.authorName, authorAvatar: c.authorAvatar,
          createdAt: new Date(createdAt.getTime() + (i + 1) * 60 * 60 * 1000),
        },
      })
    }

    for (let i = 0; i < s.likes; i++) {
      try {
        await db.issueLike.create({
          data: { issueId: issue.id, deviceId: `seed-${issue.id}-${i}` },
        })
      } catch { /* unique constraint */ }
    }

    await db.aIDetectionLog.create({
      data: {
        imageUrl: `/uploads/placeholder-${s.type}.svg`,
        result: s.aiResult, confidence: s.aiConfidence,
        apiUsed: 'vlm-zai', reasoning: 'Seeded sample detection result',
        issueId: issue.id, createdAt,
      },
    })

    console.log(`  ✓ ${issueId} (${s.type}, ${s.status}, ${s.likes} likes, ${s.comments.length} comments)`)
  }

  console.log(`\nDone! Seeded ${sampleIssues.length} issues.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
