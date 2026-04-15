'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Library, MapPin, Plus, Edit, Trash2 } from 'lucide-react'
import type { Shelf } from '@/lib/supabase'

export default function AdminShelvesPage() {
  const supabase = createClient()
  const [shelves, setShelves] = React.useState<(Shelf & { book_count?: number })[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal State
  const [isOpen, setIsOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function loadData() {
    setLoading(true)
    const { data: s } = await supabase.from('shelves').select('*').order('name')
    if (s) {
      const counts = await Promise.all(s.map(async (shelf) => {
        const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).eq('shelf_id', shelf.id)
        return { ...shelf, book_count: count ?? 0 }
      }))
      setShelves(counts)
    }
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  function openCreate() {
    setIsEditing(false); setEditingId(null); setName(''); setLocation(''); setDescription(''); setIsOpen(true)
  }

  function openEdit(s: Shelf) {
    setIsEditing(true); setEditingId(s.id); setName(s.name); setLocation(s.location); setDescription(s.description || ''); setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { name, location, description: description || null }
    let error;

    if (isEditing && editingId) {
      error = (await supabase.from('shelves').update(payload).eq('id', editingId)).error
    } else {
      error = (await supabase.from('shelves').insert(payload)).error
    }

    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success(isEditing ? 'Shelf updated' : 'Shelf created'); setIsOpen(false); loadData() }
  }

  async function handleDelete(id: string, count: number) {
    if (count > 0) {
      toast.error('Cannot delete a shelf that has books assigned to it. Reassign or delete the books first.')
      return
    }
    if (confirm('Are you sure you want to delete this shelf?')) {
      const { error } = await supabase.from('shelves').delete().eq('id', id)
      if (error) toast.error(error.message)
      else { toast.success('Shelf deleted'); loadData() }
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Shelves</h1>
          <p className="text-slate-500 text-sm mt-1">Organize physical locations and track library capacity.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" onClick={openCreate}><Plus className="size-4" /> Add Shelf</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader><DialogTitle>{isEditing ? 'Edit Shelf' : 'Add New Shelf'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Shelf Name <span className="text-red-500">*</span></Label>
                <Input required value={name} onChange={e=>setName(e.target.value)} className="rounded-xl" placeholder="e.g. Science Section A" />
              </div>
              <div className="space-y-2">
                <Label>Location / Room <span className="text-red-500">*</span></Label>
                <Input required value={location} onChange={e=>setLocation(e.target.value)} className="rounded-xl" placeholder="e.g. Main Hall" />
              </div>
              <div className="space-y-2">
                <Label>Notes / Description</Label>
                <Textarea value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl resize-none" rows={3} placeholder="Additional info..." />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white rounded-xl">
                {saving ? 'Saving...' : 'Save Shelf'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : shelves.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Library className="size-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No shelves yet. Add your first shelf.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shelves.map(s => {
            const count = s.book_count ?? 0
            const maxCapacity = 50 // arbitrary max for visual purpose requested
            const percentage = Math.min(100, Math.round((count / maxCapacity) * 100))
            
            return (
              <Card key={s.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Library className="size-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 leading-tight">{s.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <MapPin className="size-3 shrink-0" /> <span className="truncate">{s.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(s)}><Edit className="size-3.5"/></Button>
                      <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-red-600" onClick={() => handleDelete(s.id, count)}><Trash2 className="size-3.5"/></Button>
                    </div>
                  </div>
                  
                  {s.description && <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-10">{s.description}</p>}

                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-900">{count} Books</span>
                      <span className="text-slate-400">{percentage}% capacity</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
