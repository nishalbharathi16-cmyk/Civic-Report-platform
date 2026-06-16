'use client'

import { useState, useEffect, useCallback } from 'react'
import { CivicFeed } from '@/components/citizen/CivicFeed'
import { TrackPage } from '@/components/citizen/TrackPage'
import { AdminLogin } from '@/components/admin/AdminLogin'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import type { AdminUser } from '@/lib/types'

type View =
  | 'home'         // Instagram-style feed (default)
  | 'track'        // Track an issue by ID (legacy PRD requirement)
  | 'admin-login'
  | 'admin-dashboard'

interface AppState {
  view: View
  trackIssueId?: string
  adminUser?: AdminUser
}

export default function Home() {
  const [state, setState] = useState<AppState>({ view: 'home' })

  // ── Sync view with URL hash so the user can deep-link / refresh ──
  // Supported hashes: #track, #admin
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'track') setState(s => ({ ...s, view: 'track' }))
      else if (hash === 'admin') setState(s => ({ ...s, view: s.adminUser ? 'admin-dashboard' : 'admin-login' }))
      else if (hash === 'home' || hash === '') setState(s => ({ ...s, view: 'home' }))
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const setView = useCallback((view: View, extras: Partial<AppState> = {}) => {
    setState(s => ({ ...s, view, ...extras }))
    const hashMap: Record<View, string> = {
      home: '',
      track: 'track',
      'admin-login': 'admin',
      'admin-dashboard': 'admin',
    }
    const newHash = hashMap[view]
    if (window.location.hash.replace('#', '') !== newHash) {
      history.replaceState(null, '', newHash ? `#${newHash}` : window.location.pathname)
    }
  }, [])

  const goHome = () => setView('home')
  const goTrack = (issueId?: string) => setView('track', { trackIssueId: issueId })
  const goAdminLogin = () => setView('admin-login')

  const handleAdminLogin = (user: AdminUser) => {
    setView('admin-dashboard', { adminUser: user })
  }

  const handleAdminLogout = () => {
    setView('home', { adminUser: undefined })
  }

  switch (state.view) {
    case 'home':
      return <CivicFeed onAdminLogin={goAdminLogin} />

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
      return <CivicFeed onAdminLogin={goAdminLogin} />
  }
}
