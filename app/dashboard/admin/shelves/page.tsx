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
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { logActivity, ACTION_TYPES } from '@/lib/activityLog'
import { useAuthStore } from '@/lib/store'
import { Library, MapPin, Plus, Edit, Trash2, Search, BookOpen, LayoutGrid, AlertTriangle } from 'lucide-react'
import type { Shelf } from '@/lib/supabase'

type ShelfWithCount = Shelf & { book_count: number }

const MAX_CAPACITY = 50

function getBarColor(pct: number) {
  if (pct === 0) return 'bg-slate-300'
  if (pct <= 50) return 'bg-emerald-500'
  if (pct <= 80) return 'bg-amber-400'
  if (pct < 100) return 'bg-orange-500'
  return 'bg-red-500'
}

function getCapacityStatus(pct: number): 'empty' | 'partial' | 'full' {
  if (pct === 0) return 'empty'
  if (pct >= 100) return 'full'
  return 'partial'
}

export default function AdminShelvesPage() {
  const supabase = createClient()
  const [shelves, setShelves] = React.useState<ShelfWithCount[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters & Sort
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [capacityFilter, setCapacityFilter] = React.useState('all')
  const [sortBy, setSortBy] = React.useState('az')

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
      const counts = await Promise.all(
        s.map(async (shelf) => {
          const { count } = await supabase
            .from('books')
            .select('id', { count: 'exact', head: true })
            .eq('shelf_id', shelf.id)
          return { ...shelf, book_count: count ?? 0 }
        })
      )
      setShelves(counts)
    }
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [])

  // ── Derived category prefixes (e.g. "IT", "GEN-FIC", "THESIS") ──────────
  const categoryPrefixes = React.useMemo(() => {
    const prefixes = new Set<string>()
    shelves.forEach(s => {
      // Take everything before the first dash-digit or last digit sequence
      const match = s.name.match(/^([A-Za-z][A-Za-z0-9-]*?)[-\s]?\d/)
      if (match) prefixes.add(match[1].toUpperCase())
      else {
        // Fallback: take first word
        const word = s.name.split(/[\s\-_]/)[0].toUpperCase()
        if (word) prefixes.add(word)
      }
    })
    return Array.from(prefixes).sort()
  }, [shelves])

  // ── Combined filtering + sorting ─────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let result = [...shelves]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)
      )
    }

    // Category prefix filter
    if (categoryFilter !== 'all') {
      result = result.filter(s => s.name.toUpperCase().startsWith(categoryFilter))
    }

    // Capacity filter
    if (capacityFilter !== 'all') {
      result = result.filter(s => {
        const pct = Math.min(100, Math.round((s.book_count / MAX_CAPACITY) * 100))
        return getCapacityStatus(pct) === capacityFilter
      })
    }

    // Sort
    switch (sortBy) {
      case 'az':   result.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'za':   result.sort((a, b) => b.name.localeCompare(a.name)); break
      case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break
      case 'most':   result.sort((a, b) => b.book_count - a.book_count); break
      case 'least':  result.sort((a, b) => a.book_count - b.book_count); break
    }

    return result
  }, [shelves, search, categoryFilter, capacityFilter, sortBy])

  // ── Summary stats ────────────────────────────────────────────────────────
  const summary = React.useMemo(() => ({
    total: shelves.length,
    totalBooks: shelves.reduce((acc, s) => acc + s.book_count, 0),
    full: shelves.filter(s => Math.round((s.book_count / MAX_CAPACITY) * 100) >= 100).length,
    empty: shelves.filter(s => s.book_count === 0).length,
  }), [shelves])

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    setIsEditing(false); setEditingId(null); setName(''); setLocation(''); setDescription(''); setIsOpen(true)
  }

  function openEdit(s: ShelfWithCount) {
    setIsEditing(true); setEditingId(s.id); setName(s.name); setLocation(s.location); setDescription(s.description || ''); setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { name, location, description: description || null }
    let error

    if (isEditing && editingId) {
      error = (await supabase.from('shelves').update(payload).eq('id', editingId)).error
    } else {
      error = (await supabase.from('shelves').insert(payload)).error
    }

    setSaving(false)
    if (error) toast.error(error.message)
    else {
      await logActivity(supabase, {
        performed_by: useAuthStore.getState().profile?.id,
        role: 'admin',
        action_type: isEditing ? ACTION_TYPES.SHELF_EDITED : ACTION_TYPES.SHELF_ADDED,
        entity_type: 'shelf',
        entity_id: editingId || undefined,
        entity_name: name,
        description: `Admin ${isEditing ? 'edited' : 'added'} shelf '${name}'`,
      })
      toast.success(isEditing ? 'Shelf updated' : 'Shelf created')
      setIsOpen(false)
      loadData()
    }
  }

  async function handleDelete(id: string, count: number) {
    if (count > 0) {
      toast.error('Cannot delete a shelf with books assigned. Reassign or delete the books first.')
      return
    }
    if (!confirm('Delete this shelf? This cannot be undone.')) return
    const { error } = await supabase.from('shelves').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { 
      await logActivity(supabase, {
        performed_by: useAuthStore.getState().profile?.id,
        role: 'admin',
        action_type: ACTION_TYPES.SHELF_DELETED,
        entity_type: 'shelf',
        entity_id: id,
        description: `Admin deleted shelf ID ${id}`,
      })
      toast.success('Shelf deleted'); loadData() 
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Shelves</h1>
          <p className="text-slate-500 text-sm mt-1">Organize physical locations and track library capacity.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 shadow-sm shadow-primary/20 transition-transform hover:-translate-y-0.5" onClick={openCreate}>
              <Plus className="size-4" /> Add Shelf
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Shelf' : 'Add New Shelf'}</DialogTitle>
              <DialogDescription className="sr-only">Shelf details form</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Shelf Name <span className="text-red-500">*</span></Label>
                <Input required value={name} onChange={e => setName(e.target.value)} className="rounded-xl" placeholder="e.g. IT-SECTION-01" />
              </div>
              <div className="space-y-2">
                <Label>Location / Room <span className="text-red-500">*</span></Label>
                <Input required value={location} onChange={e => setLocation(e.target.value)} className="rounded-xl" placeholder="e.g. Main Hall, Room 2B" />
              </div>
              <div className="space-y-2">
                <Label>Notes / Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl resize-none" rows={3} placeholder="Additional info about this shelf..." />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-transform hover:-translate-y-0.5">
                {saving ? 'Saving...' : isEditing ? 'Update Shelf' : 'Create Shelf'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Strip ────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Shelves', value: summary.total, icon: Library, color: 'text-primary bg-primary/10' },
            { label: 'Books Stored', value: summary.totalBooks, icon: BookOpen, color: 'text-violet-600 bg-violet-50' },
            { label: 'Full Shelves', value: summary.full, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
            { label: 'Empty Shelves', value: summary.empty, icon: LayoutGrid, color: 'text-slate-500 bg-slate-100' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <stat.icon className="size-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 leading-none">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search & Filter Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search by name or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-slate-50 border-slate-200 h-9"
          />
        </div>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40 rounded-xl bg-slate-50 border-slate-200 h-9 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryPrefixes.map(prefix => (
              <SelectItem key={prefix} value={prefix}>{prefix}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Capacity filter */}
        <Select value={capacityFilter} onValueChange={setCapacityFilter}>
          <SelectTrigger className="w-full sm:w-40 rounded-xl bg-slate-50 border-slate-200 h-9 text-sm">
            <SelectValue placeholder="Capacity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Capacities</SelectItem>
            <SelectItem value="empty">Empty (0%)</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="full">Full (100%)</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40 rounded-xl bg-slate-50 border-slate-200 h-9 text-sm">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">A → Z</SelectItem>
            <SelectItem value="za">Z → A</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="most">Most Full</SelectItem>
            <SelectItem value="least">Least Full</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
          <Library className="size-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No shelves match your filters</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filter criteria.</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearch(''); setCategoryFilter('all'); setCapacityFilter('all') }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 -mt-2">
            Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of {shelves.length} shelves
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(s => {
              const count = s.book_count
              const percentage = Math.min(100, Math.round((count / MAX_CAPACITY) * 100))
              const barColor = getBarColor(percentage)

              return (
                <Card key={s.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Library className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 leading-tight truncate">{s.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{s.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons — always visible */}
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                          onClick={() => openEdit(s)}
                          title="Edit shelf"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(s.id, count)}
                          title="Delete shelf"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    {s.description ? (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[2.5rem]">{s.description}</p>
                    ) : (
                      <div className="min-h-[2.5rem] mb-4" />
                    )}

                    {/* Capacity bar */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-900">{count} / {MAX_CAPACITY} Books</span>
                        <span className={`font-bold ${
                          percentage === 0 ? 'text-slate-400' :
                          percentage <= 50 ? 'text-emerald-600' :
                          percentage <= 80 ? 'text-amber-600' :
                          percentage < 100 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {percentage === 0 ? 'Empty' : percentage >= 100 ? '⚠ Full' : `${MAX_CAPACITY - count} slots remaining`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
