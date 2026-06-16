'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  LogOut, RefreshCw, MapPin, AlertCircle, CheckCircle2, Clock, Loader2,
  ShieldAlert, ShieldCheck, ShieldX, Eye, Filter, Users, TrendingUp,
  Activity, Building2, Sparkles,
} from 'lucide-react'
import {
  type Issue, type IssueStatus, type AdminUser,
  ISSUE_TYPE_META, STATUS_META, AI_RESULT_META,
  formatRelative, formatDate,
} from '@/lib/types'
import { SuperAdminAnalytics } from '@/components/superadmin/SuperAdminAnalytics'
import { UserManagement } from '@/components/superadmin/UserManagement'
import { AILogsPanel } from '@/components/superadmin/AILogsPanel'

interface AdminDashboardProps {
  user: AdminUser
  onLogout: () => void
  onSwitchToSuperAdmin?: () => void
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterAi, setFilterAi] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<{
    total: number; pending: number; inProgress: number; resolved: number; rejected: number;
    today: number; aiReal: number; aiUncertain: number; aiGenerated: number;
    avgResolutionHours: number; byType: { type: string; count: number }[]; byWard: { ward: string; count: number }[];
  } | null>(null)

  const isSuperAdmin = user.role === 'super_admin'

  const loadIssues = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterType !== 'all') params.set('type', filterType)
      if (filterAi !== 'all') params.set('aiResult', filterAi)
      if (search) params.set('search', search)
      if (!isSuperAdmin && user.ward) params.set('ward', user.ward)

      const [issuesResp, statsResp] = await Promise.all([
        fetch(`/api/issues?${params.toString()}`),
        fetch(`/api/stats${!isSuperAdmin && user.ward ? `?ward=${user.ward}` : ''}`),
      ])
      const issuesData = await issuesResp.json()
      const statsData = await statsResp.json()
      if (issuesData.success) setIssues(issuesData.issues)
      if (statsData.success) setStats(statsData.stats)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIssues()
     
  }, [filterStatus, filterType, filterAi, isSuperAdmin, user.ward])

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => { if (search.length > 0 || search === '') loadIssues() }, 400)
    return () => clearTimeout(t)
     
  }, [search])

  // Auto refresh every 30s
  useEffect(() => {
    const t = setInterval(loadIssues, 30000)
    return () => clearInterval(t)
     
  }, [filterStatus, filterType, filterAi, isSuperAdmin, user.ward, search])

  const handleStatusUpdate = async (issue: Issue, newStatus: IssueStatus, note?: string) => {
    try {
      const resp = await fetch(`/api/issues/${issue.issueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note, actor: user.role }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error || 'Update failed')
      toast.success(`Status updated to "${newStatus.replace('_', ' ')}"`)
      // refresh data
      await loadIssues()
      // refresh selected issue
      const detailResp = await fetch(`/api/issues/${issue.issueId}`)
      const detailData = await detailResp.json()
      if (detailData.success) setSelectedIssue(detailData.issue)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const pendingCount = issues.filter(i => i.status === 'pending').length
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length
  const resolvedCount = issues.filter(i => i.status === 'resolved').length
  const flaggedCount = issues.filter(i => i.aiResult === 'uncertain' && i.status !== 'resolved' && i.status !== 'rejected').length

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <div className="font-bold leading-tight">
                {isSuperAdmin ? 'Super Admin Panel' : `Officer Dashboard — ${user.ward || 'All Wards'}`}
              </div>
              <div className="text-xs text-muted-foreground">
                {user.name} · {user.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadIssues} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Pending"
            value={loading ? '...' : String(stats?.pending ?? pendingCount)}
            icon={<Clock className="h-5 w-5" />}
            color="bg-red-50 text-red-700"
          />
          <StatCard
            title="In Progress"
            value={loading ? '...' : String(stats?.inProgress ?? inProgressCount)}
            icon={<Activity className="h-5 w-5" />}
            color="bg-amber-50 text-amber-700"
          />
          <StatCard
            title="Resolved"
            value={loading ? '...' : String(stats?.resolved ?? resolvedCount)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="bg-green-50 text-green-700"
          />
          <StatCard
            title="AI Flagged (Review)"
            value={loading ? '...' : String(stats?.aiUncertain ?? flaggedCount)}
            icon={<ShieldAlert className="h-5 w-5" />}
            color="bg-purple-50 text-purple-700"
          />
        </div>

        <Tabs defaultValue="map">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="map"><MapPin className="h-4 w-4 mr-1" /> Map View</TabsTrigger>
            <TabsTrigger value="list"><Filter className="h-4 w-4 mr-1" /> All Issues</TabsTrigger>
            <TabsTrigger value="flagged">
              <ShieldAlert className="h-4 w-4 mr-1" /> AI Flagged Queue
              {flaggedCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">{flaggedCount}</Badge>
              )}
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="superadmin"><Sparkles className="h-4 w-4 mr-1" /> Super Admin</TabsTrigger>
            )}
          </TabsList>

          {/* ─── MAP TAB ────────────────────────────────────────── */}
          <TabsContent value="map" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Issues Map</CardTitle>
                <CardDescription>
                  Color-coded pins: 🔴 Pending · 🟡 In Progress · 🟢 Resolved · ⚫ Rejected
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <IssuesMap issues={issues} onSelect={setSelectedIssue} />
                )}
                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: v.color }}
                      />
                      <span className="capitalize">{v.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── LIST TAB ───────────────────────────────────────── */}
          <TabsContent value="list" className="mt-4 space-y-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs mb-1 block">Search (ID / description / address)</Label>
                    <Input
                      placeholder="Search issues…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {(Object.keys(ISSUE_TYPE_META) as Array<keyof typeof ISSUE_TYPE_META>).map(t => (
                          <SelectItem key={t} value={t}>{ISSUE_TYPE_META[t].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">AI Verification</Label>
                    <Select value={filterAi} onValueChange={setFilterAi}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="real">✅ Verified Real</SelectItem>
                        <SelectItem value="uncertain">⚠️ Under Review</SelectItem>
                        <SelectItem value="ai_generated">❌ AI Generated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <Card><CardContent className="pt-5 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </CardContent></Card>
            ) : issues.length === 0 ? (
              <Card><CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No issues match your filters.
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {issues.map(issue => (
                  <IssueRow key={issue.id} issue={issue} onClick={() => setSelectedIssue(issue)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── AI FLAGGED TAB ─────────────────────────────────── */}
          <TabsContent value="flagged" className="mt-4 space-y-3">
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-purple-700" />
                  AI Flagged Queue
                </CardTitle>
                <CardDescription>
                  Issues with AI confidence between 50-80% need manual photo review before action.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const flagged = issues.filter(i => i.aiResult === 'uncertain')
                  if (flagged.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600 opacity-70" />
                        <div className="font-medium">Queue is empty!</div>
                        <div className="text-sm">No issues awaiting manual review right now.</div>
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-2">
                      {flagged.map(issue => (
                        <IssueRow key={issue.id} issue={issue} onClick={() => setSelectedIssue(issue)} />
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── SUPER ADMIN TAB ────────────────────────────────── */}
          {isSuperAdmin && (
            <TabsContent value="superadmin" className="mt-4">
              <SuperAdminPanel user={user} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Issue detail dialog */}
      <IssueDetailDialog
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────
function StatCard({ title, value, icon, color }: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Issue Row ─────────────────────────────────────────────────────
function IssueRow({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  const typeMeta = ISSUE_TYPE_META[issue.type]
  const statusMeta = STATUS_META[issue.status]
  const aiMeta = AI_RESULT_META[issue.aiResult]

  return (
    <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={onClick}>
      <CardContent className="pt-4 pb-4 flex items-center gap-3">
        { }
        <img src={issue.photoUrl} alt="Issue" className="w-14 h-14 rounded-lg object-cover border shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">{issue.issueId}</span>
            <span className="text-sm">{typeMeta.emoji} {typeMeta.label}</span>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {issue.description || issue.address || 'No description'}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            <MapPin className="inline h-3 w-3 mr-0.5" />
            {issue.address || `${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}`} · {issue.ward} · {formatRelative(issue.createdAt)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            style={{ backgroundColor: statusMeta.bg, color: statusMeta.color, borderColor: statusMeta.color }}
            className="text-xs"
          >
            {statusMeta.emoji} {statusMeta.label}
          </Badge>
          <Badge variant="outline" className="text-xs" style={{ color: aiMeta.color, borderColor: aiMeta.color }}>
            {aiMeta.emoji} {Math.round(issue.aiConfidence * 100)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Custom SVG Map (no external API needed) ───────────────────────
function IssuesMap({ issues, onSelect }: { issues: Issue[]; onSelect: (issue: Issue) => void }) {
  // Compute bounds from issues (fallback to Chennai center if no issues)
  const chennai = { lat: 13.0827, lng: 80.2707 }

  const bounds = useMemo(() => {
    if (issues.length === 0) {
      return { minLat: chennai.lat - 0.05, maxLat: chennai.lat + 0.05, minLng: chennai.lng - 0.05, maxLng: chennai.lng + 0.05 }
    }
    const lats = issues.map(i => i.lat)
    const lngs = issues.map(i => i.lng)
    const padLat = 0.005
    const padLng = 0.005
    return {
      minLat: Math.min(...lats) - padLat,
      maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng,
      maxLng: Math.max(...lngs) + padLng,
    }
  }, [issues])

  const W = 800
  const H = 400

  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * W
    const y = H - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * H
    return { x, y }
  }

  if (issues.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg bg-muted/20">
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No issues to display on map.
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-[#E8F5E9]">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[400px]" preserveAspectRatio="xMidYMid meet">
        {/* Background pattern - city blocks */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#A5D6A7" strokeWidth="0.5" opacity="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Some "roads" - decorative */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#81C784" strokeWidth="3" opacity="0.6" />
        <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="#81C784" strokeWidth="3" opacity="0.6" />
        <line x1="0" y1={H / 4} x2={W} y2={H / 4} stroke="#A5D6A7" strokeWidth="2" opacity="0.4" />
        <line x1={W / 4} y1="0" x2={W / 4} y2={H} stroke="#A5D6A7" strokeWidth="2" opacity="0.4" />
        <line x1="0" y1={3 * H / 4} x2={W} y2={3 * H / 4} stroke="#A5D6A7" strokeWidth="2" opacity="0.4" />
        <line x1={3 * W / 4} y1="0" x2={3 * W / 4} y2={H} stroke="#A5D6A7" strokeWidth="2" opacity="0.4" />

        {/* Issue markers */}
        {issues.map(issue => {
          const { x, y } = project(issue.lat, issue.lng)
          const statusMeta = STATUS_META[issue.status]
          return (
            <g
              key={issue.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onClick={() => onSelect(issue)}
            >
              {/* Pulse for pending */}
              {issue.status === 'pending' && (
                <circle r="14" fill={statusMeta.color} opacity="0.2">
                  <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r="9" fill={statusMeta.color} stroke="#fff" strokeWidth="2" />
              <text textAnchor="middle" dy="3.5" fontSize="9" fill="#fff">
                {ISSUE_TYPE_META[issue.type].emoji}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Issue Detail Dialog ───────────────────────────────────────────
function IssueDetailDialog({ issue, onClose, onStatusUpdate }: {
  issue: Issue | null
  onClose: () => void
  onStatusUpdate: (issue: Issue, status: IssueStatus, note?: string) => void
}) {
  if (!issue) return null
  return (
    <Dialog open={!!issue} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <IssueDetailInner key={issue.id} issue={issue} onStatusUpdate={onStatusUpdate} />
      </DialogContent>
    </Dialog>
  )
}

function IssueDetailInner({ issue, onStatusUpdate }: {
  issue: Issue
  onStatusUpdate: (issue: Issue, status: IssueStatus, note?: string) => void
}) {
  const [resolutionNote, setResolutionNote] = useState('')
  const [updating, setUpdating] = useState(false)

  const typeMeta = ISSUE_TYPE_META[issue.type]
  const statusMeta = STATUS_META[issue.status]
  const aiMeta = AI_RESULT_META[issue.aiResult]

  const handleUpdate = async (status: IssueStatus) => {
    setUpdating(true)
    await onStatusUpdate(issue, status, resolutionNote)
    setUpdating(false)
  }

  const AiIcon = issue.aiResult === 'real' ? ShieldCheck
    : issue.aiResult === 'uncertain' ? ShieldAlert : ShieldX

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">{issue.issueId}</span>
          <span>{typeMeta.emoji} {typeMeta.label}</span>
          <Badge style={{ backgroundColor: statusMeta.bg, color: statusMeta.color, borderColor: statusMeta.color }}>
            {statusMeta.emoji} {statusMeta.label}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Reported {formatRelative(issue.createdAt)} · {issue.ward}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Photo */}
        { }
        <img src={issue.photoUrl} alt="Issue" className="w-full max-h-72 object-cover rounded-lg border" />

        {/* AI verification */}
        <div
          className="flex items-start gap-3 rounded-lg p-3 border"
          style={{ backgroundColor: aiMeta.bg, borderColor: aiMeta.color }}
        >
          <AiIcon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: aiMeta.color }} />
          <div className="flex-1">
            <div className="font-medium text-sm" style={{ color: aiMeta.color }}>
              {aiMeta.emoji} {aiMeta.label}
            </div>
            <div className="text-xs" style={{ color: aiMeta.color }}>
              Confidence: {Math.round(issue.aiConfidence * 100)}% · checked {formatRelative(issue.aiCheckedAt)} via {issue.aiApiUsed}
            </div>
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Description</div>
            <p className="text-sm">{issue.description}</p>
          </div>
        )}

        {/* Location */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div>{issue.address || `${issue.lat.toFixed(6)}, ${issue.lng.toFixed(6)}`}</div>
            <div className="text-xs text-muted-foreground">
              Ward: {issue.ward} · Lat {issue.lat.toFixed(6)}, Lng {issue.lng.toFixed(6)}
            </div>
          </div>
        </div>

        {/* Timeline */}
        {issue.timeline && issue.timeline.length > 0 && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Timeline</div>
            <div className="space-y-2">
              {issue.timeline.map(ev => {
                const m = STATUS_META[ev.toStatus as keyof typeof STATUS_META]
                return (
                  <div key={ev.id} className="text-sm border-l-2 pl-3 py-1" style={{ borderColor: m?.color }}>
                    <div className="font-medium capitalize">{ev.toStatus.replace('_', ' ')}</div>
                    {ev.note && <div className="text-muted-foreground">{ev.note}</div>}
                    <div className="text-xs text-muted-foreground">{formatDate(ev.createdAt)} · by {ev.actor.replace('_', ' ')}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Status update controls */}
        <div className="border-t pt-4 space-y-3">
          <div className="font-medium text-sm">Update Status</div>
          <div>
            <Label className="text-xs mb-1 block">Resolution note (optional, for resolved/rejected)</Label>
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Fixed by replacing broken pipe"
              rows={2}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm" variant="outline"
              disabled={issue.status === 'pending' || updating}
              onClick={() => handleUpdate('pending')}
            >
              🔴 Pending
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={issue.status === 'in_progress' || updating}
              onClick={() => handleUpdate('in_progress')}
            >
              🟡 In Progress
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={issue.status === 'resolved' || updating}
              onClick={() => handleUpdate('resolved')}
              className="text-green-700 border-green-600"
            >
              {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              🟢 Resolve
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={issue.status === 'rejected' || updating}
              onClick={() => handleUpdate('rejected')}
              className="text-red-700 border-red-600"
            >
              ⚫ Reject
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Super Admin Panel (analytics + user management + AI logs) ─────
function SuperAdminPanel({ user: _user }: { user: AdminUser }) {
  const [tab, setTab] = useState<'analytics' | 'users' | 'ailogs'>('analytics')
  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'analytics' | 'users' | 'ailogs')}>
        <TabsList>
          <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> User Management</TabsTrigger>
          <TabsTrigger value="ailogs"><ShieldCheck className="h-4 w-4 mr-1" /> AI Detection Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <SuperAdminAnalytics />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>
        <TabsContent value="ailogs" className="mt-4">
          <AILogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
