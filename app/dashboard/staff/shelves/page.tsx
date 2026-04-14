'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { Library, MapPin } from 'lucide-react'
import type { Shelf } from '@/lib/supabase'

type ShelfWithCount = Shelf & { books?: { count: number }[] }

export default function StaffShelvesPage() {
  const supabase = createClient()
  const [shelves, setShelves] = React.useState<ShelfWithCount[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shelves')
        .select('*, books(count)')
        .order('name')
      setShelves((data ?? []) as ShelfWithCount[])
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Library Shelves</h1>
        <p className="text-slate-500 text-sm mt-1">Read-only overview of all shelves and their locations.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : shelves.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Library className="size-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No shelves found in the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shelves.map(s => {
            const bookCount = (s.books as any)?.[0]?.count ?? 0
            return (
              <Card key={s.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <Library className="size-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      {s.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{s.location}</span>
                  </div>
                  <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                    {bookCount} book{bookCount !== 1 ? 's' : ''} assigned
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
