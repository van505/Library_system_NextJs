'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, AlertCircle, ArrowLeftRight, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'
import { format, isBefore } from 'date-fns'

export default function StaffDashboard() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const [data, setData] = React.useState<any>(null)

  React.useEffect(() => {
    async function load() {
      const [{ data: bData }, { data: tData }, { data: rData }] = await Promise.all([
        supabase.from('books').select('id, available_copies'),
        supabase.from('transactions').select('*, books(title), profiles(full_name)').order('borrowed_at', { ascending: false }),
        supabase.from('book_requests').select('id').eq('status', 'pending')
      ])

      const available = (bData || []).reduce((acc, b) => acc + (b.available_copies ?? 0), 0)
      const txs = tData || []
      const borrowed = txs.filter(t => t.status === 'borrowed')
      const overdue = borrowed.filter(t => t.due_date && isBefore(new Date(t.due_date), new Date()))
      const dueToday = borrowed.filter(t => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString())

      setData({
        available,
        borrowed: borrowed.length,
        dueToday: dueToday.length,
        overdue: overdue.length,
        recentTxs: txs.slice(0, 10),
        pendingRequests: rData?.length || 0
      })
    }
    load()
  }, [supabase])

  if (!data) return (
    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )

  const stats = [
    { label: 'Available Books', value: data.available, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Currently Borrowed', value: data.borrowed, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Due Today', value: data.dueToday, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Overdue Books', value: data.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  ]

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">Welcome back, {profile?.full_name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${s.bg} flex flex-col gap-2 items-start shadow-sm`}>
            <div className="flex items-center gap-2">
              <s.icon className={`size-5 ${s.color}`} />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            {s.label === 'Overdue Books' && data.pendingRequests > 0 && (
               <p className="text-xs text-slate-500 mt-2 font-medium">{data.pendingRequests} pending borrow requests</p>
            )}
          </div>
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 px-5 py-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ArrowLeftRight className="size-4" /> Recent Operational Activity
          </CardTitle>
        </CardHeader>
        <div className="p-0">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.recentTxs.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{tx.books?.title}</p>
                    <p className="text-xs text-slate-500">by {tx.profiles?.full_name}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-slate-500">{format(new Date(tx.borrowed_at), 'MMM d, h:mm a')}</p>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${
                       tx.status === 'returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                       tx.status === 'borrowed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                       'bg-red-50 text-red-700 border-red-200'
                     }`}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
