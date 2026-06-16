import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// PATCH /api/admin/users/[id] — toggle active status or update fields
// Body: { isActive?, name?, ward?, role? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { isActive, name, ward, role } = body || {}

    const existing = await db.adminUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (name) data.name = name
    if (ward !== undefined) data.ward = ward
    if (role && ['admin', 'super_admin'].includes(role)) data.role = role

    const updated = await db.adminUser.update({
      where: { id },
      data,
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

    return NextResponse.json({ success: true, user: updated })
  } catch (err) {
    console.error('Update user error:', err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] — permanently delete a user
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.adminUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await db.adminUser.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
