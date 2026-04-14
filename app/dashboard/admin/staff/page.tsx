'use client'

import * as React from 'react'
import { Plus, Trash2, UserPlus, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function StaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({ fullName: '', email: '', password: '' })

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').in('role', ['admin', 'staff']).order('role', { ascending: true })
    setStaff(data || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Staff user created!')
      setStaff([...staff, data])
      setAddOpen(false)
      setForm({ fullName: '', email: '', password: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creating staff')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(id: string, current: boolean) {
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success(`Staff ${!current ? 'activated' : 'deactivated'}`)
      setStaff(staff.map(s => s.id === id ? { ...s, is_active: !current } : s))
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Staff</h1>
          <p className="text-sm text-slate-600 mt-1">Admin and Staff user accounts</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><UserPlus className="size-4 mr-2" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Staff Account</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="flex flex-col gap-4 py-4">
              <Input placeholder="Full Name" required value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} />
              <Input type="email" placeholder="Email Address" required value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
              <Input type="password" placeholder="Temporary Password" required minLength={6} value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">Create Account</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td></tr> : staff.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {s.avatar_url ? <img src={s.avatar_url} className="size-full rounded-full object-cover" /> : s.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{s.full_name}</p>
                      <p className="text-xs text-slate-500">Joined {new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={s.role === 'admin' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                      {s.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {s.is_active !== false ? 
                      <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium"><CheckCircle2 className="size-3.5" /> Active</span> :
                      <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium"><ShieldAlert className="size-3.5" /> Inactive</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    {s.role !== 'admin' && (
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(s.id, s.is_active !== false)} className="text-xs rounded-xl h-8">
                        {s.is_active !== false ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
