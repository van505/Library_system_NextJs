'use client'

import * as React from 'react'
import { BookOpen, MapPin, Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'
import { format, differenceInDays, isBefore } from 'date-fns'

export default function BorrowedPage() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const [txs, setTxs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState('Active')

  React.useEffect(() => {
    if (!profile) return
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('transactions').select('*, books(title, cover_url, author, shelves(name))').eq('borrower_id', profile!.id).order('borrowed_at', { ascending: false })
      setTxs(data || [])
      setLoading(false)
    }
    load()
  }, [profile, supabase])

  const filtered = txs.filter(t => {
    if (filter === 'Active') return t.status === 'borrowed' || t.status === 'pending'
    if (filter === 'Returned') return t.status === 'returned'
    if (filter === 'Overdue') return t.status === 'borrowed' && t.due_date && isBefore(new Date(t.due_date), new Date())
    return true
  })

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Borrowed Books</h1>
        <p className="text-sm text-slate-600 mt-1">Track your active reading and borrowing history</p>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {['Active', 'Returned', 'Overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {f}
          </button>
        ))}
      </div>

      {filter === 'Active' || filter === 'Overdue' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />) : filtered.length === 0 ? <p className="col-span-full py-12 text-center text-slate-500">No {filter.toLowerCase()} books.</p> : filtered.map(t => {
            const isPending = t.status === 'pending'
            const diff = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : 999
            const overdue = diff < 0
            
            return (
              <Card key={t.id} className="rounded-2xl border-slate-200 overflow-hidden shadow-sm flex flex-col group bg-white">
                <div className="flex bg-slate-50 border-b border-slate-100 p-4 gap-4 relative">
                  <div className="w-16 h-20 bg-white border border-slate-200 shadow-sm rounded-md overflow-hidden shrink-0">
                    {t.books?.cover_url ? <img src={t.books.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-4 text-slate-300" />}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 text-sm leading-tight">{t.books?.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.books?.author}</p>
                  </div>
                </div>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center text-xs text-slate-600 gap-2 font-medium">
                    <Calendar className="size-3.5 text-slate-400" /> Borrowed on {format(new Date(t.borrowed_at), 'MMM d, yyyy')}
                  </div>
                  {!isPending && t.due_date && (
                    <div className="flex items-center text-xs text-slate-600 gap-2 font-medium">
                      <Clock className={`size-3.5 ${overdue ? 'text-red-500' : 'text-amber-500'}`} /> Due on {format(new Date(t.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  {t.books?.shelves && (
                    <div className="flex items-center text-xs text-slate-600 gap-2 font-medium">
                      <MapPin className="size-3.5 text-indigo-400" /> Pick up from {t.books.shelves.name}
                    </div>
                  )}

                  <div className="mt-2 pt-4 border-t border-slate-100 flex justify-between items-center">
                    {isPending ? (
                      <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">Pending Approval</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${overdue ? 'bg-red-50 text-red-700 border border-red-200' : diff <= 3 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {overdue ? <AlertCircle className="size-3.5" /> : <Clock className="size-3.5" />}
                        {overdue ? `OVERDUE BY ${Math.abs(diff)} DAYS` : `${diff} DAYS REMAINING`}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Book Details</th>
                  <th className="p-4">Borrowed Date</th>
                  <th className="p-4">Returned Date</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td></tr> : filtered.length===0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">No returned books yet.</td></tr> : filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                     <td className="p-4 flex items-center gap-3">
                      <div className="h-10 w-8 bg-white border border-slate-200 rounded overflow-hidden shrink-0">
                        {t.books?.cover_url ? <img src={t.books.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-2 text-slate-300" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{t.books?.title}</p>
                        <p className="text-xs text-slate-500">{t.books?.author}</p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{format(new Date(t.borrowed_at), 'MMM d, yyyy')}</td>
                    <td className="p-4 text-slate-600">{t.returned_at ? format(new Date(t.returned_at), 'MMM d, yyyy') : 'N/A'}</td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="size-3" /> Returned
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
