'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  BookOpen,
  Layers,
  Plus,
  Trash2,
  MapPin,
  Tag,
  User,
  Hash,
  AlignLeft,
  BookMarked,
  RefreshCw,
  Search,
  Library,
  ArrowLeft,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Book, Shelf } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookWithShelf = Book & {
  shelves?: { name: string; location: string } | null
}

// ─── Form Field Component ─────────────────────────────────────────────────────

function FormField({
  id,
  label,
  icon: Icon,
  required,
  ...props
}: React.ComponentProps<'input'> & {
  id: string
  label: string
  icon?: React.ElementType
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        )}
        <Input
          id={id}
          className={Icon ? 'pl-8' : ''}
          {...props}
        />
      </div>
    </div>
  )
}

// ─── Add Shelf Dialog ─────────────────────────────────────────────────────────

function AddShelfDialog({ onCreated }: { onCreated: (shelf: Shelf) => void }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', description: '', location: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/shelves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create shelf')
      toast.success('Shelf added successfully!')
      onCreated(data)
      setForm({ name: '', description: '', location: '' })
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Add Shelf
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Shelf</DialogTitle>
            <DialogDescription>
              Create a new shelf location in the library.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <FormField
              id="shelf-name"
              label="Shelf Name"
              icon={Layers}
              required
              placeholder="e.g. Fiction Row A"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <FormField
              id="shelf-location"
              label="Location"
              icon={MapPin}
              required
              placeholder="e.g. 2nd Floor, East Wing"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shelf-desc" className="text-sm font-medium">
                Description
              </Label>
              <div className="relative">
                <AlignLeft className="absolute left-2.5 top-3 size-4 text-muted-foreground pointer-events-none" />
                <textarea
                  id="shelf-desc"
                  rows={3}
                  placeholder="Brief description of what books are on this shelf…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-transparent pl-8 pr-3 pt-2.5 pb-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {loading ? 'Creating…' : 'Create Shelf'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Book Dialog ──────────────────────────────────────────────────────────

