'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from 'lucide-react'
import { type AIDetectionLog, type AIResult, AI_RESULT_META, formatRelative } from '@/lib/types'

export function AILogsPanel() {
  const [logs, setLogs] = useState<AIDetectionLog[]>([])
  const [summary, setSummary] = useState<{ total: number; real: number; uncertain: number; aiGenerated: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const load = async () => {
    setLoading(true)
    try {
      const url = filter === 'all' ? '/api/admin/ai-logs' : `/api/admin/ai-logs?result=${filter}`
      const resp = await fetch(url)
      const data = await resp.json()
      if (data.success) {
        setLogs(data.logs)
        setSummary(data.summary)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
     
  }, [filter])

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryTile label="Total Detections" value={summary.total} icon={<Loader2 className="h-4 w-4" />} color="bg-muted text-foreground" />
          <SummaryTile label="Verified Real" value={summary.real} icon={<ShieldCheck className="h-4 w-4" />} color="bg-green-100 text-green-700" />
          <SummaryTile label="Under Review" value={summary.uncertain} icon={<ShieldAlert className="h-4 w-4" />} color="bg-amber-100 text-amber-700" />
          <SummaryTile label="AI Generated" value={summary.aiGenerated} icon={<ShieldX className="h-4 w-4" />} color="bg-red-100 text-red-700" />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">AI Detection Audit Log</CardTitle>
              <CardDescription>Every AI image detection call is recorded here for audit</CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="real">✅ Real</SelectItem>
                <SelectItem value="uncertain">⚠️ Uncertain</SelectItem>
                <SelectItem value="ai_generated">❌ AI Generated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No AI detection logs yet.</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto space-y-2">
              {logs.map(log => {
                const meta = AI_RESULT_META[log.result as AIResult]
                const Icon = log.result === 'real' ? ShieldCheck
                  : log.result === 'uncertain' ? ShieldAlert : ShieldX
                return (
                  <div key={log.id} className="border rounded-lg p-3 flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs" style={{ color: meta.color, borderColor: meta.color }}>
                          {meta.emoji} {meta.label}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {Math.round(log.confidence * 100)}% confidence
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{formatRelative(log.createdAt)}</span>
                      </div>
                      {log.reasoning && (
                        <div className="text-sm mt-1 text-muted-foreground italic line-clamp-2">
                          &ldquo;{log.reasoning}&rdquo;
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        API: {log.apiUsed}
                        {log.issueId ? ` · Linked to issue` : ' · No issue created (rejected)'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryTile({ label, value, icon, color }: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
