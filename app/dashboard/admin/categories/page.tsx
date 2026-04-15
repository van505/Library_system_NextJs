'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'
import { Trash2, Edit, Plus } from 'lucide-react'
import type { Category } from '@/lib/supabase'

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = React.useState<(Category & { book_count?: number })[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isOpen, setIsOpen] = React.useState(false)

  // Form
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [color, setColor] = React.useState('#6366f1')
  const [icon, setIcon] = React.useState('BookOpen')
  const [saving, setSaving] = React.useState(false)

  async function loadData() {
    setLoading(true)
    const { data: cats } = await supabase.from('categories').select('*').order('name')
    if (cats) {
      // Get book counts
      const counts = await Promise.all(cats.map(async (c) => {
        const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).eq('category_id', c.id)
        return { ...c, book_count: count ?? 0 }
      }))
      setCategories(counts)
    }
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  function openCreate() {
    setIsEditing(false)
    setEditingId(null)
    setName('')
    setDescription('')
    setColor('#6366f1')
    setIcon('BookOpen')
    setIsOpen(true)
  }

  function openEdit(c: Category) {
    setIsEditing(true)
    setEditingId(c.id)
    setName(c.name)
    setDescription(c.description || '')
    setColor(c.color || '#6366f1')
    setIcon(c.icon || 'BookOpen')
    setIsOpen(true)
  }

  async function handleDelete(id: string, count: number) {
    if (count > 0) {
      toast.error('Cannot delete category with assigned books.')
      return
    }
    if (confirm('Are you sure you want to delete this category?')) {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) toast.error(error.message)
      else {
        toast.success('Category deleted')
        loadData()
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { name, description, color, icon }
    
    let error;
    if (isEditing && editingId) {
      const res = await supabase.from('categories').update(payload).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('categories').insert(payload)
      error = res.error
    }

    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(isEditing ? 'Category updated' : 'Category created')
      setIsOpen(false)
      loadData()
    }
  }

  const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (LucideIcons as any)[name] || LucideIcons.BookOpen
    return <IconComponent className={className} />
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Categories</h1>
          <p className="text-slate-500 text-sm mt-1">Create and organize book genres and shelves categories.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" onClick={openCreate}>
              <Plus className="size-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Category' : 'Create Category'}</DialogTitle>
              <DialogDescription className="sr-only">Dialog</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input required value={name} onChange={e=>setName(e.target.value)} className="rounded-xl" placeholder="e.g. Science Fiction" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl resize-none" rows={3} placeholder="Brief description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color (Hex)</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="size-10 rounded cursor-pointer" />
                    <Input required value={color} onChange={e=>setColor(e.target.value)} className="rounded-xl flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Lucide Icon Name</Label>
                  <Input required value={icon} onChange={e=>setIcon(e.target.value)} className="rounded-xl" placeholder="e.g. Rocket" />
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white rounded-xl mt-2">
                {saving ? 'Saving...' : 'Save Category'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <LucideIcons.Tags className="size-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No categories found. Create one to organize books!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Card key={c.id} className="rounded-2xl border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: c.color }} />
              <CardContent className="p-5 pl-7 flex flex-col h-full">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                      <DynamicIcon name={c.icon} className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{c.name}</h3>
                      <Badge variant="secondary" className="mt-1 font-medium bg-slate-100 text-slate-600 rounded-md py-0 text-[10px]">
                        {c.book_count} Books
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(c)}><Edit className="size-4"/></Button>
                    <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(c.id, c.book_count ?? 0)} disabled={c.book_count! > 0}><Trash2 className="size-4"/></Button>
                  </div>
                </div>
                {c.description && <p className="text-sm text-slate-500 mt-4 line-clamp-2">{c.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
