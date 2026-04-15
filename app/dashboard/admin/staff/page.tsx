'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Users, Mail, Shield, ShieldAlert, Plus, Trash2 } from 'lucide-react'
import type { Profile } from '@/lib/supabase'

export default function AdminStaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = React.useState<Profile[]>([])
  const [loading, setLoading] = React.useState(true)

  // Auth User ID
  const [myId, setMyId] = React.useState<string | null>(null)

  // Modal
  const [isOpen, setIsOpen] = React.useState(false)
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [role, setRole] = React.useState('staff') // Default to staff
  const [saving, setSaving] = React.useState(false)

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)

    const { data } = await supabase.from('profiles').select('*').in('role', ['admin', 'staff']).order('role').order('full_name')
    setStaff(data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create staff')
      
      toast.success(`${role === 'admin' ? 'Admin' : 'Staff'} account created successfully`)
      setIsOpen(false)
      setFullName('')
      setEmail('')
      setPassword('')
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActiveStatus(id: string, currentStatus: boolean) {
    if (id === myId) {
      toast.error('You cannot deactivate your own account.')
      return
    }
    const { error } = await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Status updated'); loadData() }
  }

  async function handleDelete(id: string) {
    if (id === myId) {
      toast.error('You cannot delete your own account.')
      return
    }
    if (confirm('Delete this account completely? This will remove their profile and historic associations might break.')) {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) toast.error(error.message)
      else { toast.success('Account deleted'); loadData() }
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Staff</h1>
          <p className="text-slate-500 text-sm mt-1">Add and manage librarian staff and administrator accounts.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2"><Plus className="size-4" /> Add Staff Member</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Add New Account</DialogTitle></DialogHeader>
            <CardDescription>Creates an authenticated user immediately. No email invite required.</CardDescription>
            <form onSubmit={handleAddStaff} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input required value={fullName} onChange={e=>setFullName(e.target.value)} className="rounded-xl" placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email Address <span className="text-red-500">*</span></Label>
                <Input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-xl" placeholder="jane@library.com" />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password <span className="text-red-500">*</span></Label>
                <Input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2 mb-4">
                <Label>Role Level</Label>
                <div className="flex gap-4">
                  <Label className="flex items-center gap-2 cursor-pointer font-normal text-slate-600">
                    <input type="radio" name="role" value="staff" checked={role==='staff'} onChange={()=>setRole('staff')} className="accent-indigo-600" />
                    Library Staff
                  </Label>
                  <Label className="flex items-center gap-2 cursor-pointer font-normal text-slate-600">
                    <input type="radio" name="role" value="admin" checked={role==='admin'} onChange={()=>setRole('admin')} className="accent-indigo-600" />
                    Administrator
                  </Label>
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white rounded-xl">
                {saving ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold">Staff Member</th>
              <th className="p-4 font-semibold">Contact</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8"><Skeleton className="h-4 w-40 mx-auto"/></td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-500"><Users className="size-10 text-slate-300 mx-auto mb-3" /> No staff members found.</td></tr>
            ) : staff.map(s => {
              const isActive = s.is_active ?? true
              const initials = (s.full_name || 'U').charAt(0).toUpperCase()
              return (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm ${s.role === 'admin' ? 'bg-indigo-600' : 'bg-violet-500'}`}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{s.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{s.id.split('-')[0]}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="flex items-center gap-2"><Mail className="size-3.5 text-slate-400"/> {s.contact_number || '-'}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={`border-transparent ${s.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'}`}>
                      {s.role === 'admin' ? <ShieldAlert className="size-3 mr-1"/> : <Shield className="size-3 mr-1"/>}
                      <span className="capitalize">{s.role}</span>
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={isActive} onCheckedChange={() => toggleActiveStatus(s.id, isActive)} disabled={s.id === myId} />
                      <span className={`text-xs font-medium ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{isActive ? 'Active' : 'Disabled'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(s.id)} disabled={s.id === myId}>
                      <Trash2 className="size-4"/>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
