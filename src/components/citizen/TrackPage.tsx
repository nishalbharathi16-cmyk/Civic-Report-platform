'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft, Search, MapPin, Clock, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ShieldCheck, ShieldAlert, ShieldX,
} from 'lucide-react'
import {
  type Issue, ISSUE_TYPE_META, STATUS_META, AI_RESULT_META,
  formatRelative, formatDate,
} from '@/lib/types'

interface TrackPageProps {
  initialIssueId?: string
  onBack: () => void
}

export function TrackPage({ initialIssueId, onBack }: TrackPageProps) {
  const [searchId, setSearchId] = useState(initialIssueId || '')
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const lookup = async (idToSearch: string) => {
    if (!idToSearch.trim()) {
      toast.error('Please enter an Issue ID.')
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const resp = await fetch(`/api/issues/${encodeURIComponent(idToSearch.trim())}`)
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        setIssue(null)
        toast.error(data.error || 'Issue not found')
        return
      }
      setIssue(data.issue)
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch issue')
      setIssue(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-lookup if initialIssueId provided
  useEffect(() => {
    if (initialIssueId) {
      lookup(initialIssueId)
    }
     
  }, [initialIssueId])

  const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, resolved: 2, rejected: 2 }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Track Your Issue</h1>
          <p className="text-muted-foreground mt-1">Enter your Issue ID to view its current status and timeline</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. ISS-2026-0001"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') lookup(searchId) }}
                className="font-mono"
              />
              <Button onClick={() => lookup(searchId)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Track</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </CardContent>
          </Card>
        )}

        {!loading && searched && !issue && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Issue not found</AlertTitle>
            <AlertDescription>
              Double-check your Issue ID. It should look like <code className="bg-muted px-1 rounded">ISS-YYYY-NNNN</code>.
            </AlertDescription>
          </Alert>
        )}

        {!loading && issue && (
          <IssueDetail issue={issue} />
        )}
      </div>
    </div>
  )
}

// ─── Issue detail panel ────────────────────────────────────────────
function IssueDetail({ issue }: { issue: Issue }) {
  const typeMeta = ISSUE_TYPE_META[issue.type]
  const statusMeta = STATUS_META[issue.status]
  const aiMeta = AI_RESULT_META[issue.aiResult]

  const AiIcon = issue.aiResult === 'real' ? ShieldCheck
    : issue.aiResult === 'uncertain' ? ShieldAlert : ShieldX

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="font-mono text-sm text-muted-foreground mb-1">{issue.issueId}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">{typeMeta.emoji}</span>
                <h2 className="text-xl font-bold">{typeMeta.label}</h2>
              </div>
            </div>
            <Badge
              style={{ backgroundColor: statusMeta.bg, color: statusMeta.color, borderColor: statusMeta.color }}
              className="text-sm px-3 py-1"
            >
              {statusMeta.emoji} {statusMeta.label}
            </Badge>
          </div>

          {/* Photo */}
          { }
          <img
            src={issue.photoUrl}
            alt="Issue"
            className="w-full max-h-72 object-cover rounded-lg border mb-4"
          />

          {/* AI badge */}
          <div
            className="flex items-center gap-2 rounded-lg p-3 border"
            style={{ backgroundColor: aiMeta.bg, borderColor: aiMeta.color }}
          >
            <AiIcon className="h-5 w-5 shrink-0" style={{ color: aiMeta.color }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm" style={{ color: aiMeta.color }}>
                {aiMeta.emoji} {aiMeta.label}
              </div>
              <div className="text-xs opacity-80" style={{ color: aiMeta.color }}>
                Confidence: {Math.round(issue.aiConfidence * 100)}% · checked {formatRelative(issue.aiCheckedAt)}
              </div>
            </div>
          </div>

          {issue.description && (
            <div className="mt-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Description</div>
              <p className="text-sm">{issue.description}</p>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div>{issue.address || `${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}`}</div>
              <div className="text-xs text-muted-foreground">{issue.ward}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" /> Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issue.timeline && issue.timeline.length > 0 ? (
            <div className="space-y-4">
              {issue.timeline.map((ev, idx) => {
                const meta = STATUS_META[ev.toStatus as keyof typeof STATUS_META]
                const Icon = ev.toStatus === 'resolved' ? CheckCircle2
                  : ev.toStatus === 'rejected' ? XCircle
                  : ev.toStatus === 'in_progress' ? AlertTriangle
                  : Clock
                return (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: meta?.bg, color: meta?.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {idx < issue.timeline!.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="font-medium text-sm capitalize">
                        {ev.toStatus.replace('_', ' ')}
                      </div>
                      {ev.note && <div className="text-sm text-muted-foreground">{ev.note}</div>}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(ev.createdAt)} · by {ev.actor.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No status updates yet.</p>
          )}
        </CardContent>
      </Card>

      {issue.status === 'resolved' && issue.resolutionNote && (
        <Alert className="border-green-600/40 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-700" />
          <AlertTitle className="text-green-800">Issue Resolved ✅</AlertTitle>
          <AlertDescription className="text-green-700">{issue.resolutionNote}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
