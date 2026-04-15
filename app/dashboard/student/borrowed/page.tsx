'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { format, isPast, differenceInDays } from 'date-fns'
import { History, BookOpen, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

export default function StudentBorrowedPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [tab, setTab] = React.useState('active') // active, returned, overdue

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('transactions')
        .select('*, books(title, author, cover_url, categories(name, color), shelves(name, location))')
        .eq('borrower_id', user.id)
        .order('borrowed_at', { ascending: false })
      setTransactions(data ?? [])
    }
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  const filtered = transactions.filter(t => {
    if (tab === 'active') return t.status === 'borrowed' && (!t.due_date || !isPast(new Date(t.due_date)))
    if (tab === 'returned') return t.status === 'returned'
    if (tab === 'overdue') return t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
    return true
  })

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Borrowed Books</h1>
          <p className="text-slate-500 text-sm mt-1">Track your active reading and borrowing history.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-slate-100 rounded-xl p-1 mb-6 border border-slate-200">
          <TabsTrigger value="active" className="rounded-lg tabular-nums">Active Borrowed</TabsTrigger>
          <TabsTrigger value="returned" className="rounded-lg tabular-nums">Returned</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-lg tabular-nums text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">Overdue</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />)}
             </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
               {tab === 'active' ? <BookOpen className="size-16 text-slate-200 mx-auto mb-4" /> :
                tab === 'returned' ? <History className="size-16 text-slate-200 mx-auto mb-4" /> :
                <AlertTriangle className="size-16 text-emerald-200 mx-auto mb-4" />}
               <h3 className="text-xl font-bold text-slate-700">No {tab} books found</h3>
               <p className="text-slate-500 mt-2">
                 {tab === 'overdue' ? 'Great job! You have no overdue books.' : 'Browse the catalog to find your next great read.'}
               </p>
            </div>
          ) : tab === 'returned' ? (
            <div className="bg-white border text-sm border-slate-200 rounded-3xl shadow-sm overflow-hidden overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                     <tr>
                        <th className="p-5 font-semibold">Book Info</th>
                        <th className="p-5 font-semibold">Borrowed Date</th>
                        <th className="p-5 font-semibold">Returned Date</th>
                        <th className="p-5 font-semibold">Duration</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filtered.map(t => {
                       const b = t.books
                       const color = b.categories?.color || '#cbd5e1'
                       const days = (t.borrowed_at && t.returned_at) ? Math.max(1, differenceInDays(new Date(t.returned_at), new Date(t.borrowed_at))) : 1
                       return (
                         <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5">
                               <div className="flex gap-4 items-center">
                                 <div className="w-12 h-16 rounded-lg bg-slate-200 overflow-hidden shrink-0 shadow-sm relative">
                                    {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-white" style={{backgroundColor: color}}><BookOpen className="size-4 opacity-50"/></div>}
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-900 leading-tight block mb-0.5">{b.title}</p>
                                    <p className="text-slate-500 text-xs">{b.author}</p>
                                 </div>
                               </div>
                            </td>
                            <td className="p-5 text-slate-600">{t.borrowed_at ? format(new Date(t.borrowed_at), 'MMM d, yyyy') : '-'}</td>
                            <td className="p-5 text-emerald-600 font-medium flex items-center gap-2 mt-5">
                              <CheckCircle className="size-4" /> {t.returned_at ? format(new Date(t.returned_at), 'MMM d, yyyy') : '-'}
                            </td>
                            <td className="p-5 text-slate-500 font-medium">{days} {days === 1 ? 'day' : 'days'}</td>
                         </tr>
                       )
                     })}
                  </tbody>
               </table>
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(t => {
                   const b = t.books
                   const daysLeft = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : 0
                   const overdue = isPast(new Date(t.due_date))
                   const ring = overdue ? 'ring-4 ring-red-100 border-red-50 shadow-md shadow-red-100' : 
                               daysLeft <= 3 ? 'ring-4 ring-amber-50 border-amber-50' : 'border-slate-200 shadow-sm hover:shadow-lg'

                   return (
                     <Card key={t.id} className={`rounded-3xl transition-all h-full flex flex-col ${ring}`}>
                        <CardContent className="p-5 flex flex-col flex-1">
                           <div className="flex gap-4">
                             <div className="w-20 h-28 rounded-xl bg-slate-200 overflow-hidden shrink-0 shadow-sm relative">
                                {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-white" style={{backgroundColor: b.categories?.color || '#cbd5e1'}}><BookOpen className="size-8 opacity-20"/></div>}
                             </div>
                             <div className="min-w-0">
                               <h3 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{b.title}</h3>
                               <p className="text-slate-500 text-xs truncate mb-2">{b.author}</p>
                               {b.categories && <Badge variant="outline" className="text-[10px] font-bold py-0 rounded-md border-transparent" style={{backgroundColor: `${b.categories.color}20`, color: b.categories.color}}>{b.categories.name}</Badge>}
                             </div>
                           </div>
                           
                           <div className="mt-auto pt-5">
                             <div className={`p-3.5 rounded-2xl flex items-center justify-between ${overdue ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'}`}>
                               <div className="flex items-center gap-2">
                                 {overdue ? <AlertTriangle className="size-4 text-red-600" /> : <Clock className="size-4 text-emerald-600" />}
                                 <span className={`text-sm font-bold ${overdue ? 'text-red-700' : 'text-slate-700'}`}>
                                   {overdue ? `${Math.abs(daysLeft)} Days Overdue` : `Due in ${daysLeft} Days`}
                                 </span>
                               </div>
                               <span className="text-xs text-slate-500 font-medium">
                                 {t.due_date ? format(new Date(t.due_date), 'MMM d') : '-'}
                               </span>
                             </div>
                           </div>
                        </CardContent>
                     </Card>
                   )
                })}
             </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}
