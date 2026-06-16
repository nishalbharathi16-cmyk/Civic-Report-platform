import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function hash(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex')
}

// GET /api/admin/users — list all admin/super_admin users
export async function GET() {
  try {
    const users = await db.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ward: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    })
    return NextResponse.json({ success: true, users })
  } catch (err) {
    console.error('List users error:', err)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}

// POST /api/admin/users — create a new admin user
// Body: { name, email, password, role, ward? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, role, ward } = body || {}

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields: name, email, password, role' }, { status: 400 })
    }

    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Role must be admin or super_admin' }, { status: 400 })
    }

    const existing = await db.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const user = await db.adminUser.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash: hash(password),
        role,
        ward: ward || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ward: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
