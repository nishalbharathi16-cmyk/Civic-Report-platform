'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Building2, CheckCircle2, ShieldCheck, Users, Activity } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface Analytics {
  totalIssues: number
  totalResolved: number
  totalRejected: number
  adminCount: number
  aiLogsCount: number
  overallResolutionRate: number
  wardStats: Array<{ ward: string; total: number; resolved: number; pending: number; inProgress: number; resolutionRate: number }>
  typeStats: Array<{ type: string; count: number }>
}

const TYPE_COLORS: Record<string, string> = {
  pothole: '#5D4037',
  garbage: '#6D4C41',
  light: '#37474F',
  water: '#0277BD',
  other: '#424242',
}

const TYPE_LABELS: Record<string, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage',
  light: 'Broken Light',
  water: 'Water Leak',
  other: 'Other',
}

export function SuperAdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const resp = await fetch('/api/admin/analytics')
        const json = await resp.json()
        if (mounted && json.success) setData(json.analytics)
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  if (!data) {
    return <Card><CardContent className="pt-8 text-center text-muted-foreground">Failed to load analytics.</CardContent></Card>
  }

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total Issues" value={data.totalIssues} icon={<Activity className="h-5 w-5" />} color="bg-primary/10 text-primary" />
        <StatTile label="Resolution Rate" value={`${data.overallResolutionRate}%`} icon={<CheckCircle2 className="h-5 w-5" />} color="bg-green-100 text-green-700" />
        <StatTile label="Active Officers" value={data.adminCount} icon={<Users className="h-5 w-5" />} color="bg-amber-100 text-amber-700" />
        <StatTile label="AI Detections" value={data.aiLogsCount} icon={<ShieldCheck className="h-5 w-5" />} color="bg-purple-100 text-purple-700" />
      </div>

      {/* Ward performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Ward Performance
          </CardTitle>
          <CardDescription>Issue volume and resolution rate by ward</CardDescription>
        </CardHeader>
        <CardContent>
          {data.wardStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No ward data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.wardStats} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="ward" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #ccc' }}
                  formatter={(value: number, name: string) => [value, name === 'total' ? 'Total' : name === 'resolved' ? 'Resolved' : name === 'pending' ? 'Pending' : 'In Progress']}
                />
                <Legend formatter={(value) => value.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} />
                <Bar dataKey="total" name="Total" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inProgress" name="In Progress" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Issue types breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Issue Types Breakdown
          </CardTitle>
          <CardDescription>Distribution of issues by category</CardDescription>
        </CardHeader>
        <CardContent>
          {data.typeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No type data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.typeStats.map(t => ({ name: TYPE_LABELS[t.type] || t.type, value: t.count }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {data.typeStats.map((t, i) => (
                    <Cell key={i} fill={TYPE_COLORS[t.type] || '#888'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatTile({ label, value, icon, color }: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
