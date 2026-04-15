'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { BookOpen, Search, Plus, Trash2, Edit, Filter } from 'lucide-react'
import type { Book, Shelf, Category } from '@/lib/supabase'

export default function AdminBooksPage() {
  const supabase = createClient()
  const [books, setBooks] = React.useState<Book[]>([])
  const [shelves, setShelves] = React.useState<Shelf[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  
  // Filters
  const [search, setSearch] = React.useState('')
  const [filterCategory, setFilterCategory] = React.useState('all')
  const [filterShelf, setFilterShelf] = React.useState('all')

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Modal
  const [isOpen, setIsOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  
  // Form State
  const [title, setTitle] = React.useState('')
  const [author, setAuthor] = React.useState('')
  const [isbn, setIsbn] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [catId, setCatId] = React.useState('')
  const [shelfId, setShelfId] = React.useState('')
  const [publisher, setPublisher] = React.useState('')
  const [year, setYear] = React.useState('')
  const [totalCopies, setTotalCopies] = React.useState('1')
  const [coverUrl, setCoverUrl] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function loadData() {
    setLoading(true)
    const [bRes, sRes, cRes] = await Promise.all([
      supabase.from('books').select('*, shelves(name, location), categories(name, color, icon)').order('created_at', { ascending: false }),
      supabase.from('shelves').select('*').order('name'),
      supabase.from('categories').select('*').order('name')
    ])
    setBooks(bRes.data ?? [])
    setShelves(sRes.data ?? [])
    setCategories(cRes.data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  function resetForm() {
    setTitle(''); setAuthor(''); setIsbn(''); setDescription(''); setCatId(''); setShelfId('')
    setPublisher(''); setYear(''); setTotalCopies('1'); setCoverUrl('')
  }

  function openCreate() {
    setIsEditing(false); setEditingId(null); resetForm(); setIsOpen(true)
  }

  function openEdit(b: Book) {
    setIsEditing(true); setEditingId(b.id)
    setTitle(b.title); setAuthor(b.author); setIsbn(b.isbn || '')
    setDescription(b.description || ''); setCatId(b.category_id || ''); setShelfId(b.shelf_id || '')
    setPublisher(b.publisher || ''); setYear(b.published_year || ''); setTotalCopies(b.total_copies.toString()); setCoverUrl(b.cover_url || '')
    setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    // For new books, available = total. For edits, we don't mess with available copies unless we do a complex calculation (leaving simple for now).
    const copiesNum = parseInt(totalCopies) || 1
    const payload = {
      title, author, isbn: isbn || null, description: description || null,
      category_id: catId || null, shelf_id: shelfId || null, publisher: publisher || null,
      published_year: year || null, total_copies: copiesNum,
      // Default to true. If copies=0 it shouldn't be available, but this is a simplified flag
      available: copiesNum > 0, 
      cover_url: coverUrl || null
    }

    let error;
    if (isEditing && editingId) {
      error = (await supabase.from('books').update(payload).eq('id', editingId)).error
    } else {
      error = (await supabase.from('books').insert({ ...payload, available_copies: copiesNum })).error
    }

    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success(isEditing ? 'Book updated' : 'Book added')
      setIsOpen(false)
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this book? Historic transactions may break.')) {
      const { error } = await supabase.from('books').delete().eq('id', id)
      if (error) toast.error(error.message)
      else { toast.success('Book deleted'); loadData(); setSelectedIds(new Set()) }
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (confirm(`Delete ${selectedIds.size} books?`)) {
      const { error } = await supabase.from('books').delete().in('id', Array.from(selectedIds))
      if (error) toast.error(error.message)
      else { toast.success('Books deleted'); loadData(); setSelectedIds(new Set()) }
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(b => b.id)))
  }

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.isbn && b.isbn.includes(q))
    const matchCat = filterCategory === 'all' || b.category_id === filterCategory
    const matchShelf = filterShelf === 'all' || b.shelf_id === filterShelf
    return matchSearch && matchCat && matchShelf
  })

  // Stats bar
  const totalAcc = books.length
  const availAcc = books.reduce((a,b)=>a+(b.available_copies||0), 0)
  const borrowAcc = books.reduce((a,b)=>a+(b.total_copies - (b.available_copies||0)), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Books</h1>
          <p className="text-slate-500 text-sm mt-1">Add, update, and remove books from the catalog.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && <Button variant="destructive" className="rounded-xl" onClick={handleBulkDelete}><Trash2 className="size-4 mr-2"/> Delete ({selectedIds.size})</Button>}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" onClick={openCreate}><Plus className="size-4" /> Add Book</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isEditing ? 'Edit Book' : 'Add New Book'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title <span className="text-red-500">*</span></Label>
                    <Input required value={title} onChange={e=>setTitle(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Author <span className="text-red-500">*</span></Label>
                    <Input required value={author} onChange={e=>setAuthor(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>ISBN</Label>
                    <Input value={isbn} onChange={e=>setIsbn(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Copies <span className="text-red-500">*</span></Label>
                    <Input type="number" min="1" required value={totalCopies} onChange={e=>setTotalCopies(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={catId} onValueChange={setCatId}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Shelf</Label>
                    <Select value={shelfId} onValueChange={setShelfId}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Shelf" /></SelectTrigger>
                      <SelectContent>
                        {shelves.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.location})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Publisher</Label>
                    <Input value={publisher} onChange={e=>setPublisher(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Published Year</Label>
                    <Input type="number" value={year} onChange={e=>setYear(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cover Image URL</Label>
                  <Input value={coverUrl} onChange={e=>setCoverUrl(e.target.value)} className="rounded-xl" placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl resize-none" rows={3} />
                </div>
                <Button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white rounded-xl">
                  {saving ? 'Saving...' : 'Save Book'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</p>
          <p className="text-2xl font-bold text-slate-900">{totalAcc}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Available</p>
          <p className="text-2xl font-bold text-emerald-600">{availAcc}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Borrowed</p>
          <p className="text-2xl font-bold text-amber-600">{borrowAcc}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Categories</p>
          <p className="text-2xl font-bold text-indigo-600">{categories.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="pl-9 rounded-xl bg-white border-none shadow-sm" placeholder="Title, author, ISBN..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[200px] rounded-xl bg-white border-none shadow-sm"><Filter className="size-4 mr-2 text-slate-400"/><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterShelf} onValueChange={setFilterShelf}>
          <SelectTrigger className="w-full sm:w-[200px] rounded-xl bg-white border-none shadow-sm"><Filter className="size-4 mr-2 text-slate-400"/><SelectValue placeholder="Shelf" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shelves</SelectItem>
            {shelves.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border text-sm border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4 w-12"><Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} className="rounded-md" /></th>
              <th className="p-4 font-semibold">Book Info</th>
              <th className="p-4 font-semibold">ISBN</th>
              <th className="p-4 font-semibold">Category</th>
              <th className="p-4 font-semibold">Shelf</th>
              <th className="p-4 font-semibold">Copies</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto"/></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-12 text-center text-slate-500"><BookOpen className="size-10 text-slate-300 mx-auto mb-3" /> No books found.</td></tr>
            ) : filtered.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 align-top"><Checkbox checked={selectedIds.has(b.id)} onCheckedChange={()=>toggleSelect(b.id)} className="rounded-md" /></td>
                <td className="p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-14 rounded bg-slate-200 shrink-0 overflow-hidden relative">
                      {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full" style={{ backgroundColor: (b.categories as any)?.color || '#cbd5e1' }}/>}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight line-clamp-1">{b.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{b.author}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-500 font-mono text-xs">{b.isbn || '-'}</td>
                <td className="p-4">
                  {b.category_id ? (
                    <Badge variant="outline" className="border-transparent" style={{ backgroundColor: `${(b.categories as any)?.color}20`, color: (b.categories as any)?.color }}>
                      {(b.categories as any)?.name}
                    </Badge>
                  ) : <span className="text-slate-400 text-xs">-</span>}
                </td>
                <td className="p-4 text-slate-600 text-xs text-nowrap">{(b.shelves as any)?.name || '-'}</td>
                <td className="p-4 text-slate-600 text-xs">
                  <span className="font-medium text-slate-900">{b.available_copies}</span> / {b.total_copies}
                </td>
                <td className="p-4">
                  <Badge variant="outline" className={`border-transparent ${b.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {b.available_copies > 0 ? 'Available' : 'Out'}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(b)}><Edit className="size-4"/></Button>
                  <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(b.id)}><Trash2 className="size-4"/></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
