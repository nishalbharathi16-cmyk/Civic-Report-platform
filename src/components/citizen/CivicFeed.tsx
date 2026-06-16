'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  MapPin, ShieldCheck, Home, Search, PlusSquare, User,
  Loader2, Verified, Clock, AlertTriangle, XCircle, CheckCircle2,
  ChevronLeft, Settings, Bookmark as BookmarkIcon, Compass, Sparkles,
} from 'lucide-react'
import {
  type Issue, type IssueType, type IssueComment,
  ISSUE_TYPE_META, STATUS_META, AI_RESULT_META,
  formatRelative, getAvatarColor,
} from '@/lib/types'
import { useCitizenIdentity } from './useCitizenIdentity'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CreatePostModal } from './CreatePostModal'
import { PostDetailModal } from './PostDetailModal'

type Tab = 'home' | 'explore' | 'profile'
type SortBy = 'latest' | 'top'

interface CivicFeedProps {
  onAdminLogin: () => void
}

const ALL_TAB: IssueType | 'all' = 'all'

const STORY_RINGS: { type: IssueType | 'all'; label: string; emoji: string; ring: string }[] = [
  { type: 'all', label: 'All', emoji: '🌈', ring: 'from-pink-500 via-amber-400 to-emerald-500' },
  { type: 'pothole', label: 'Potholes', emoji: '🕳️', ring: 'from-amber-600 to-amber-400' },
  { type: 'garbage', label: 'Garbage', emoji: '🗑️', ring: 'from-orange-600 to-yellow-400' },
  { type: 'light', label: 'Lights', emoji: '💡', ring: 'from-yellow-500 to-amber-300' },
  { type: 'water', label: 'Water', emoji: '💧', ring: 'from-sky-600 to-cyan-400' },
  { type: 'other', label: 'Other', emoji: '⚠️', ring: 'from-slate-600 to-slate-400' },
]

