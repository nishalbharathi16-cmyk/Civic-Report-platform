// Shared types matching the Prisma schema

export type IssueType = 'pothole' | 'garbage' | 'light' | 'water' | 'other'
export type IssueStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected'
export type AIResult = 'real' | 'ai_generated' | 'uncertain'
export type AdminRole = 'admin' | 'super_admin'

export interface Issue {
  id: string
  issueId: string
  type: IssueType
  status: IssueStatus
  photoUrl: string
  description: string | null
  lat: number
  lng: number
  address: string | null
  ward: string
  authorName: string
  authorAvatar: string
  aiResult: AIResult
  aiConfidence: number
  aiApiUsed: string
  aiCheckedAt: string
  resolutionNote: string | null
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  timeline?: IssueTimeline[]
  likes?: IssueLike[]
  comments?: IssueComment[]
  likedByMe?: boolean
  likesCount?: number
  commentsCount?: number
}

export interface IssueLike {
  id: string
  issueId: string
  deviceId: string
  createdAt: string
}

export interface IssueComment {
  id: string
  issueId: string
  authorName: string
  authorAvatar: string
  text: string
  createdAt: string
}

export interface IssueTimeline {
  id: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  actor: string
  createdAt: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  ward: string | null
  isActive: boolean
  createdAt: string
  lastLogin: string | null
}

export interface AIDetectionLog {
  id: string
  imageUrl: string
  result: AIResult
  confidence: number
  apiUsed: string
  reasoning: string | null
  issueId: string | null
  createdAt: string
}

export interface DetectionResult {
  success: boolean
  result: AIResult
  confidence: number
  reasoning: string
  apiUsed: string
}

// ─── Display helpers ──────────────────────────────────────────────

export const ISSUE_TYPE_META: Record<IssueType, { label: string; emoji: string; color: string }> = {
  pothole: { label: 'Pothole', emoji: '🕳️', color: '#5D4037' },
  garbage: { label: 'Garbage', emoji: '🗑️', color: '#6D4C41' },
  light: { label: 'Broken Streetlight', emoji: '💡', color: '#37474F' },
  water: { label: 'Water Leak', emoji: '💧', color: '#0277BD' },
  other: { label: 'Other Issue', emoji: '⚠️', color: '#424242' },
}

export const STATUS_META: Record<IssueStatus, { label: string; color: string; bg: string; emoji: string }> = {
  pending: { label: 'Pending', color: '#B71C1C', bg: '#FFEBEE', emoji: '🔴' },
  in_progress: { label: 'In Progress', color: '#E65100', bg: '#FFF3E0', emoji: '🟡' },
  resolved: { label: 'Resolved', color: '#1B5E20', bg: '#E8F5E9', emoji: '🟢' },
  rejected: { label: 'Rejected', color: '#4A148C', bg: '#F3E5F5', emoji: '⚫' },
}

export const AI_RESULT_META: Record<AIResult, { label: string; color: string; bg: string; emoji: string }> = {
  real: { label: 'Verified Real Photo', color: '#1B5E20', bg: '#E8F5E9', emoji: '✅' },
  uncertain: { label: 'Under Review', color: '#E65100', bg: '#FFF3E0', emoji: '⚠️' },
  ai_generated: { label: 'AI Image Detected', color: '#B71C1C', bg: '#FFEBEE', emoji: '❌' },
}

export function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr} hr ago`
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Avatar emoji pool for new citizens ──────────────────────────────
export const AVATAR_POOL = [
  '🦊', '🐼', '🦉', '🐙', '🦄', '🐯', '🦝', '🐨',
  '🦋', '🐢', '🦜', '🐝', '🦓', '🐰', '🐱', '🦁',
  '🐸', '🦅', '🐺', '🦚',
]

export const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
]

export function getAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
