'use client'

import { useState, useEffect, useCallback } from 'react'
import { CitizenHome } from '@/components/citizen/CitizenHome'
import { ReportForm, ReportSuccess } from '@/components/citizen/ReportForm'
import { TrackPage } from '@/components/citizen/TrackPage'
import { AdminLogin } from '@/components/admin/AdminLogin'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import type { AdminUser } from '@/lib/types'

type View =
  | 'home'
  | 'report'
  | 'report-success'
  | 'track'
  | 'admin-login'
  | 'admin-dashboard'

interface AppState {
  view: View
  lastIssueId?: string
  trackIssueId?: string
  adminUser?: AdminUser
}

export default function Home() {
  const [state, setState] = useState<AppState>({ view: 'home' })

  // ── Sync view with URL hash so the user can deep-link / refresh ──
  // Supported hashes: #report, #track, #admin
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'report') setState(s => ({ ...s, view: 'report' }))
      else if (hash === 'track') setState(s => ({ ...s, view: 'track' }))
      else if (hash === 'admin') setState(s => ({ ...s, view: s.adminUser ? 'admin-dashboard' : 'admin-login' }))
      else if (hash === 'home' || hash === '') setState(s => ({ ...s, view: 'home' }))
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const setView = useCallback((view: View, extras: Partial<AppState> = {}) => {
    setState(s => ({ ...s, view, ...extras }))
    // Update hash without triggering the listener
    const hashMap: Record<View, string> = {
      home: '', report: 'report', 'report-success': 'report',
      track: 'track', 'admin-login': 'admin', 'admin-dashboard': 'admin',
    }
    const newHash = hashMap[view]
    if (window.location.hash.replace('#', '') !== newHash) {
      history.replaceState(null, '', newHash ? `#${newHash}` : window.location.pathname)
    }
  }, [])

  // ── Handlers ────────────────────────────────────────────────────
  const goReport = () => setView('report')
  const goTrack = (issueId?: string) => setView('track', { trackIssueId: issueId })
  const goHome = () => setView('home')
  const goAdminLogin = () => setView('admin-login')

  const handleReportSubmitted = (issueId: string) => {
    setView('report-success', { lastIssueId: issueId })
  }

  const handleAdminLogin = (user: AdminUser) => {
    setView('admin-dashboard', { adminUser: user })
  }

  const handleAdminLogout = () => {
    setView('home', { adminUser: undefined })
  }

  // ── Render based on view ────────────────────────────────────────
  switch (state.view) {
    case 'home':
      return <CitizenHome onReport={goReport} onTrack={() => goTrack()} onAdminLogin={goAdminLogin} />

    case 'report':
      return <ReportForm onSubmitted={handleReportSubmitted} onBack={goHome} />

    case 'report-success':
      return (
        <ReportSuccess
          issueId={state.lastIssueId || ''}
          onTrack={() => goTrack(state.lastIssueId)}
          onBackHome={goHome}
        />
      )

    case 'track':
      return <TrackPage initialIssueId={state.trackIssueId} onBack={goHome} />

    case 'admin-login':
      return <AdminLogin onBack={goHome} onLogin={handleAdminLogin} />

    case 'admin-dashboard':
      return state.adminUser ? (
        <AdminDashboard user={state.adminUser} onLogout={handleAdminLogout} />
      ) : (
        <AdminLogin onBack={goHome} onLogin={handleAdminLogin} />
      )

    default:
      return <CitizenHome onReport={goReport} onTrack={() => goTrack()} onAdminLogin={goAdminLogin} />
  }
}
