'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Tag, Plus, Edit, Trash2, BookOpen } from 'lucide-react'

type TagRow = {
  id: string
  name: string
  color: string
  created_at: string
  book_count?: number
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#84cc16', '#065f46', '#1e1b4b',
]

export default function AdminTagsPage() {
  const supabase = createClient()
  const [tags, setTags] = React.useState<TagRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingTag, setEditingTag] = React.useState<TagRow | null>(null)
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState('#6366f1')
  const [saving, setSaving] = React.useState(false)

  async function loadTags() {
    setLoading(true)
    const { data: tagData } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (!tagData) { setLoading(false); return }

    // Get book counts per tag
    const { data: bookTagData } = await supabase
      .from('book_tags')
      .select('tag_id')

    const countMap: Record<string, number> = {}
    for (const bt of bookTagData ?? []) {
      countMap[bt.tag_id] = (countMap[bt.tag_id] ?? 0) + 1
    }

    setTags(tagData.map((tag: typeof tagData[0]) => ({ ...tag, book_count: countMap[tag.id] ?? 0 })))
    setLoading(false)
  }

  React.useEffect(() => { loadTags() }, [])

  function openCreate() {
    setEditingTag(null)
    setName('')
    setColor('#6366f1')
    setDialogOpen(true)
  }

  function openEdit(tag: TagRow) {
    setEditingTag(tag)
    setName(tag.name)
    setColor(tag.color)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Tag name is required'); return }
    setSaving(true)

    if (editingTag) {
      const { error } = await supabase
        .from('tags')
        .update({ name: name.trim(), color })
        .eq('id', editingTag.id)
      if (error) toast.error(error.message)
      else { toast.success('Tag updated!'); setDialogOpen(false); loadTags() }
    } else {
      const { error } = await supabase
        .from('tags')
        .insert({ name: name.trim(), color })
      if (error) toast.error(error.message)
      else { toast.success('Tag created!'); setDialogOpen(false); loadTags() }
    }
    setSaving(false)
  }

  async function handleDelete(tag: TagRow) {
    if (tag.book_count && tag.book_count > 0) {
      toast.error(`Cannot delete "${tag.name}" — it is used by ${tag.book_count} book(s). Remove the tag from all books first.`)
      return
    }
    if (!confirm(`Delete tag "${tag.name}"?`)) return
    const { error } = await supabase.from('tags').delete().eq('id', tag.id)
    if (error) toast.error(error.message)
    else { toast.success('Tag deleted.'); loadTags() }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="size-6 text-primary" /> Manage Tags
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage tags to help students discover books.</p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 transition-transform hover:-translate-y-0.5">
          <Plus className="size-4" /> Add Tag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Tags</p>
          <p className="text-2xl font-bold mt-1 text-primary">{tags.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tagged Books</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{tags.reduce((a, t) => a + (t.book_count ?? 0), 0)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Unused Tags</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{tags.filter(t => !t.book_count).length}</p>
        </div>
      </div>

      {/* Tag Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
          <Tag className="size-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">No tags yet</h3>
          <p className="text-slate-500 mt-2">Create your first tag to help students discover books.</p>
          <Button onClick={openCreate} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2">
            <Plus className="size-4" /> Create First Tag
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tags.map(tag => (
            <Card key={tag.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <CardContent className="p-0">
                {/* Color swatch */}
                <div className="h-2 w-full" style={{ backgroundColor: tag.color }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}
                    >
                      <Tag className="size-3" />
                      {tag.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <BookOpen className="size-3" />
                    {tag.book_count ?? 0} book{tag.book_count !== 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 rounded-lg text-xs border-slate-200"
                      onClick={() => openEdit(tag)}
                    >
                      <Edit className="size-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 p-0"
                      onClick={() => handleDelete(tag)}
                      disabled={(tag.book_count ?? 0) > 0}
                      title={(tag.book_count ?? 0) > 0 ? 'Remove from all books first' : 'Delete tag'}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Tag Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5 text-primary" />
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag ? `Editing "${editingTag.name}"` : 'Add a new tag for books in the catalog.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Tag Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Staff Pick"
                className="rounded-xl"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`size-8 rounded-full transition-all border-2 ${color === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="h-9 w-16 rounded-lg border border-slate-200 cursor-pointer"
                />
                <span className="text-sm font-mono text-slate-600">{color}</span>
                <Badge
                  className="border-transparent font-bold"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {name || 'Preview'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
