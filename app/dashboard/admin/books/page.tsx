'use client'

import * as React from 'react'
import { Plus, Search, Trash2, Edit, Save, X, BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function BooksPage() {
  const supabase = createClient()
  const [books, setBooks] = React.useState<any[]>([])
  const [shelves, setShelves] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [addOpen, setAddOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    title: '', author: '', isbn: '', genre: '', cover_url: '',
    description: '', published_year: '', publisher: '', total_copies: 1, shelf_id: ''
  })

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [bRes, sRes] = await Promise.all([
      supabase.from('books').select('*, shelves(name)').order('created_at', { ascending: false }),
      supabase.from('shelves').select('*')
    ])
    setBooks(bRes.data || [])
    setShelves(sRes.data || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, available_copies: form.total_copies, shelf_id: form.shelf_id || null }
    const { data, error } = await supabase.from('books').insert([payload]).select('*, shelves(name)').single()
    if (error) { toast.error(error.message) }
    else {
      toast.success('Book added')
      setBooks([data, ...books])
      setAddOpen(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this book?')) return
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Book deleted'); setBooks(books.filter(b => b.id !== id)) }
  }

  const filtered = books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Books</h1>
          <p className="text-sm text-slate-600 mt-1">{books.length} total books</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><Plus className="size-4 mr-2" /> Add Book</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Book</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 sm:col-span-1"><Input placeholder="Title" required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} /></div>
              <div className="col-span-2 sm:col-span-1"><Input placeholder="Author" required value={form.author} onChange={e=>setForm({...form, author:e.target.value})} /></div>
              <div className="col-span-2 sm:col-span-1"><Input placeholder="ISBN" value={form.isbn} onChange={e=>setForm({...form, isbn:e.target.value})} /></div>
              <div className="col-span-2 sm:col-span-1"><Input placeholder="Genre" value={form.genre} onChange={e=>setForm({...form, genre:e.target.value})} /></div>
              <div className="col-span-2"><Input placeholder="Cover URL (optional)" value={form.cover_url} onChange={e=>setForm({...form, cover_url:e.target.value})} /></div>
              <div className="col-span-2"><Input placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} /></div>
              <div className="col-span-2 sm:col-span-1"><Input type="number" placeholder="Published Year" value={form.published_year} onChange={e=>setForm({...form, published_year:e.target.value})} /></div>
              <div className="col-span-2 sm:col-span-1"><Input placeholder="Publisher" value={form.publisher} onChange={e=>setForm({...form, publisher:e.target.value})} /></div>
              <div className="col-span-2 sm:col-span-1"><Input type="number" min={1} placeholder="Total Copies" required value={form.total_copies} onChange={e=>setForm({...form, total_copies:parseInt(e.target.value)})} /></div>
              <div className="col-span-2 sm:col-span-1">
                <Select value={form.shelf_id} onValueChange={v => setForm({...form, shelf_id: v==='null' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select Shelf" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">No Shelf</SelectItem>
                    {shelves.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 text-right">
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-4">Save Book</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input placeholder="Search books..." className="pl-9 h-11 rounded-xl bg-white border-slate-200" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Book</th>
                <th className="p-4">Genre</th>
                <th className="p-4">Copies (Avail/Total)</th>
                <th className="p-4">Shelf</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr> : filtered.length===0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No books found</td></tr> : filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-4 flex items-center gap-3">
                    <div className="h-10 w-8 bg-slate-100 rounded border border-slate-200 overflow-hidden shrink-0">
                      {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-2 text-slate-300" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{b.title}</p>
                      <p className="text-xs text-slate-500">{b.author}</p>
                    </div>
                  </td>
                  <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs">{b.genre || 'N/A'}</span></td>
                  <td className="p-4">
                    <span className={`font-semibold ${b.available_copies > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{b.available_copies}</span> / {b.total_copies}
                  </td>
                  <td className="p-4 text-slate-500">{b.shelves?.name || 'Unassigned'}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(b.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="size-4" /></button>
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
