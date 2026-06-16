'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Heart, MessageCircle, Send, MapPin, Loader2,
  CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck,
  ArrowLeft, Calendar,
} from 'lucide-react'
import {
  type Issue, type IssueComment,
  ISSUE_TYPE_META, STATUS_META, AI_RESULT_META,
  formatRelative, formatDate, getAvatarColor,
} from '@/lib/types'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PostDetailModalProps {
  issueId: string
  deviceId: string
  currentHandle: string
  currentAvatar: string
  onClose: () => void
}

export function PostDetailModal({
  issueId, deviceId, currentHandle, currentAvatar, onClose,
}: PostDetailModalProps) {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [liking, setLiking] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/issues/${issueId}?deviceId=${encodeURIComponent(deviceId)}`)
      const data = await res.json()
      if (data.success) {
        setIssue(data.issue)
        setComments(data.issue.comments || [])
      } else {
        toast.error(data.error || 'Failed to load post')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [issueId, deviceId])

  useEffect(() => {
    load()
  }, [load])

  const handleLike = async () => {
    if (!issue || liking) return
    setLiking(true)
    const wasLiked = issue.likedByMe
    setIssue(prev => prev ? {
      ...prev,
      likedByMe: !wasLiked,
      likesCount: (prev.likesCount || 0) + (wasLiked ? -1 : 1),
    } : prev)
    try {
      await fetch(`/api/issues/${issue.issueId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
    } catch (err) {
      console.error(err)
      setIssue(prev => prev ? {
        ...prev,
        likedByMe: wasLiked,
        likesCount: (prev.likesCount || 0) + (wasLiked ? 1 : -1),
      } : prev)
    } finally {
      setLiking(false)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText,
          authorName: currentHandle,
          authorAvatar: currentAvatar,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setComments(prev => [...prev, data.comment])
        setIssue(prev => prev ? { ...prev, commentsCount: data.commentsCount } : prev)
        setCommentText('')
      } else {
        toast.error(data.error || 'Failed to comment')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[95vh] flex flex-col">
        <DialogTitle className="sr-only">Post detail — {issue?.issueId || ''}</DialogTitle>
        {loading || !issue ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Loading post…</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 flex-1 min-h-0">
            {/* ── Left: photo ── */}
            <div className="bg-black flex items-center justify-center min-h-[40vh] md:min-h-0">
              <img
                src={issue.photoUrl}
                alt={issue.description || issue.issueId}
                className="w-full h-full object-contain max-h-[60vh] md:max-h-[95vh]"
              />
            </div>

            {/* ── Right: details + comments ── */}
            <div className="flex flex-col min-h-0 max-h-[95vh]">
              {/* Header */}
              <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-base shrink-0',
                  getAvatarColor(issue.authorName)
                )}>
                  {issue.authorAvatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{issue.authorName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{issue.address || `${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}`}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{formatRelative(issue.createdAt)}</div>
              </header>

              {/* Badges */}
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-border">
                <Badge
                  label={`${ISSUE_TYPE_META[issue.type].emoji} ${ISSUE_TYPE_META[issue.type].label}`}
                  variant="neutral"
                />
                <Badge
                  label={`${STATUS_META[issue.status].emoji} ${STATUS_META[issue.status].label}`}
                  variant="status"
                  customColor={{ bg: STATUS_META[issue.status].bg, color: STATUS_META[issue.status].color }}
                />
                <Badge
                  label={`${AI_RESULT_META[issue.aiResult].emoji} ${AI_RESULT_META[issue.aiResult].label}`}
                  variant="ai"
                  customColor={{ bg: AI_RESULT_META[issue.aiResult].bg, color: AI_RESULT_META[issue.aiResult].color }}
                />
                <Badge
                  label={`🎯 ${Math.round(issue.aiConfidence * 100)}% AI confidence`}
                  variant="neutral"
                />
              </div>

              {/* Status timeline (compact) */}
              {issue.timeline && issue.timeline.length > 0 && (
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Status Timeline
                  </div>
                  <div className="space-y-2">
                    {issue.timeline.map((t, i) => (
                      <div key={t.id} className="flex gap-2.5 items-start">
                        <div className="flex flex-col items-center mt-0.5">
                          <div className={cn(
                            'h-2 w-2 rounded-full',
                            t.toStatus === 'pending' && 'bg-red-500',
                            t.toStatus === 'in_progress' && 'bg-amber-500',
                            t.toStatus === 'resolved' && 'bg-emerald-500',
                            t.toStatus === 'rejected' && 'bg-violet-500',
                          )} />
                          {i < (issue.timeline?.length || 0) - 1 && (
                            <div className="w-px h-4 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-medium">{STATUS_META[t.toStatus as keyof typeof STATUS_META]?.label || t.toStatus}</div>
                          <div className="text-muted-foreground">{formatDate(t.createdAt)}</div>
                          {t.note && <div className="text-muted-foreground italic mt-0.5">{t.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption */}
              {issue.description && (
                <div className="px-4 py-3 border-b border-border text-sm">
                  <span className="font-semibold mr-1.5">{issue.authorName}</span>
                  <span className="whitespace-pre-wrap break-words">{issue.description}</span>
                </div>
              )}

              {/* Comments scroll area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                {comments.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No comments yet. Start the conversation 💬
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-2.5 text-sm">
                      <div className={cn(
                        'h-7 w-7 rounded-full flex items-center justify-center text-sm shrink-0',
                        getAvatarColor(c.authorName)
                      )}>
                        {c.authorAvatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div>
                          <span className="font-semibold mr-1.5">{c.authorName}</span>
                          <span className="break-words">{c.text}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{formatRelative(c.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action bar */}
              <div className="border-t border-border">
                <div className="flex items-center gap-2 px-4 py-2">
                  <button
                    onClick={handleLike}
                    disabled={liking}
                    className="p-1.5 hover:opacity-60 transition-opacity"
                    aria-label={issue.likedByMe ? 'Unlike' : 'Like'}
                  >
                    <Heart className={cn(
                      'h-6 w-6 transition-all',
                      issue.likedByMe ? 'fill-red-500 text-red-500' : 'text-foreground'
                    )} />
                  </button>
                  <button className="p-1.5 hover:opacity-60" aria-label="Comment">
                    <MessageCircle className="h-6 w-6" />
                  </button>
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/#track`
                      try {
                        await navigator.clipboard.writeText(url)
                        toast.success('Link copied!')
                      } catch { /* */ }
                    }}
                    className="p-1.5 hover:opacity-60"
                    aria-label="Share"
                  >
                    <Send className="h-6 w-6" />
                  </button>
                  <div className="ml-auto text-xs text-muted-foreground">
                    Issue ID: <span className="font-mono font-semibold text-foreground">{issue.issueId}</span>
                  </div>
                </div>
                <div className="px-4 pb-2 text-sm font-semibold">
                  {(issue.likesCount || 0).toLocaleString()} like{(issue.likesCount || 0) === 1 ? '' : 's'}
                </div>

                {/* Comment input */}
                <form onSubmit={handleComment} className="flex items-center gap-2 px-4 py-3 border-t border-border">
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-sm shrink-0',
                    getAvatarColor(currentHandle)
                  )}>
                    {currentAvatar}
                  </div>
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={`Comment as ${currentHandle}…`}
                    className="flex-1 h-9 border-0 bg-transparent focus-visible:ring-0 text-sm"
                    maxLength={500}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={!commentText.trim() || submittingComment}
                    className="text-primary font-semibold text-sm"
                  >
                    {submittingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Post'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Badge helper ──────────────────────────────────────────────────
function Badge({
  label, variant, customColor,
}: {
  label: string
  variant: 'neutral' | 'status' | 'ai'
  customColor?: { bg: string; color: string }
}) {
  if (customColor) {
    return (
      <span
        className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: customColor.bg, color: customColor.color }}
      >
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-foreground">
      {label}
    </span>
  )
}
