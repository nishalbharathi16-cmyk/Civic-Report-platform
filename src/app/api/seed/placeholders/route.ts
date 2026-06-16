import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  pothole: { bg: '#3D2817', fg: '#1A1A1A', label: 'Pothole' },
  garbage: { bg: '#5D4037', fg: '#3E2723', label: 'Garbage' },
  light: { bg: '#37474F', fg: '#263238', label: 'Broken Light' },
  water: { bg: '#01579B', fg: '#0D47A1', label: 'Water Leak' },
  other: { bg: '#424242', fg: '#212121', label: 'Other Issue' },
}

function makeSvg(type: string): string {
  const c = COLORS[type] || COLORS.other
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="${c.bg}"/>
  <ellipse cx="320" cy="280" rx="180" ry="80" fill="${c.fg}" opacity="0.9"/>
  <ellipse cx="320" cy="280" rx="140" ry="55" fill="#000000" opacity="0.6"/>
  <text x="320" y="80" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${c.label}</text>
  <text x="320" y="430" font-family="Arial, sans-serif" font-size="20" fill="#FFFFFF" opacity="0.7" text-anchor="middle">Sample photo — seeded data</text>
</svg>`
}

// POST /api/seed/placeholders — generate placeholder SVG images for demo issues
export async function POST(_req: NextRequest) {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const created: string[] = []
    for (const type of Object.keys(COLORS)) {
      const filePath = path.join(uploadDir, `placeholder-${type}.svg`)
      await fs.writeFile(filePath, makeSvg(type), 'utf8')
      created.push(`/uploads/placeholder-${type}.svg`)
    }

    return NextResponse.json({ success: true, created })
  } catch (err) {
    console.error('Placeholder generation error:', err)
    return NextResponse.json({ error: 'Failed to generate placeholders' }, { status: 500 })
  }
}
