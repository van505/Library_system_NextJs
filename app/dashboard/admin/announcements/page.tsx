'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Bell, Plus, Edit, Trash2, Info, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminAnnouncementsPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal
  const [isOpen, setIsOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  
  // Form State
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [type, setType] = React.useState('info') // info, success, warning, danger
  const [isActive, setIsActive] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  function resetForm() {
    setTitle(''); setContent(''); setType('info'); setIsActive(true)
  }

  function openCreate() {
    setIsEditing(false); setEditingId(null); resetForm(); setIsOpen(true)
  }

  function openEdit(a: any) {
    setIsEditing(true); setEditingId(a.id); setTitle(a.title); setContent(a.content)
    setType(a.type || 'info'); setIsActive(a.is_active ?? true); setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    const payload = { title, content, type, is_active: isActive }

    let error;
    if (isEditing && editingId) {
      error = (await supabase.from('announcements').update(payload).eq('id', editingId)).error
    } else {
      error = (await supabase.from('announcements').insert(payload)).error
    }

    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success(isEditing ? 'Announcement updated' : 'Announcement broadcasted')
      setIsOpen(false)
      loadData()
    }
  }

  async function toggleActiveStatus(id: string, currentStatus: boolean) {
    const { error } = await supabase.from('announcements').update({ is_active: !currentStatus }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Status updated'); loadData() }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this announcement?')) {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) toast.error(error.message)
      else { toast.success('Announcement deleted'); loadData() }
    }
  }

  const getTypeConfig = (t: string) => {
    switch(t) {
      case 'success': return { icon: CheckCircle, colors: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      case 'warning': return { icon: AlertTriangle, colors: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'danger': return { icon: ShieldAlert, colors: 'bg-red-50 text-red-700 border-red-200' }
      default: return { icon: Info, colors: 'bg-blue-50 text-blue-700 border-blue-200' }
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">Manage global messages displayed to all library users.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" onClick={openCreate}><Plus className="size-4" /> New Announcement</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{isEditing ? 'Edit Announcement' : 'Broadcast Announcement'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input required value={title} onChange={e=>setTitle(e.target.value)} className="rounded-xl" placeholder="e.g. System Maintenance" />
              </div>
              <div className="space-y-2">
                <Label>Message Content <span className="text-red-500">*</span></Label>
                <Textarea required value={content} onChange={e=>setContent(e.target.value)} className="rounded-xl resize-none" rows={4} placeholder="Full message details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="danger">Danger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="h-10 flex items-center gap-3">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <span className="text-sm font-medium">{isActive ? 'Active (Visible)' : 'Hidden'}</span>
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white rounded-xl mt-4">
                {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Broadcast Now')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Bell className="size-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No announcements yet.</p>
          </div>
        ) : (
          announcements.map(a => {
            const cfg = getTypeConfig(a.type)
            const Icon = cfg.icon
            return (
              <Card key={a.id} className={`rounded-2xl border transition-all ${a.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-100 bg-slate-50/50 opacity-70'}`}>
                <CardContent className="p-5 flex flex-col md:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className={`${cfg.colors} shrink-0 text-xs py-0.5`}>
                        <Icon className="size-3 mr-1"/> <span className="capitalize">{a.type || 'Info'}</span>
                      </Badge>
                      {a.is_active ? <Badge variant="outline" className="border-indigo-200 text-indigo-600 bg-indigo-50">Active</Badge> 
                                   : <Badge variant="secondary" className="text-slate-500">Hidden</Badge>}
                      <span className="text-xs text-slate-400">• {format(new Date(a.created_at), 'MMM d, yyyy - h:mm a')}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{a.title}</h3>
                    <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{a.content}</p>
                  </div>
                  
                  <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-4">
                     <div className="flex items-center gap-2 mr-auto md:mr-0 mb-0 md:mb-2 text-sm text-slate-500">
                        <Switch checked={a.is_active} onCheckedChange={()=>toggleActiveStatus(a.id, a.is_active)} />
                        {a.is_active ? 'On' : 'Off'}
                     </div>
                     <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(a)}>
                          <Edit className="size-4"/>
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="size-4"/>
                        </Button>
                     </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
