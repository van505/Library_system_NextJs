'use client'

import * as React from 'react'
import { Check, X, BookOpen, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function RequestsPage() {
  const supabase = createClient()
  const [requests, setRequests] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState('pending')

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('book_requests').select('*, profiles:user_id(full_name, grade_level)').order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function handleUpdate(id: string, newStatus: string) {
    const { error } = await supabase.from('book_requests').update({ status: newStatus }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success(`Request ${newStatus}`)
      setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r))
    }
  }

  const filtered = requests.filter(r => r.status === filter)

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Student Requests</h1>
        <p className="text-sm text-slate-600 mt-1">Manage book borrow/purchase requests</p>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {['pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {f}
          </button>
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Book Details</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? <tr><td colSpan={4} className="p-8"><Skeleton className="h-20 w-full" /></td></tr> : filtered.length===0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">No {filter} requests</td></tr> : filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-semibold text-slate-900">{r.profiles?.full_name}</p>
                    <p className="text-xs text-slate-500">{r.profiles?.grade_level || 'N/A'}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900 flex items-center gap-1.5"><BookOpen className="size-3 text-slate-400" /> {r.book_title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.author || 'Author unknown'}</p>
                    {r.reason && <p className="text-xs text-slate-600 bg-slate-100 p-1.5 rounded mt-1.5 italic">"{r.reason}"</p>}
                  </td>
                  <td className="p-4 text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock className="size-3" /> {new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    {r.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-8 border-red-200 text-red-700 hover:bg-red-50 bg-red-50/50" onClick={() => handleUpdate(r.id, 'rejected')}>
                          <X className="size-3.5 mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50" onClick={() => handleUpdate(r.id, 'approved')}>
                          <Check className="size-3.5 mr-1" /> Approve
                        </Button>
                      </div>
                    )}
                    {r.status !== 'pending' && (
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {r.status}
                      </span>
                    )}
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
