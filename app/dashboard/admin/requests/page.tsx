'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { BookOpen, CheckCircle, XCircle, Search, HelpCircle, LayoutList } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminRequestsPage() {
  const supabase = createClient()
  const [requests, setRequests] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState('all') // all, pending, approved, rejected

  async function loadRequests() {
    setLoading(true)
    const { data } = await supabase.from('book_requests')
      .select('*, profiles(full_name, student_id, email)')
      .order('created_at', { ascending: false })
    
    setRequests(data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadRequests() }, [supabase])

  async function handleRequest(reqId: string, status: 'approved' | 'rejected', userId: string, title: string) {
    const { error } = await supabase.from('book_requests').update({ status }).eq('id', reqId)
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: `Book Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your request for "${title}" has been ${status}.`,
        type: status === 'approved' ? 'success' : 'warning',
        link: '/dashboard/student/requests'
      })
      toast.success(`Request ${status}.`)
      loadRequests()
    } else toast.error(error.message)
  }

  const filtered = requests.filter(r => {
    if (tab === 'all') return true
    return r.status === tab
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Book Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Review student requests for books not currently in the catalog.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-slate-100 rounded-xl p-1 mb-4 border border-slate-200">
          <TabsTrigger value="all" className="rounded-lg tabular-nums">All Requests</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg tabular-nums bg-amber-50/50 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">Pending</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg tabular-nums">Approved</TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg tabular-nums">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white border text-sm border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold">Student</th>
              <th className="p-4 font-semibold">Book Details</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Status / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto"/></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-500"><LayoutList className="size-10 text-slate-300 mx-auto mb-3" /> No requests found for this filter.</td></tr>
            ) : filtered.map(r => {
              const p = r.profiles as any
              return (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 align-top">
                    <p className="font-bold text-slate-900">{p?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{p?.student_id || p?.email}</p>
                  </td>
                  <td className="p-4 align-top">
                    <p className="font-semibold text-slate-900">{r.book_title}</p>
                    <p className="text-xs text-slate-500">by {r.author || 'Unknown'}</p>
                  </td>
                  <td className="p-4 align-top max-w-xs">
                    {r.reason ? <p className="text-sm text-slate-600 line-clamp-2 italic">"{r.reason}"</p> : <span className="text-xs text-slate-400">-</span>}
                  </td>
                  <td className="p-4 align-top text-xs text-slate-500">
                    {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 align-top">
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-white" onClick={() => handleRequest(r.id, 'approved', r.user_id, r.book_title)}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white" onClick={() => handleRequest(r.id, 'rejected', r.user_id, r.book_title)}>Reject</Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className={`border-transparent ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {r.status === 'approved' ? <CheckCircle className="size-3 mr-1"/> : <XCircle className="size-3 mr-1"/>}
                        <span className="capitalize">{r.status}</span>
                      </Badge>
                    )}
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
