import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function hash(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex')
}

// POST /api/admin/login
// Body: { email, password }
// Returns: { user: { id, name, email, role, ward } }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await db.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } })

    if (!user || !user.isActive || user.passwordHash !== hash(password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    await db.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ward: user.ward,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

// Helper exported for the seed route
export { hash }
