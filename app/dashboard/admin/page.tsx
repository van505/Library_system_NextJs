'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Library, Users, Clock, AlertTriangle, Send, CheckCircle, XCircle, Trash2, Edit } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import type { Book, Shelf, Profile, Transaction, Category } from '@/lib/supabase'

const CHART_COLORS = ['#4f46e5', '#7c3aed', '#059669', '#d97706']

export default function AdminDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  
  // Stats
  const [stats, setStats] = React.useState({
    totalBooks: 0,
    availableBooks: 0,
    borrowedCount: 0,
    totalShelves: 0,
    totalStudents: 0,
    overdueCount: 0
  })

  // Chart data
  const [genreData, setGenreData] = React.useState<{ name: string, count: number }[]>([])
  const [availData, setAvailData] = React.useState<{ name: string, value: number }[]>([])

  // Lists
  const [recentTx, setRecentTx] = React.useState<any[]>([])
  const [pendingReqs, setPendingReqs] = React.useState<any[]>([])
  const [announcements, setAnnouncements] = React.useState<any[]>([])

  // New Announcement
  const [newAnnTitle, setNewAnnTitle] = React.useState('')
  const [newAnnContent, setNewAnnContent] = React.useState('')
  const [newAnnType, setNewAnnType] = React.useState('info')
  const [submittingAnn, setSubmittingAnn] = React.useState(false)

  async function loadData() {
    setLoading(true)
    
    // Stats
    const [{ count: booksCount }, { data: books }, { count: shelvesCount }, { count: studentsCount }, { data: allTx }] = await Promise.all([
      supabase.from('books').select('*', { count: 'exact', head: true }),
      supabase.from('books').select('available_copies'),
      supabase.from('shelves').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('transactions').select('*')
    ])

    const availableBooks = books?.reduce((acc, b) => acc + (b.available_copies || 0), 0) ?? 0
    const activeTx = allTx?.filter(t => t.status === 'borrowed') ?? []
    const borrowedCount = activeTx.length
    const overdueCount = activeTx.filter(t => t.due_date && isPast(new Date(t.due_date))).length

    setStats({
      totalBooks: booksCount ?? 0,
      availableBooks,
      borrowedCount,
      totalShelves: shelvesCount ?? 0,
      totalStudents: studentsCount ?? 0,
      overdueCount
    })

    setAvailData([
      { name: 'Available', value: availableBooks },
      { name: 'Borrowed', value: borrowedCount }
    ])

    // Books by Genre (using categories table)
    const { data: booksWithCats } = await supabase.from('books').select('category_id, categories(name)')
    const genreCounts: Record<string, number> = {}
    booksWithCats?.forEach(b => {
      const g = (b.categories as any)?.name || 'Uncategorized'
      genreCounts[g] = (genreCounts[g] || 0) + 1
    })
    setGenreData(Object.entries(genreCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count))

    // Recent Transactions
    const { data: txData } = await supabase.from('transactions')
      .select('id, borrowed_at, due_date, status, books(title), profiles(full_name)')
      .order('borrowed_at', { ascending: false }).limit(5)
    setRecentTx(txData ?? [])

    // Pending Requests
    const { data: reqData } = await supabase.from('book_requests')
      .select('id, book_title, created_at, user_id, profiles!inner(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(5)
    setPendingReqs(reqData ?? [])

    // Active Announcements
    loadAnnouncements()
    setLoading(false)
  }

  async function loadAnnouncements() {
    const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
    setAnnouncements(annData ?? [])
  }

  React.useEffect(() => { loadData() }, [supabase])

  // Actions
  async function handleReturn(txId: string, bookId: string) {
    const { error } = await supabase.from('transactions').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', txId)
    if (!error) {
      // Get current copies, then increment
      const { data: b } = await supabase.from('books').select('available_copies').eq('id', bookId).single()
      if (b) {
        await supabase.from('books').update({ available_copies: b.available_copies + 1 }).eq('id', bookId)
      }
      toast.success('Book marked as returned.')
      loadData()
    } else toast.error('Failed to return book.')
  }

  async function handleRequest(reqId: string, status: 'approved' | 'rejected', userId: string, title: string) {
    const { error } = await supabase.from('book_requests').update({ status }).eq('id', reqId)
    if (!error) {
      // Notify student
      await supabase.from('notifications').insert({
        user_id: userId,
        title: `Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your request for "${title}" has been ${status}.`,
        type: status === 'approved' ? 'success' : 'warning'
      })
      toast.success(`Request ${status}.`)
      loadData()
    } else toast.error('Failed to update request.')
  }

  async function handleAddAnnouncment(e: React.FormEvent) {
    e.preventDefault()
    if (!newAnnTitle || !newAnnContent) return
    setSubmittingAnn(true)
    const { error } = await supabase.from('announcements').insert({
      title: newAnnTitle,
      content: newAnnContent,
      type: newAnnType,
      is_active: true
    })
    if (!error) {
      toast.success('Announcement added.')
      setNewAnnTitle('')
      setNewAnnContent('')
      loadAnnouncements()
    } else toast.error(error.message)
    setSubmittingAnn(false)
  }

  async function toggleAnnouncement(id: string, current: boolean) {
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id)
    loadAnnouncements()
  }

  async function deleteAnnouncement(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    toast.success('Announcement deleted.')
    loadAnnouncements()
  }

  if (loading) {
    return <div className="p-6 space-y-6"><Skeleton className="h-[200px] w-full rounded-2xl" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Books', val: stats.totalBooks, icon: BookOpen, c: 'text-blue-600 bg-blue-50' },
          { label: 'Available', val: stats.availableBooks, icon: CheckCircle, c: 'text-emerald-600 bg-emerald-50' },
          { label: 'Borrowed', val: stats.borrowedCount, icon: Clock, c: 'text-amber-600 bg-amber-50' },
          { label: 'Overdue', val: stats.overdueCount, icon: AlertTriangle, c: 'text-red-600 bg-red-50' },
          { label: 'Total Shelves', val: stats.totalShelves, icon: Library, c: 'text-indigo-600 bg-indigo-50' },
          { label: 'Students', val: stats.totalStudents, icon: Users, c: 'text-violet-600 bg-violet-50' },
        ].map((s, i) => (
          <Card key={i} className="border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-2">
              <div className={`size-10 rounded-full flex items-center justify-center ${s.c}`}>
                <s.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.val}</p>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Books by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Availability Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={availData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value">
                  {availData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? CHART_COLORS[2] : CHART_COLORS[3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transactions & Requests */}
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTx.length === 0 ? <p className="text-sm text-slate-500">No recent transactions.</p> : recentTx.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-semibold text-slate-900 truncate">{(t.books as any)?.title}</p>
                  <p className="text-xs text-slate-500">{(t.profiles as any)?.full_name} • {format(new Date(t.borrowed_at), 'MMM d')}</p>
                </div>
                {t.status === 'borrowed' ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Borrowed</Badge>
                ) : t.status === 'returned' ? (
                   <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Returned</Badge>
                ) : (
                   <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100/50">
            <CardTitle className="text-lg text-indigo-900">Pending Book Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingReqs.length === 0 ? <div className="p-6 text-sm text-slate-500 text-center">No pending requests.</div> : pendingReqs.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-semibold text-slate-900 truncate">{r.book_title}</p>
                  <p className="text-xs text-slate-500">by {(r.profiles as any)?.full_name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-white" onClick={() => handleRequest(r.id, 'approved', r.user_id, r.book_title)}>Approve</Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white" onClick={() => handleRequest(r.id, 'rejected', r.user_id, r.book_title)}>Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Announcements Panel */}
      <Card className="border-slate-200 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Announcements</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Active & Recent</h3>
            <div className="space-y-3">
              {announcements.length === 0 ? <p className="text-sm text-slate-500">No announcements yet.</p> : announcements.map(a => (
                <div key={a.id} className={`p-4 rounded-xl border ${a.is_active ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-slate-900">{a.title}</h4>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="size-6 text-slate-400" onClick={() => toggleAnnouncement(a.id, a.is_active)}>
                        {a.is_active ? <CheckCircle className="size-4 text-emerald-500"/> : <XCircle className="size-4"/>}
                      </Button>
                      <Button size="icon" variant="ghost" className="size-6 text-red-400 hover:text-red-500" onClick={() => deleteAnnouncement(a.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">New Announcement</h3>
            <form onSubmit={handleAddAnnouncment} className="space-y-4">
              <Input placeholder="Announcement Title" className="rounded-xl" value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)} required />
              <Select value={newAnnType} onValueChange={setNewAnnType}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="danger">Danger</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Message content..." className="rounded-xl resize-none" rows={3} value={newAnnContent} onChange={e => setNewAnnContent(e.target.value)} required />
              <Button type="submit" disabled={submittingAnn} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full">Broadcast Announcement</Button>
            </form>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