export function CivicFeed({ onAdminLogin }: CivicFeedProps) {
  const { deviceId, handle, avatar } = useCitizenIdentity()
  const [tab, setTab] = useState<Tab>('home')
  const [filterType, setFilterType] = useState<IssueType | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('latest')
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [myPosts, setMyPosts] = useState<Issue[]>([])

  const loadFeed = useCallback(async () => {
    if (!deviceId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('deviceId', deviceId)
      if (filterType !== 'all') params.set('type', filterType)
      params.set('limit', '100')
      const res = await fetch(`/api/issues?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        let list = data.issues as Issue[]
        if (sortBy === 'top') {
          list = [...list].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
        }
        setIssues(list)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [deviceId, filterType, sortBy])

  const loadMyPosts = useCallback(async () => {
    if (!deviceId || !handle) return
    try {
      const params = new URLSearchParams()
      params.set('deviceId', deviceId)
      params.set('authorName', handle)
      params.set('limit', '100')
      const res = await fetch(`/api/issues?${params.toString()}`)
      const data = await res.json()
      if (data.success) setMyPosts(data.issues as Issue[])
    } catch (err) {
      console.error(err)
    }
  }, [deviceId, handle])

  useEffect(() => {
    if (tab === 'home' || tab === 'explore') loadFeed()
    if (tab === 'profile') loadMyPosts()
  }, [tab, loadFeed, loadMyPosts])

  // Poll feed every 20s for new posts
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === 'home' || tab === 'explore') loadFeed()
    }, 20000)
    return () => clearInterval(interval)
  }, [tab, loadFeed])

  const handleLike = async (issueId: string) => {
    if (!deviceId) return
    // Optimistic
    setIssues(prev => prev.map(i =>
      i.issueId === issueId
        ? { ...i, likedByMe: !i.likedByMe, likesCount: (i.likesCount || 0) + (i.likedByMe ? -1 : 1) }
        : i
    ))
    try {
      await fetch(`/api/issues/${issueId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
    } catch (err) {
      console.error(err)
      // revert on error
      setIssues(prev => prev.map(i =>
        i.issueId === issueId
          ? { ...i, likedByMe: !i.likedByMe, likesCount: (i.likesCount || 0) + (i.likedByMe ? -1 : 1) }
          : i
      ))
    }
  }

  const handleNewPost = () => {
    setCreateOpen(false)
    if (tab === 'home' || tab === 'explore') loadFeed()
    if (tab === 'profile') loadMyPosts()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top Instagram-style header ───────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => setTab('home')}
            className="flex items-center gap-2 font-semibold text-lg tracking-tight"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              CivicGram
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-1 flex-1 max-w-xs">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search issues, places…"
                className="h-9 pl-8 text-sm bg-muted border-0"
                onChange={(e) => {
                  const q = e.target.value
                  if (!q) { loadFeed(); return }
                  fetch(`/api/issues?deviceId=${deviceId}&search=${encodeURIComponent(q)}&limit=50`)
                    .then(r => r.json())
                    .then(d => d.success && setIssues(d.issues))
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCreateOpen(true)}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Create post"
            >
              <PlusSquare className="h-5 w-5" />
            </button>
            <button
              onClick={onAdminLogin}
              className="hidden sm:inline-flex p-2 hover:bg-accent rounded-md transition-colors text-xs text-muted-foreground"
              title="Officer / Super Admin login"
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Officer
            </button>
            <button
              onClick={() => setTab('profile')}
              className="p-1 rounded-full hover:opacity-80"
              aria-label="My profile"
            >
              <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-base">
                {avatar}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content area ───────────────────────────────────── */}
      <main className="flex-1 pb-16 sm:pb-4">
        {tab === 'home' && (
          <HomeFeed
            issues={issues}
            loading={loading}
            deviceId={deviceId}
            filterType={filterType}
            setFilterType={setFilterType}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onLike={handleLike}
            onOpenPost={(id) => setSelectedIssueId(id)}
            onRefresh={loadFeed}
          />
        )}
        {tab === 'explore' && (
          <ExploreGrid issues={issues} loading={loading} onOpenPost={(id) => setSelectedIssueId(id)} />
        )}
        {tab === 'profile' && (
          <ProfilePanel
            handle={handle}
            avatar={avatar}
            myPosts={myPosts}
            loading={loading}
            onOpenPost={(id) => setSelectedIssueId(id)}
            onCreate={() => setCreateOpen(true)}
            onSwitchToFeed={() => setTab('home')}
          />
        )}
      </main>

      {/* ── Mobile bottom tab bar ──────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-4 h-14">
          <BottomTab active={tab === 'home'} onClick={() => setTab('home')} icon={<Home className="h-6 w-6" />} label="Home" />
          <BottomTab active={tab === 'explore'} onClick={() => setTab('explore')} icon={<Compass className="h-6 w-6" />} label="Explore" />
          <BottomTab active={false} onClick={() => setCreateOpen(true)} icon={<PlusSquare className="h-6 w-6" />} label="Post" />
          <BottomTab active={tab === 'profile'} onClick={() => setTab('profile')} icon={<User className="h-6 w-6" />} label="Me" />
        </div>
      </nav>

      {/* ── Desktop right rail tabs (hidden on mobile) ─────────── */}
      {/* For now we use top header buttons instead, this is just to keep desktop layout clean */}

      {/* ── Modals ─────────────────────────────────────────────── */}
      {createOpen && (
        <CreatePostModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmitted={handleNewPost}
          deviceId={deviceId}
          handle={handle}
          avatar={avatar}
        />
      )}

      {selectedIssueId && (
        <PostDetailModal
          issueId={selectedIssueId}
          deviceId={deviceId}
          currentHandle={handle}
          currentAvatar={avatar}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  )
}

// ─── Home Feed ──────────────────────────────────────────────────────
function HomeFeed({
  issues, loading, deviceId, filterType, setFilterType, sortBy, setSortBy,
  onLike, onOpenPost, onRefresh,
}: {
  issues: Issue[]
  loading: boolean
  deviceId: string
  filterType: IssueType | 'all'
  setFilterType: (t: IssueType | 'all') => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  onLike: (id: string) => void
  onOpenPost: (id: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-4 py-0 sm:py-6">
      {/* ── Stories bar (filter by type) ── */}
      <div className="border-b border-border sm:border sm:rounded-lg bg-card p-3 mb-0 sm:mb-6 sticky top-14 z-30 sm:static sm:top-auto bg-background/95 backdrop-blur sm:bg-card">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {STORY_RINGS.map((s) => {
            const isActive = filterType === s.type
            return (
              <button
                key={s.type}
                onClick={() => setFilterType(s.type)}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div
                  className={cn(
                    'h-16 w-16 rounded-full p-[2.5px] bg-gradient-to-tr',
                    s.ring,
                    !isActive && 'opacity-60'
                  )}
                >
                  <div className="h-full w-full rounded-full bg-background p-[2.5px]">
                    <div className="h-full w-full rounded-full bg-muted flex items-center justify-center text-2xl">
                      {s.emoji}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] sm:text-xs',
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}>
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Sort toggle */}
        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between px-1">
          <div className="text-xs text-muted-foreground">
            {loading ? 'Loading feed…' : `${issues.length} issue${issues.length === 1 ? '' : 's'} in your area`}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortBy('latest')}
              className={cn(
                'text-xs px-2 py-1 rounded',
                sortBy === 'latest' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              Latest
            </button>
            <button
              onClick={() => setSortBy('top')}
              className={cn(
                'text-xs px-2 py-1 rounded',
                sortBy === 'top' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              Top
            </button>
            <button
              onClick={onRefresh}
              className="ml-1 p-1 hover:bg-accent rounded text-muted-foreground"
              aria-label="Refresh"
            >
              <Loader2 className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Feed posts ── */}
      <div className="space-y-0 sm:space-y-6 mt-0 sm:mt-0">
        {loading && issues.length === 0 ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
          </div>
        ) : issues.length === 0 ? (
          <EmptyFeed />
        ) : (
          issues.map(issue => (
            <PostCard
              key={issue.id}
              issue={issue}
              onLike={() => onLike(issue.issueId)}
              onOpen={() => onOpenPost(issue.issueId)}
            />
          ))
        )}
      </div>

      <div className="h-16 sm:h-4" />
    </div>
  )
}

// ─── Post Card (Instagram-style) ───────────────────────────────────
function PostCard({
  issue, onLike, onOpen,
}: {
  issue: Issue
  onLike: () => void
  onOpen: () => void
}) {
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localComments, setLocalComments] = useState<IssueComment[]>(issue.comments || [])
  const [commentsCount, setCommentsCount] = useState(issue.commentsCount || 0)

  const typeMeta = ISSUE_TYPE_META[issue.type]
  const statusMeta = STATUS_META[issue.status]
  const aiMeta = AI_RESULT_META[issue.aiResult]

  const handleQuickComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/issues/${issue.issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText,
          authorName: localStorage.getItem('citizen_handle') || 'anonymous_citizen',
          authorAvatar: localStorage.getItem('citizen_avatar') || '🦊',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLocalComments([...localComments, data.comment])
        setCommentsCount(data.commentsCount)
        setCommentText('')
      } else {
        toast.error(data.error || 'Failed to comment')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="bg-card border-0 sm:border sm:rounded-lg overflow-hidden">
      {/* Header: avatar + handle + location + menu */}
      <header className="flex items-center gap-3 px-3 sm:px-4 py-3">
        <button onClick={onOpen} className="shrink-0">
          <div className={cn(
            'h-9 w-9 rounded-full flex items-center justify-center text-base',
            getAvatarColor(issue.authorName)
          )}>
            {issue.authorAvatar}
          </div>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button onClick={onOpen} className="font-semibold text-sm truncate hover:underline">
              {issue.authorName}
            </button>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground">{formatRelative(issue.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{issue.address || `Lat ${issue.lat.toFixed(3)}, Lng ${issue.lng.toFixed(3)}`}</span>
          </div>
        </div>
        <button className="p-1.5 hover:bg-accent rounded-full" aria-label="More">
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      {/* Photo */}
      <button onClick={onOpen} className="block w-full bg-muted relative">
        <img
          src={issue.photoUrl}
          alt={`${typeMeta.label} reported at ${issue.address || 'location'}`}
          className="w-full aspect-square object-cover"
          loading="lazy"
        />
        {/* Top-left: type badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded-full">
          <span>{typeMeta.emoji}</span>
          <span className="font-medium">{typeMeta.label}</span>
        </div>
        {/* Top-right: AI verification badge */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 backdrop-blur text-xs px-2 py-1 rounded-full font-medium"
          style={{ backgroundColor: aiMeta.bg, color: aiMeta.color }}
        >
          {issue.aiResult === 'real' && <CheckCircle2 className="h-3 w-3" />}
          {issue.aiResult === 'uncertain' && <AlertTriangle className="h-3 w-3" />}
          {issue.aiResult === 'ai_generated' && <XCircle className="h-3 w-3" />}
          <span>{aiMeta.label}</span>
        </div>
        {/* Bottom-right: status pill */}
        <div
          className="absolute bottom-2 right-2 flex items-center gap-1 backdrop-blur text-xs px-2 py-1 rounded-full font-medium"
          style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
        >
          <span>{statusMeta.emoji}</span>
          <span>{statusMeta.label}</span>
        </div>
      </button>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 sm:px-4 pt-2">
        <button
          onClick={onLike}
          className="p-1.5 hover:opacity-60 transition-opacity"
          aria-label={issue.likedByMe ? 'Unlike' : 'Like'}
        >
          <Heart className={cn(
            'h-6 w-6 transition-all',
            issue.likedByMe ? 'fill-red-500 text-red-500 scale-105' : 'text-foreground'
          )} />
        </button>
        <button
          onClick={onOpen}
          className="p-1.5 hover:opacity-60 transition-opacity"
          aria-label="Comment"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        <button
          onClick={async () => {
            const shareUrl = `${window.location.origin}/#track`
            try {
              if (navigator.share) {
                await navigator.share({
                  title: `Civic issue: ${typeMeta.label}`,
                  text: issue.description || `Issue ${issue.issueId}`,
                  url: shareUrl,
                })
              } else {
                await navigator.clipboard.writeText(shareUrl)
                toast.success('Link copied!')
              }
            } catch { /* user cancelled */ }
          }}
          className="p-1.5 hover:opacity-60 transition-opacity"
          aria-label="Share"
        >
          <Send className="h-6 w-6" />
        </button>
        <button
          className="ml-auto p-1.5 hover:opacity-60 transition-opacity"
          aria-label="Save"
        >
          <Bookmark className="h-6 w-6" />
        </button>
      </div>

      {/* Likes count */}
      <div className="px-3 sm:px-4 text-sm font-semibold">
        {(issue.likesCount || 0).toLocaleString()} like{(issue.likesCount || 0) === 1 ? '' : 's'}
      </div>

      {/* Caption */}
      {issue.description && (
        <div className="px-3 sm:px-4 text-sm mt-1">
          <button onClick={onOpen} className="font-semibold mr-1.5 hover:underline">{issue.authorName}</button>
          <span className="whitespace-pre-wrap break-words">{issue.description}</span>
        </div>
      )}

      {/* Issue ID line */}
      <div className="px-3 sm:px-4 mt-1">
        <button
          onClick={onOpen}
          className="text-[11px] font-mono text-primary hover:underline"
        >
          {issue.issueId} · Tap to track status →
        </button>
      </div>

      {/* Comments preview (first 2) */}
      {localComments.length > 0 && (
        <div className="px-3 sm:px-4 mt-1 space-y-0.5">
          {localComments.slice(-2).map(c => (
            <div key={c.id} className="text-sm">
              <span className="font-semibold mr-1.5">{c.authorName}</span>
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {commentsCount > localComments.length && (
        <button
          onClick={onOpen}
          className="px-3 sm:px-4 mt-1 text-xs text-muted-foreground hover:underline"
        >
          View all {commentsCount} comments
        </button>
      )}

      {/* Quick comment box */}
      <form onSubmit={handleQuickComment} className="flex items-center gap-2 px-3 sm:px-4 py-3 mt-1 border-t border-border/60">
        <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-sm shrink-0">
          {localStorage.getItem('citizen_avatar') || '🦊'}
        </div>
        <Input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 h-9 border-0 bg-transparent focus-visible:ring-0 text-sm"
          maxLength={500}
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={!commentText.trim() || submitting}
          className="text-primary font-semibold text-sm"
        >
          Post
        </Button>
      </form>
    </article>
  )
}

// ─── Explore Grid ──────────────────────────────────────────────────
function ExploreGrid({
  issues, loading, onOpenPost,
}: {
  issues: Issue[]
  loading: boolean
  onOpenPost: (id: string) => void
}) {
  if (loading && issues.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }
  if (issues.length === 0) {
    return <EmptyFeed />
  }
  return (
    <div className="mx-auto max-w-5xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
      {issues.map(issue => (
        <button
          key={issue.id}
          onClick={() => onOpenPost(issue.issueId)}
          className="relative aspect-square overflow-hidden rounded-md group bg-muted"
        >
          <img
            src={issue.photoUrl}
            alt={issue.description || issue.issueId}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded-full">
            <span>{ISSUE_TYPE_META[issue.type].emoji}</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
            <div className="text-xs font-semibold flex items-center gap-1">
              <Heart className="h-3 w-3 fill-white" />
              {issue.likesCount || 0}
              <MessageCircle className="h-3 w-3 ml-1 fill-white" />
              {issue.commentsCount || 0}
            </div>
            <div className="text-[10px] truncate">{issue.address || issue.ward}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Profile Panel ─────────────────────────────────────────────────
function ProfilePanel({
  handle, avatar, myPosts, loading, onOpenPost, onCreate, onSwitchToFeed,
}: {
  handle: string
  avatar: string
  myPosts: Issue[]
  loading: boolean
  onOpenPost: (id: string) => void
  onCreate: () => void
  onSwitchToFeed: () => void
}) {
  const totalLikes = myPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0)
  const totalComments = myPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0)
  const resolvedCount = myPosts.filter(p => p.status === 'resolved').length

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-start gap-6 mb-6">
        <div className={cn(
          'h-20 w-20 sm:h-28 sm:w-28 rounded-full flex items-center justify-center text-4xl sm:text-5xl shrink-0',
          getAvatarColor(handle)
        )}>
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <h2 className="text-lg sm:text-xl font-semibold break-all">{handle}</h2>
            <Button size="sm" variant="outline" onClick={onCreate}>
              <PlusSquare className="h-4 w-4 mr-1" /> New Post
            </Button>
          </div>
          <div className="flex gap-4 sm:gap-6 text-sm mb-3">
            <div><span className="font-semibold">{myPosts.length}</span> <span className="text-muted-foreground">posts</span></div>
            <div><span className="font-semibold">{totalLikes}</span> <span className="text-muted-foreground">likes</span></div>
            <div><span className="font-semibold">{totalComments}</span> <span className="text-muted-foreground">comments</span></div>
            <div><span className="font-semibold">{resolvedCount}</span> <span className="text-muted-foreground">resolved</span></div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Anonymous citizen reporter</div>
            <div className="text-xs text-muted-foreground mt-0.5">Your reports help make your city better 🌱</div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">My Posts</h3>
        {loading ? (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : myPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📷</div>
            <p className="text-muted-foreground mb-4">No posts yet</p>
            <div className="flex justify-center gap-2">
              <Button onClick={onCreate}>Share your first post</Button>
              <Button variant="outline" onClick={onSwitchToFeed}>Browse feed</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {myPosts.map(p => (
              <button
                key={p.id}
                onClick={() => onOpenPost(p.issueId)}
                className="relative aspect-square overflow-hidden rounded-md group bg-muted"
              >
                <img src={p.photoUrl} alt={p.description || p.issueId} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold flex items-center gap-3">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3 fill-white" /> {p.likesCount || 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 fill-white" /> {p.commentsCount || 0}</span>
                  </div>
                </div>
                <div className="absolute top-1 left-1 text-xs">{ISSUE_TYPE_META[p.type].emoji}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bottom Tab (mobile) ───────────────────────────────────────────
function BottomTab({
  active, onClick, icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="bg-card border-0 sm:border sm:rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          <div className="h-2.5 w-40 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        <div className="h-2.5 w-full bg-muted animate-pulse rounded" />
        <div className="h-2.5 w-3/4 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────
function EmptyFeed() {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-6xl mb-4">🏙️</div>
      <h3 className="font-semibold text-lg mb-1">No posts in this view yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Be the first in your area to share a civic issue.
      </p>
    </div>
  )
}
