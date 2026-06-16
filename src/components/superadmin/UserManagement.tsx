'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { UserPlus, Loader2, ShieldCheck, Building2, Power } from 'lucide-react'
import { type AdminUser, type AdminRole, formatRelative } from '@/lib/types'

const WARDS = ['Ward-08', 'Ward-12', 'Ward-15', 'Ward-03', 'Ward-21']

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/admin/users')
      const data = await resp.json()
      if (data.success) setUsers(data.users)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (user: AdminUser) => {
    try {
      const resp = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error)
      toast.success(`${user.name} ${!user.isActive ? 'activated' : 'deactivated'}`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const deleteUser = async (user: AdminUser) => {
    if (!confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return
    try {
      const resp = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error)
      toast.success(`${user.name} deleted`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Municipality User Management
          </CardTitle>
          <CardDescription>Create, activate, or deactivate officer accounts</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add User
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users yet. Create one to get started.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-primary/10 text-primary'}`}>
                    {u.role === 'super_admin' ? <ShieldCheck className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {u.name}
                      <Badge variant={u.role === 'super_admin' ? 'default' : 'secondary'} className="text-xs">
                        {u.role === 'super_admin' ? 'Super Admin' : 'Officer'}
                      </Badge>
                      {u.ward && <Badge variant="outline" className="text-xs">{u.ward}</Badge>}
                      {!u.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email} · Last login: {u.lastLogin ? formatRelative(u.lastLogin) : 'never'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} />
                    <span className="text-xs text-muted-foreground">{u.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteUser(u)} className="text-red-600 hover:text-red-700">
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </Card>
  )
}

function CreateUserDialog({ open, onOpenChange, onCreated }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AdminRole>('admin')
  const [ward, setWard] = useState<string>('Ward-12')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName(''); setEmail(''); setPassword(''); setRole('admin'); setWard('Ward-12')
  }

  const submit = async () => {
    if (!name || !email || !password) {
      toast.error('All fields are required')
      return
    }
    setSubmitting(true)
    try {
      const resp = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, ward: role === 'admin' ? ward : null }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error)
      toast.success(`User ${name} created!`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Municipality User</DialogTitle>
          <DialogDescription>Add a new officer or super admin account</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block">Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kumar Rajan" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@chennaicorp.gov.in" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a password" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Officer (per ward)</SelectItem>
                <SelectItem value="super_admin">Super Admin (all wards)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === 'admin' && (
            <div>
              <Label className="text-xs mb-1 block">Assigned Ward</Label>
              <Select value={ward} onValueChange={setWard}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WARDS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</> : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
