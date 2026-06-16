import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'

// ─── AI Image Authenticity Detection ─────────────────────────────
// Uses the z-ai-web-dev-sdk VLM (Vision-Language Model) to analyze
// whether an uploaded image is a real photograph or AI-generated.

export const runtime = 'nodejs'
export const maxDuration = 60

interface DetectionResult {
  result: 'real' | 'ai_generated' | 'uncertain'
  confidence: number
  reasoning: string
}

function parseVerdict(raw: string): DetectionResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      const verdict = String(parsed.verdict || parsed.result || '').toLowerCase()
      const confidence = Number(parsed.confidence ?? parsed.probability ?? 0.5)
      const reasoning = String(parsed.reasoning || parsed.explanation || raw.slice(0, 300))

      if (verdict.includes('real') || verdict.includes('authentic') || verdict.includes('photograph')) {
        return { result: 'real', confidence: Math.min(1, Math.max(0, confidence)), reasoning }
      }
      if (verdict.includes('ai') || verdict.includes('generated') || verdict.includes('fake') || verdict.includes('synthetic')) {
        return { result: 'ai_generated', confidence: Math.min(1, Math.max(0, confidence)), reasoning }
      }
      if (verdict.includes('uncertain') || verdict.includes('unsure')) {
        return { result: 'uncertain', confidence: Math.min(1, Math.max(0, confidence)), reasoning }
      }
    }
  } catch {
    // fall through to keyword scan
  }

  const lower = raw.toLowerCase()
  const hasAi = /ai[- ]?generated|midjourney|dall-?e|stable diffusion|synthetic|fake|artificially generated/.test(lower)
  const hasReal = /real photograph|authentic|genuine|actual photo|taken by (a )?camera/.test(lower)

  if (hasAi && !hasReal) return { result: 'ai_generated', confidence: 0.75, reasoning: raw.slice(0, 300) }
  if (hasReal && !hasAi) return { result: 'real', confidence: 0.85, reasoning: raw.slice(0, 300) }
  return { result: 'uncertain', confidence: 0.5, reasoning: raw.slice(0, 300) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageDataUrl, imageUrl } = body || {}

    const url = imageDataUrl || imageUrl
    if (!url) {
      return NextResponse.json(
        { error: 'Either imageDataUrl (base64) or imageUrl is required' },
        { status: 400 }
      )
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const prompt = `You are an expert forensic image analyst. Examine this image carefully and decide whether it is a REAL PHOTOGRAPH taken by a camera, or an AI-GENERATED / synthetically produced image (e.g. Midjourney, DALL-E, Stable Diffusion output, AI-edited).

Look for clues like:
- Unnatural textures, overly smooth skin or surfaces
- Inconsistent lighting or shadows
- Impossible geometry, warped text, extra/missing fingers
- Plastic-like reflections, repeating patterns
- Metadata / artifacting around edges

Respond with ONLY a JSON object in this exact format (no markdown, no prose):
{
  "verdict": "real" | "ai_generated" | "uncertain",
  "confidence": 0.0 to 1.0,
  "reasoning": "one-sentence explanation"
}`

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const rawContent = response.choices?.[0]?.message?.content ?? ''
    const verdict = parseVerdict(rawContent)

    try {
      await db.aIDetectionLog.create({
        data: {
          imageUrl: url.startsWith('data:')
            ? `data:url:${crypto.createHash('sha256').update(url).digest('hex').slice(0, 16)}`
            : url.slice(0, 500),
          result: verdict.result,
          confidence: verdict.confidence,
          apiUsed: 'vlm-zai',
          reasoning: verdict.reasoning.slice(0, 1000),
        },
      })
    } catch (logErr) {
      console.error('Failed to log AI detection:', logErr)
    }

    return NextResponse.json({
      success: true,
      ...verdict,
      apiUsed: 'vlm-zai',
    })
  } catch (err: unknown) {
    console.error('AI detection error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'AI detection failed', details: msg }, { status: 500 })
  }
}
