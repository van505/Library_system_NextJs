'use client'

import * as React from 'react'
import { Plus, Trash2, Megaphone, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnnouncementsPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  
  const [form, setForm] = React.useState({ title: '', content: '', type: 'info' })

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('announcements').select('*, profiles:created_by(full_name)').order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('announcements').insert([{ ...form, created_by: user?.id }]).select('*, profiles:created_by(full_name)').single()
    if (error) toast.error(error.message)
    else {
      toast.success('Announcement published!')
      setAnnouncements([data, ...announcements])
      setAddOpen(false)
      setForm({ title: '', content: '', type: 'info' })
    }
    setSaving(false)
  }

  async function toggleStatus(id: string, current: boolean) {
    const { error } = await supabase.from('announcements').update({ is_active: !current }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      setAnnouncements(announcements.map(a => a.id === id ? { ...a, is_active: !current } : a))
      toast.success(`Announcement ${!current ? 'activated' : 'deactivated'}`)
    }
  }

  async function handleDelete(id: string) {
    if(!confirm('Delete this announcement permanently?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      setAnnouncements(announcements.filter(a => a.id !== id))
      toast.success('Deleted')
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-600 mt-1">Manage public messages on the homepage</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><Plus className="size-4 mr-2" /> New Announcement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="flex flex-col gap-4 py-4">
              <Input placeholder="Announcement Title" required value={form.title} onChange={e=>setForm({...form, title: e.target.value})} />
              <Textarea placeholder="Content..." required value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="h-24 resize-none" />
              <Select value={form.type} onValueChange={v=>setForm({...form, type: v})}>
                <SelectTrigger><SelectValue placeholder="Announcement Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue)</SelectItem>
                  <SelectItem value="success">Success (Emerald)</SelectItem>
                  <SelectItem value="warning">Warning (Amber)</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">Publish Now</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-40 rounded-2xl" />) : announcements.length === 0 ? <p className="text-slate-500 col-span-full">No announcements yet.</p> : announcements.map(ann => {
          const isWarning = ann.type === 'warning'
          const isSuccess = ann.type === 'success'
          const colorClass = isWarning ? 'text-amber-600 bg-amber-50 border-amber-200' : isSuccess ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-blue-600 bg-blue-50 border-blue-200'
          const bgClass = !ann.is_active ? 'bg-slate-50 border-slate-200 opacity-70 grayscale-[0.5]' : colorClass
          const Icon = isWarning ? AlertTriangle : isSuccess ? CheckCircle2 : Info

          return (
            <Card key={ann.id} className={`rounded-2xl border ${bgClass} overflow-hidden shadow-sm relative group transition-all`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5 shrink-0" />
                    <h3 className="font-semibold text-slate-900 leading-tight">{ann.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-700 line-clamp-3 my-2 flex-1">{ann.content}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg bg-white/50" onClick={() => toggleStatus(ann.id, ann.is_active)}>
                      {ann.is_active ? 'Hide' : 'Show'}
                    </Button>
                    <button onClick={() => handleDelete(ann.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white/50 rounded-lg hover:bg-white"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