function AddBookDialog({
  shelves,
  onCreated,
}: {
  shelves: Shelf[]
  onCreated: (book: BookWithShelf) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    shelf_id: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shelf_id: form.shelf_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add book')
      toast.success(`"${data.title}" added to the library!`)
      onCreated(data)
      setForm({ title: '', author: '', isbn: '', genre: '', shelf_id: '' })
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Book</DialogTitle>
            <DialogDescription>
              Catalog a new book into the library system.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <FormField
              id="book-title"
              label="Title"
              icon={BookMarked}
              required
              placeholder="e.g. The Great Gatsby"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <FormField
              id="book-author"
              label="Author"
              icon={User}
              required
              placeholder="e.g. F. Scott Fitzgerald"
              value={form.author}
              onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="book-isbn"
                label="ISBN"
                icon={Hash}
                placeholder="e.g. 978-3-16-148410-0"
                value={form.isbn}
                onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))}
              />
              <FormField
                id="book-genre"
                label="Genre"
                icon={Tag}
                placeholder="e.g. Fiction"
                value={form.genre}
                onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="book-shelf" className="text-sm font-medium">
                Shelf Location
              </Label>
              <Select
                value={form.shelf_id}
                onValueChange={val => setForm(f => ({ ...f, shelf_id: val === 'none' ? '' : val }))}
              >
                <SelectTrigger id="book-shelf" className="w-full">
                  <SelectValue placeholder="Assign to a shelf…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No shelf assigned —</SelectItem>
                  {shelves.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {loading ? 'Adding…' : 'Add Book'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Shelves Summary Cards ─────────────────────────────────────────────────────

function ShelfCard({ shelf, bookCount }: { shelf: Shelf; bookCount: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Layers className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{shelf.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="size-3" />
              {shelf.location}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {bookCount} {bookCount === 1 ? 'book' : 'books'}
        </Badge>
      </div>
      {shelf.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 pl-10">
          {shelf.description}
        </p>
      )}
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [books, setBooks] = React.useState<BookWithShelf[]>([])
  const [shelves, setShelves] = React.useState<Shelf[]>([])
  const [loadingBooks, setLoadingBooks] = React.useState(true)
  const [loadingShelves, setLoadingShelves] = React.useState(true)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Fetch data on mount
  React.useEffect(() => {
    fetchBooks()
    fetchShelves()
  }, [])

  async function fetchBooks() {
    setLoadingBooks(true)
    try {
      const res = await fetch('/api/books')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBooks(data)
    } catch {
      toast.error('Failed to load books')
    } finally {
      setLoadingBooks(false)
    }
  }

  async function fetchShelves() {
    setLoadingShelves(true)
    try {
      const res = await fetch('/api/shelves')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShelves(data)
    } catch {
      toast.error('Failed to load shelves')
    } finally {
      setLoadingShelves(false)
    }
  }

  async function deleteBook(id: string, title: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/books?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBooks(prev => prev.filter(b => b.id !== id))
      toast.success(`"${title}" removed from the library`)
    } catch {
      toast.error('Failed to delete book')
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered books
  const filteredBooks = React.useMemo(() => {
    if (!searchQuery.trim()) return books
    const q = searchQuery.toLowerCase()
    return books.filter(
      b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.genre ?? '').toLowerCase().includes(q) ||
        (b.shelves?.name ?? '').toLowerCase().includes(q)
    )
  }, [books, searchQuery])

  // Books per shelf
  const bookCountByShelf = React.useMemo(() => {
    const counts: Record<string, number> = {}
    books.forEach(b => {
      if (b.shelf_id) counts[b.shelf_id] = (counts[b.shelf_id] ?? 0) + 1
    })
    return counts
  }, [books])

  const stats = {
    total: books.length,
    available: books.filter(b => b.available).length,
    borrowed: books.filter(b => !b.available).length,
    shelves: shelves.length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Library className="size-4 text-primary-foreground" />
            </div>
            <div>
              <span className="text-sm font-semibold">LibraryAdmin</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                School Library Management
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="/" className="gap-1.5">
                <ArrowLeft className="size-4" />
                Home
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/chat" className="gap-1.5">
                <BookOpen className="size-4" />
                Student Chat
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your library&apos;s catalog, shelves, and inventory.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Books', value: stats.total, icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Available', value: stats.available, icon: BookMarked, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Borrowed', value: stats.borrowed, icon: RefreshCw, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
            { label: 'Shelves', value: stats.shelves, icon: Layers, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="py-4">
              <CardContent className="px-4 flex items-center gap-3">
                <div className={`size-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Shelves Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Layers className="size-4 text-muted-foreground" />
                Shelves
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loadingShelves ? 'Loading…' : `${shelves.length === 1 ? '1 shelf' : `${shelves.length} shelves`} in the library`}
              </p>
            </div>
            <AddShelfDialog
              onCreated={shelf => setShelves(prev => [shelf, ...prev])}
            />
          </div>

          {loadingShelves ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 h-20 animate-pulse" />
              ))}
            </div>
          ) : shelves.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
              <Layers className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No shelves yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first shelf to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shelves.map(shelf => (
                <ShelfCard
                  key={shelf.id}
                  shelf={shelf}
                  bookCount={bookCountByShelf[shelf.id] ?? 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* Books Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                Books Catalog
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loadingBooks ? 'Loading…' : `${books.length} book${books.length !== 1 ? 's' : ''} in the system`}
              </p>
            </div>
            <AddBookDialog
              shelves={shelves}
              onCreated={book => setBooks(prev => [book, ...prev])}
            />
          </div>

          <Card className="overflow-hidden py-0">
            {/* Search */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="books-search"
                  placeholder="Search by title, author, genre…"
                  className="pl-8"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Title / Author</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Shelf</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBooks ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {[1, 2, 3, 4, 5, 6].map(j => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {searchQuery ? (
                          <div>
                            <Search className="size-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">No books match &quot;{searchQuery}&quot;</p>
                          </div>
                        ) : (
                          <div>
                            <BookOpen className="size-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">No books yet</p>
                            <p className="text-xs mt-1">Add your first book using the button above</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBooks.map(book => (
                      <TableRow key={book.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm leading-tight">{book.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <User className="size-3" />
                              {book.author}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {book.genre ? (
                            <Badge variant="outline" className="text-xs">
                              {book.genre}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {book.shelves?.name ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {book.shelves?.location ? (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3 shrink-0" />
                              {book.shelves.location}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              book.available
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25'
                            }
                          >
                            {book.available ? 'Available' : 'Borrowed'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={deletingId === book.id}
                            onClick={() => deleteBook(book.id, book.title)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${book.title}`}
                          >
                            {deletingId === book.id ? (
                              <RefreshCw className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer count */}
            {!loadingBooks && filteredBooks.length > 0 && (
              <div className="px-4 py-2 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {filteredBooks.length} of {books.length} books
                </p>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-xs h-7"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  )
}
