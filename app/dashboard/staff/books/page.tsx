'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { BookOpen, Search } from 'lucide-react'
import type { Book } from '@/lib/supabase'

type BookWithShelf = Book & { shelves?: { name: string; location: string } | null }

export default function StaffBooksPage() {
  const supabase = createClient()
  const [books, setBooks] = React.useState<BookWithShelf[]>([])
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('books')
        .select('*, shelves(name, location)')
        .order('title')
      setBooks((data ?? []) as BookWithShelf[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    return !q || b.title.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q) || b.genre?.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Books Catalog</h1>
          <p className="text-slate-500 text-sm mt-1">Read-only view of all library books and their availability.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="pl-9 rounded-xl bg-white" placeholder="Search title, author, genre..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="size-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No books found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => (
            <Card key={b.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight">{b.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{b.author}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs border-transparent ${b.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {b.available_copies > 0 ? `${b.available_copies} avail.` : 'All Borrowed'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {b.genre && <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">{b.genre}</Badge>}
                  <Badge variant="outline" className="text-xs text-slate-400">{b.total_copies ?? 1} total copies</Badge>
                </div>
                {b.shelves && (
                  <p className="text-xs text-slate-400">📍 {b.shelves.name} — {b.shelves.location}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
