'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { BookOpen, Search, Plus, Trash2, Edit, Filter, X, Link as LinkIcon, Upload, ImageIcon } from 'lucide-react'
import type { Shelf, Category } from '@/lib/supabase'

type BookRow = {
  id: string
  title: string
  author: string
  isbn: string | null
  description: string | null
  shelf_id: string | null
  available: boolean
  total_copies: number
  available_copies: number
  cover_url: string | null
  published_year: string | null
  publisher: string | null
  created_at: string
  shelves?: { name: string; location: string } | null
  book_categories?: { categories: Category }[]
}

// ── Multi-select category tag picker ─────────────────────────────────────────
function CategoryPicker({
  allCategories,
  selected,
  onChange,
}: {
  allCategories: Category[]
  selected: Category[]
  onChange: (cats: Category[]) => void
}) {
  const [query, setQuery] = React.useState('')
  const unselected = allCategories.filter(
    c => !selected.some(s => s.id === c.id) &&
      c.name.toLowerCase().includes(query.toLowerCase())
  )

  function add(cat: Category) {
    onChange([...selected, cat])
    setQuery('')
  }

  function remove(id: string) {
    onChange(selected.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-2">
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(cat => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${cat.color}25`, color: cat.color, border: `1px solid ${cat.color}50` }}
            >
              {cat.name}
              <button type="button" onClick={() => remove(cat.id)} className="ml-0.5 hover:opacity-70">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search categories..."
          className="pl-8 h-9 rounded-xl text-sm"
        />
      </div>

      {/* Dropdown options */}
      {(query || unselected.length < allCategories.length - selected.length) && unselected.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto shadow-sm">
          {unselected.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => add(cat)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left"
            >
              <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
      )}
      {allCategories.length > 0 && unselected.length === 0 && query === '' && selected.length > 0 && (
        <p className="text-xs text-slate-400 text-center py-1">All categories selected</p>
      )}
      {allCategories.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-1">No categories yet. Add some from Manage Categories.</p>
      )}
    </div>
  )
}

// ── Cover image input: URL tab + Upload tab ───────────────────────────────────
function CoverImageInput({
  coverUrl,
  setCoverUrl,
  onFileUpload,
}: {
  coverUrl: string
  setCoverUrl: (v: string) => void
  onFileUpload: (file: File) => void
}) {
  const [tab, setTab] = React.useState<'url' | 'upload'>('url')
  const [preview, setPreview] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (tab === 'url' && coverUrl.startsWith('http')) setPreview(coverUrl)
    else if (tab === 'url') setPreview('')
  }, [coverUrl, tab])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG or WebP images are allowed')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be under 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    onFileUpload(file)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl w-fit">
        {(['url', 'upload'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
              tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'url' ? <LinkIcon className="size-3" /> : <Upload className="size-3" />}
            {t === 'url' ? 'Image URL' : 'Upload File'}
          </button>
        ))}
      </div>

      {tab === 'url' ? (
        <Input
          value={coverUrl}
          onChange={e => setCoverUrl(e.target.value)}
          className="rounded-xl text-sm"
          placeholder="https://example.com/cover.jpg"
        />
      ) : (
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Upload className="size-6 text-slate-400 mx-auto mb-1" />
          <p className="text-xs text-slate-500">Click to upload JPG, PNG or WebP</p>
          <p className="text-xs text-slate-400 mt-0.5">Max 2 MB</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="flex items-center gap-3 mt-1">
          <div className="w-12 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0">
            <img src={preview} className="w-full h-full object-cover" alt="Preview" />
          </div>
          <div className="text-xs text-slate-500">
            {tab === 'url' ? 'URL preview' : 'Upload preview'}
          </div>
          <button type="button" onClick={() => { setPreview(''); setCoverUrl('') }} className="ml-auto text-slate-400 hover:text-red-500">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminBooksPage() {
  const supabase = createClient()
  const [books, setBooks] = React.useState<BookRow[]>([])
  const [shelves, setShelves] = React.useState<Shelf[]>([])
  const [allCategories, setAllCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [search, setSearch] = React.useState('')
  const [filterCatId, setFilterCatId] = React.useState('all')
  const [filterShelf, setFilterShelf] = React.useState('all')

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Modal
  const [isOpen, setIsOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)

  // Form state
  const [title, setTitle] = React.useState('')
  const [author, setAuthor] = React.useState('')
  const [isbn, setIsbn] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [selectedCats, setSelectedCats] = React.useState<Category[]>([])
  const [shelfId, setShelfId] = React.useState('')
  const [publisher, setPublisher] = React.useState('')
  const [year, setYear] = React.useState('')
  const [totalCopies, setTotalCopies] = React.useState('1')
  const [coverUrl, setCoverUrl] = React.useState('')
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [categoriesDbCount, setCategoriesDbCount] = React.useState(0)

  async function loadData() {
    setLoading(true)
    const [bRes, sRes, cRes, cCount] = await Promise.all([
      supabase
        .from('books')
        .select('*, shelves(name, location), book_categories(categories(*))')
        .order('created_at', { ascending: false }),
      supabase.from('shelves').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
    ])
    setBooks((bRes.data ?? []) as BookRow[])
    setShelves(sRes.data ?? [])
    setAllCategories(cRes.data ?? [])
    setCategoriesDbCount(cCount.count ?? 0)
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [])

  function resetForm() {
    setTitle(''); setAuthor(''); setIsbn(''); setDescription('')
    setSelectedCats([]); setShelfId(''); setPublisher(''); setYear('')
    setTotalCopies('1'); setCoverUrl(''); setPendingFile(null)
  }

  function openCreate() {
    setIsEditing(false); setEditingId(null); resetForm(); setIsOpen(true)
  }

  function openEdit(b: BookRow) {
    setIsEditing(true); setEditingId(b.id)
    setTitle(b.title); setAuthor(b.author); setIsbn(b.isbn || '')
    setDescription(b.description || ''); setShelfId(b.shelf_id || '')
    setPublisher(b.publisher || ''); setYear(b.published_year || '')
    setTotalCopies(b.total_copies.toString()); setCoverUrl(b.cover_url || '')
    setPendingFile(null)

    // Pre-fill categories from book_categories join
    const cats = (b.book_categories ?? []).map((bc: any) => bc.categories).filter(Boolean)
    setSelectedCats(cats)
    setIsOpen(true)
  }

  async function uploadCover(file: File, bookId: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${bookId}.${ext}`
    const { error } = await supabase.storage.from('book-covers').upload(path, file, { upsert: true })
    if (error) { toast.error(`Upload failed: ${error.message}`); return null }
    const { data } = supabase.storage.from('book-covers').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const copiesNum = parseInt(totalCopies) || 1
    let finalCoverUrl = coverUrl || null

    try {
      let bookId: string

      if (isEditing && editingId) {
        bookId = editingId
        // Upload new file if pending
        if (pendingFile) {
          const uploaded = await uploadCover(pendingFile, bookId)
          if (uploaded) finalCoverUrl = uploaded
        }
        const { error } = await supabase.from('books').update({
          title, author, isbn: isbn || null, description: description || null,
          shelf_id: shelfId || null, publisher: publisher || null,
          published_year: year || null, total_copies: copiesNum,
          available: copiesNum > 0, cover_url: finalCoverUrl,
        }).eq('id', bookId)
        if (error) throw error

        // Sync categories: delete old, insert new
        await supabase.from('book_categories').delete().eq('book_id', bookId)
      } else {
        // Insert book first to get id
        const { data, error } = await supabase.from('books').insert({
          title, author, isbn: isbn || null, description: description || null,
          shelf_id: shelfId || null, publisher: publisher || null,
          published_year: year || null, total_copies: copiesNum,
          available_copies: copiesNum, available: copiesNum > 0,
          cover_url: null,
        }).select('id').single()
        if (error || !data) throw error || new Error('Failed to create book')
        bookId = data.id

        // Upload file now that we have the id
        if (pendingFile) {
          const uploaded = await uploadCover(pendingFile, bookId)
          if (uploaded) {
            finalCoverUrl = uploaded
            await supabase.from('books').update({ cover_url: finalCoverUrl }).eq('id', bookId)
          }
        } else if (finalCoverUrl) {
          await supabase.from('books').update({ cover_url: finalCoverUrl }).eq('id', bookId)
        }
      }

      // Insert category pivot rows
      if (selectedCats.length > 0) {
        const rows = selectedCats.map(c => ({ book_id: bookId, category_id: c.id }))
        const { error } = await supabase.from('book_categories').insert(rows)
        if (error) throw error
      }

      toast.success(isEditing ? 'Book updated' : 'Book added')
      setIsOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save book')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this book? Historic transactions may be affected.')) return
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Book deleted'); loadData(); setSelectedIds(new Set()) }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected books?`)) return
    const { error } = await supabase.from('books').delete().in('id', Array.from(selectedIds))
    if (error) toast.error(error.message)
    else { toast.success('Books deleted'); loadData(); setSelectedIds(new Set()) }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.isbn?.includes(q) ?? false)
    const bookCatIds = (b.book_categories ?? []).map((bc: any) => bc.categories?.id).filter(Boolean)
    const matchCat = filterCatId === 'all' || bookCatIds.includes(filterCatId)
    const matchShelf = filterShelf === 'all' || b.shelf_id === filterShelf
    return matchSearch && matchCat && matchShelf
  })

  const totalAcc = books.length
  const availAcc = books.reduce((a, b) => a + (b.available_copies || 0), 0)
  const borrowAcc = books.reduce((a, b) => a + (b.total_copies - (b.available_copies || 0)), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Books</h1>
          <p className="text-slate-500 text-sm mt-1">Add, update, and remove books from the catalog.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" className="rounded-xl" onClick={handleBulkDelete}>
              <Trash2 className="size-4 mr-2" /> Delete ({selectedIds.size})
            </Button>
          )}
          <Dialog open={isOpen} onOpenChange={open => { setIsOpen(open); if (!open) resetForm() }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-sm shadow-indigo-600/20" onClick={openCreate}>
                <Plus className="size-4" /> Add Book
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Book' : 'Add New Book'}</DialogTitle>
                <DialogDescription className="sr-only">Book details form</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                {/* Core fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title <span className="text-red-500">*</span></Label>
                    <Input required value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Author <span className="text-red-500">*</span></Label>
                    <Input required value={author} onChange={e => setAuthor(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>ISBN</Label>
                    <Input value={isbn} onChange={e => setIsbn(e.target.value)} className="rounded-xl" placeholder="978-..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Copies <span className="text-red-500">*</span></Label>
                    <Input type="number" min="1" required value={totalCopies} onChange={e => setTotalCopies(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Publisher</Label>
                    <Input value={publisher} onChange={e => setPublisher(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Published Year</Label>
                    <Input type="number" value={year} onChange={e => setYear(e.target.value)} className="rounded-xl" placeholder="2024" />
                  </div>
                </div>

                {/* Shelf */}
                <div className="space-y-2">
                  <Label>Shelf</Label>
                  <Select value={shelfId} onValueChange={setShelfId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Shelf" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No shelf —</SelectItem>
                      {shelves.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.location})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categories multi-select */}
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <CategoryPicker
                    allCategories={allCategories}
                    selected={selectedCats}
                    onChange={setSelectedCats}
                  />
                </div>

                {/* Cover image */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <CoverImageInput
                    coverUrl={coverUrl}
                    setCoverUrl={setCoverUrl}
                    onFileUpload={file => { setPendingFile(file); setCoverUrl('') }}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="rounded-xl resize-none"
                    rows={3}
                    placeholder="Brief description of the book..."
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11">
                  {saving ? 'Saving...' : isEditing ? 'Update Book' : 'Add Book'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: totalAcc, color: 'text-slate-900' },
          { label: 'Available', value: availAcc, color: 'text-emerald-600' },
          { label: 'Borrowed', value: borrowAcc, color: 'text-amber-600' },
          { label: 'Categories', value: categoriesDbCount, color: 'text-indigo-600' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="pl-9 rounded-xl bg-white border-none shadow-sm h-9" placeholder="Title, author, ISBN..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCatId} onValueChange={setFilterCatId}>
          <SelectTrigger className="w-full sm:w-[180px] rounded-xl bg-white border-none shadow-sm h-9">
            <Filter className="size-4 mr-2 text-slate-400" /><SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterShelf} onValueChange={setFilterShelf}>
          <SelectTrigger className="w-full sm:w-[180px] rounded-xl bg-white border-none shadow-sm h-9">
            <Filter className="size-4 mr-2 text-slate-400" /><SelectValue placeholder="Shelf" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shelves</SelectItem>
            {shelves.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto text-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4 w-12">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={() => {
                    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
                    else setSelectedIds(new Set(filtered.map(b => b.id)))
                  }}
                  className="rounded-md"
                />
              </th>
              <th className="p-4 font-semibold">Book Info</th>
              <th className="p-4 font-semibold">ISBN</th>
              <th className="p-4 font-semibold">Categories</th>
              <th className="p-4 font-semibold">Shelf</th>
              <th className="p-4 font-semibold">Copies</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  <BookOpen className="size-10 text-slate-300 mx-auto mb-3" />
                  No books found.
                </td>
              </tr>
            ) : filtered.map(b => {
              const cats = (b.book_categories ?? []).map((bc: any) => bc.categories).filter(Boolean)
              const firstCat = cats[0]
              const fallbackColor = firstCat?.color || '#cbd5e1'

              return (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 align-middle">
                    <Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => toggleSelect(b.id)} className="rounded-md" />
                  </td>
                  <td className="p-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-14 rounded-lg shrink-0 overflow-hidden relative border border-slate-100">
                        {b.cover_url ? (
                          <img src={b.cover_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: fallbackColor }}>
                            <span className="text-white text-lg font-black">{b.title.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight line-clamp-1">{b.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{b.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{b.isbn || '—'}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {cats.length === 0 ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : cats.map((cat: Category) => (
                        <Badge
                          key={cat.id}
                          variant="outline"
                          className="border-transparent text-[10px] font-bold py-0"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 text-xs text-nowrap">{(b.shelves as any)?.name || '—'}</td>
                  <td className="p-4 text-slate-600 text-xs">
                    <span className="font-medium text-slate-900">{b.available_copies}</span> / {b.total_copies}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant="outline"
                      className={`border-transparent ${b.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {b.available_copies > 0 ? 'Available' : 'Out'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(b)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="size-4" />
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
