'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, LogIn, Loader2, Building2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { AdminUser } from '@/lib/types'

interface AdminLoginProps {
  onBack: () => void
  onLogin: (user: AdminUser) => void
}

export function AdminLogin({ onBack, onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password.')
      return
    }
    setLoading(true)
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Login failed')
      }
      toast.success(`Welcome back, ${data.user.name}!`)
      onLogin(data.user as AdminUser)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (which: 'admin' | 'super') => {
    if (which === 'admin') {
      setEmail('kumar@chennaicorp.gov.in')
      setPassword('admin123')
    } else {
      setEmail('priya@chennaicorp.gov.in')
      setPassword('admin123')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Municipality Login</CardTitle>
            <CardDescription>Sign in to access the officer dashboard or super admin panel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="officer@chennaicorp.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Signing in…</> : <><LogIn className="h-4 w-4 mr-1.5" /> Sign In</>}
            </Button>

            <Alert className="bg-accent/30 border-accent">
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div className="font-medium mb-1">Demo credentials</div>
                <div className="space-y-1">
                  <button
                    onClick={() => fillDemo('admin')}
                    className="block w-full text-left hover:underline"
                  >
                    👮 Officer: <code className="bg-muted px-1 rounded">kumar@chennaicorp.gov.in</code> / <code className="bg-muted px-1 rounded">admin123</code>
                  </button>
                  <button
                    onClick={() => fillDemo('super')}
                    className="block w-full text-left hover:underline"
                  >
                    ⚙️ Super Admin: <code className="bg-muted px-1 rounded">priya@chennaicorp.gov.in</code> / <code className="bg-muted px-1 rounded">admin123</code>
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
