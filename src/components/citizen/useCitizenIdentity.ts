'use client'

import { useState, useEffect } from 'react'
import type { Issue, IssueType } from '@/lib/types'

const AVATAR_KEY = 'citizen_avatar'
const HANDLE_KEY = 'citizen_handle'
const DEVICE_KEY = 'citizen_device_id'

const AVATAR_OPTIONS = [
  '🦊', '🐼', '🦉', '🐙', '🦄', '🐯', '🦝', '🐨',
  '🦋', '🐢', '🦜', '🐝', '🦓', '🐰', '🐱', '🦁',
]

function generateDeviceId(): string {
  return 'dev-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
}

function readFromStorage(): { deviceId: string; handle: string; avatar: string } {
  if (typeof window === 'undefined') {
    return { deviceId: '', handle: '', avatar: '🦊' }
  }
  let did = localStorage.getItem(DEVICE_KEY)
  if (!did) {
    did = generateDeviceId()
    localStorage.setItem(DEVICE_KEY, did)
  }
  let h = localStorage.getItem(HANDLE_KEY)
  if (!h) {
    h = 'citizen_' + Math.random().toString(36).slice(2, 6)
    localStorage.setItem(HANDLE_KEY, h)
  }
  let a = localStorage.getItem(AVATAR_KEY)
  if (!a) {
    a = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]
    localStorage.setItem(AVATAR_KEY, a)
  }
  return { deviceId: did, handle: h, avatar: a }
}

export function useCitizenIdentity() {
  const [state, setState] = useState<{ deviceId: string; handle: string; avatar: string }>({
    deviceId: '',
    handle: '',
    avatar: '🦊',
  })

  useEffect(() => {
    // Read identity from localStorage on mount (client only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readFromStorage())
  }, [])

  const updateHandle = (h: string) => {
    const clean = h.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'citizen'
    setState(s => ({ ...s, handle: clean }))
    if (typeof window !== 'undefined') localStorage.setItem(HANDLE_KEY, clean)
  }

  const updateAvatar = (a: string) => {
    setState(s => ({ ...s, avatar: a }))
    if (typeof window !== 'undefined') localStorage.setItem(AVATAR_KEY, a)
  }

  return {
    deviceId: state.deviceId,
    handle: state.handle,
    avatar: state.avatar,
    updateHandle,
    updateAvatar,
  }
}

export interface FeedFilters {
  type: IssueType | 'all'
  sortBy: 'latest' | 'top'
}

export { AVATAR_OPTIONS }
export type { Issue }
