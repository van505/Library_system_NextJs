'use client'

import * as React from 'react'
import { Plus, MapPin, Trash2, Library } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function ShelvesPage() {
  const supabase = createClient()
  const [shelves, setShelves] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', location: '', description: '' })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('shelves').select('*, books(id)').order('created_at', { ascending: false })
    setShelves(data || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.from('shelves').insert([form]).select('*, books(id)').single()
    if (error) { toast.error(error.message) }
    else { toast.success('Shelf added'); setShelves([data, ...shelves]); setAddOpen(false) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? Existing books must be reassigned first.')) return
    const { error } = await supabase.from('shelves').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Shelf deleted'); setShelves(shelves.filter(s => s.id !== id)) }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Shelves</h1>
          <p className="text-sm text-slate-600 mt-1">{shelves.length} mapped locations</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><Plus className="size-4 mr-2" /> Add Shelf</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Shelf</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="flex flex-col gap-4 py-4">
              <Input placeholder="Shelf Name (e.g. Science A)" required value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              <Input placeholder="Location (e.g. 2nd Floor)" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
              <Input placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">Save Shelf</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />) :
         shelves.length === 0 ? <p className="text-slate-500 col-span-full">No shelves created.</p> :
         shelves.map(s => {
           const count = s.books?.length || 0
           const progress = Math.min((count / 50) * 100, 100)
           return (
             <Card key={s.id} className="rounded-2xl border-slate-200 overflow-hidden shadow-sm bg-white relative group">
               <CardContent className="p-5">
                 <div className="flex justify-between items-start mb-4">
                   <div className="size-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                     <Library className="size-5" />
                   </div>
                   <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                     <Trash2 className="size-4" />
                   </button>
                 </div>
                 <h3 className="font-semibold text-slate-900 text-lg">{s.name}</h3>
                 <p className="flex items-center text-xs text-slate-500 mt-1 gap-1"><MapPin className="size-3" /> {s.location || 'Unknown'}</p>
                 
                 <div className="mt-6">
                   <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-600">
                     <span>Capacity usage</span>
                     <span>{count} books</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
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
