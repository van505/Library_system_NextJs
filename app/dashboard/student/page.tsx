'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BookOpen, BookMarked, History, AlertCircle, ChevronRight, Send, CheckCircle, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'
import { format, differenceInDays, isBefore } from 'date-fns'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const [data, setData] = React.useState<any>(null)
  const [reqForm, setReqForm] = React.useState({ title: '', author: '', reason: '' })
  const [savingReq, setSavingReq] = React.useState(false)

  React.useEffect(() => {
    if (!profile) return
    async function load() {
      const [{ data: tData }, { data: bData }] = await Promise.all([
        supabase.from('transactions').select('*, books(title, cover_url, author)').eq('borrower_id', profile!.id).order('borrowed_at', { ascending: false }),
        supabase.from('books').select('id, title, author, cover_url, genre').order('created_at', { ascending: false }).limit(6)
      ])

      const txs = tData || []
      const active = txs.filter(t => t.status === 'borrowed' || t.status === 'pending')
      const returned = txs.filter(t => t.status === 'returned')
      const overdue = active.filter(t => t.due_date && isBefore(new Date(t.due_date), new Date()) && t.status === 'borrowed')

      setData({
        total: txs.length,
        active,
        returned: returned.length,
        overdue: overdue.length,
        newBooks: bData || []
      })
    }
    load()
  }, [profile, supabase])

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setSavingReq(true)
    const { error } = await supabase.from('book_requests').insert([{
      user_id: profile!.id,
      book_title: reqForm.title,
      author: reqForm.author,
      reason: reqForm.reason
    }])
    if (error) toast.error(error.message)
    else {
      toast.success('Book request submitted!')
      setReqForm({ title: '', author: '', reason: '' })
    }
    setSavingReq(false)
  }

  if (!data) return (
    <div className="p-6">
      <Skeleton className="h-24 rounded-2xl mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-flow-col gap-6">
        <Skeleton className="h-64 col-span-2 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )

  const stats = [
    { label: 'Books Borrowed', value: data.total, icon: History, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    { label: 'Currently Active', value: data.active.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Books Returned', value: data.returned, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Overdue', value: data.overdue, icon: AlertCircle, color: data.overdue > 0 ? 'text-red-600' : 'text-slate-400', bg: data.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200' },
  ]

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="bg-indigo-600 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-xl shadow-indigo-600/10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 bg-violet-500 blur-[80px] rounded-full opacity-50 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-white/20 text-indigo-100 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm">Student</span>
            {profile?.student_id && <span className="text-indigo-200 text-xs font-mono">{profile.student_id}</span>}
          </div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-indigo-200 mt-2 max-w-md line-clamp-2">Check your active books or browse the catalog to find your next great read.</p>
        </div>
        <div className="relative z-10 mt-6 md:mt-0 flex gap-4">
          <Button className="bg-white text-indigo-700 hover:bg-slate-50 rounded-xl" asChild>
            <Link href="/dashboard/student/browse">Browse Collection</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${s.bg} flex flex-col gap-2 items-start shadow-sm`}>
            <div className="flex items-center gap-2">
              <s.icon className={`size-5 ${s.color}`} />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Active Books */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-slate-900">Active Borrowing</h2>
              <Link href="/dashboard/student/borrowed" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.active.length === 0 ? (
                <div className="col-span-2 p-8 border border-dashed border-slate-300 rounded-2xl text-center flex flex-col items-center">
                  <BookMarked className="size-8 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No active books</p>
                  <Button variant="link" className="text-indigo-600 h-auto p-0 mt-1" asChild><Link href="/dashboard/student/browse">Find a book</Link></Button>
                </div>
              ) : data.active.slice(0, 4).map((tx: any) => {
                const diff = tx.due_date ? differenceInDays(new Date(tx.due_date), new Date()) : 999
                const overdue = diff < 0
                const isPending = tx.status === 'pending'
                return (
                  <Card key={tx.id} className="rounded-2xl border-slate-200 overflow-hidden shadow-sm flex group">
                    <div className="w-20 bg-slate-100 shrink-0 border-r border-slate-100 flex items-center justify-center">
                       {tx.books?.cover_url ? <img src={tx.books.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="size-6 text-slate-300" />}
                    </div>
                    <CardContent className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-slate-900 line-clamp-1 text-sm">{tx.books?.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{tx.books?.author}</p>
                      
                      <div className="mt-auto pt-3">
                        {isPending ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">Pending Request</span>
                        ) : (
                          <div className={`text-xs font-semibold ${overdue ? 'text-red-600' : diff <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {overdue ? 'Overdue!' : `${diff} days left`}
                            <span className="block text-[10px] font-normal text-slate-400">Due {format(new Date(tx.due_date), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Newest Additions */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Newest Additions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.newBooks.map((b: any) => (
                <Link key={b.id} href={`/dashboard/student/browse?search=${encodeURIComponent(b.title)}`} className="group">
                  <div className="aspect-[3/4] bg-slate-100 rounded-xl mb-2 overflow-hidden border border-slate-200 relative">
                     {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : 
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-4xl font-black text-indigo-900/10 uppercase">{b.title[0]}</div>}
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600">{b.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{b.author}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-gradient-to-b from-indigo-50 to-white">
            <div className="p-6">
              <div className="size-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-indigo-100">
                <Search className="size-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Can't find a book?</h3>
              <p className="text-sm text-slate-600 mt-2 mb-6">Send a request to the library staff to purchase or locate a book for you.</p>
              
              <form onSubmit={submitRequest} className="flex flex-col gap-3">
                <Input placeholder="Book Title" required value={reqForm.title} onChange={e=>setReqForm({...reqForm, title: e.target.value})} className="bg-white border-slate-200 text-sm h-10 rounded-xl" />
                <Input placeholder="Author (optional)" value={reqForm.author} onChange={e=>setReqForm({...reqForm, author: e.target.value})} className="bg-white border-slate-200 text-sm h-10 rounded-xl" />
                <Textarea placeholder="Why do you need it?" value={reqForm.reason} onChange={e=>setReqForm({...reqForm, reason: e.target.value})} className="bg-white border-slate-200 text-sm rounded-xl resize-none h-20" />
                <Button type="submit" disabled={savingReq || !reqForm.title.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-1">
                  <Send className="size-4 mr-2" /> Submit Request
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
