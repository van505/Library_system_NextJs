'use client'

import * as React from 'react'
import { BookOpen, BookMarked, Layers, Users, ArrowLeftRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format, isBefore } from 'date-fns'

const COLORS = ['#4f46e5', '#7c3aed', '#059669', '#d97706']

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<{
    stats: any,
    genreData: any[],
    txs: any[],
    requests: any[],
    announcements: any[]
  }>({ stats: {}, genreData: [], txs: [], requests: [], announcements: [] })

  React.useEffect(() => {
    async function load() {
      const [bRes, sRes, uRes, txRes, reqRes, annRes] = await Promise.all([
        supabase.from('books').select('genre, available_copies, total_copies'),
        supabase.from('shelves').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('transactions').select('*, profiles(full_name)').order('borrowed_at', { ascending: false }),
        supabase.from('book_requests').select('*, auth_users:profiles!user_id(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
      ])

      const books = bRes.data || []
      const totalBooks = books.reduce((acc, b) => acc + (b.total_copies ?? 1), 0)
      const available = books.reduce((acc, b) => acc + (b.available_copies ?? 1), 0)
      const borrowed = totalBooks - available

      const txs = txRes.data || []
      const overdue = txs.filter(t => t.status === 'borrowed' && t.due_date && isBefore(new Date(t.due_date), new Date())).length

      // Gen Chart Data
      const genres: Record<string, number> = {}
      books.forEach(b => {
        if (b.genre) genres[b.genre] = (genres[b.genre] || 0) + 1
      })
      const genreData = Object.keys(genres).map(g => ({ name: g, count: genres[g] }))

      setData({
        stats: { totalBooks, available, borrowed, totalShelves: sRes.count || 0, totalStudents: uRes.count || 0, overdue },
        genreData,
        txs: txs.slice(0, 5),
        requests: reqRes.data || [],
        announcements: annRes.data || []
      })
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Total Books', value: data.stats.totalBooks, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    { label: 'Available', value: data.stats.available, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Borrowed', value: data.stats.borrowed, icon: BookMarked, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Total Shelves', value: data.stats.totalShelves, icon: Layers, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
    { label: 'Total Students', value: data.stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Overdue Books', value: data.stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  ]

  const pieData = [
    { name: 'Available', value: data.stats.available },
    { name: 'Borrowed', value: data.stats.borrowed }
  ]

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">Overview of the library system</p>
      </div>

      {/* Row 1: Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />) : statCards.map((s, i) => (
          <div key={i} className={`p-4 rounded-2xl border ${s.bg} flex flex-col gap-2 items-start shadow-sm`}>
            <div className="flex items-center gap-2">
              <s.icon className={`size-5 ${s.color}`} />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Books by Genre</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.genreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Availability Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center">
            {loading ? <Skeleton className="w-48 h-48 rounded-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#059669' : '#d97706'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-4 text-sm font-medium">
              <span className="flex items-center gap-1.5"><div className="size-3 rounded-full bg-[#059669]"></div> Available</span>
              <span className="flex items-center gap-1.5"><div className="size-3 rounded-full bg-[#d97706]"></div> Borrowed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 px-5 py-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ArrowLeftRight className="size-4" /> Recent Transactions
            </CardTitle>
          </CardHeader>
          <div className="p-0">
             {loading ? <div className="p-5"><Skeleton className="h-32" /></div> : data.txs.length === 0 ? <p className="p-5 text-sm text-slate-500 text-center">No transactions</p> : (
               <table className="w-full text-sm">
                 <tbody className="divide-y divide-slate-100">
                   {data.txs.map(tx => (
                     <tr key={tx.id} className="hover:bg-slate-50">
                       <td className="p-4">
                         <p className="font-medium text-slate-900">{tx.profiles?.full_name}</p>
                         <p className="text-xs text-slate-500">{format(new Date(tx.borrowed_at), 'MMM d, yyyy')}</p>
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
             )}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 px-5 py-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle className="size-4" /> Pending Requests
            </CardTitle>
          </CardHeader>
          <div className="p-0">
            {loading ? <div className="p-5"><Skeleton className="h-32" /></div> : data.requests.length === 0 ? <p className="p-5 text-sm text-slate-500 text-center">No pending requests</p> : (
               <table className="w-full text-sm">
                 <tbody className="divide-y divide-slate-100">
                   {data.requests.map(req => (
                     <tr key={req.id} className="hover:bg-slate-50">
                       <td className="p-4">
                         <p className="font-medium text-slate-900">{req.book_title}</p>
                         <p className="text-xs text-slate-500">by {req.auth_users?.full_name}</p>
                       </td>
                       <td className="p-4 text-right">
                         <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </div>
        </Card>
      </div>
    </div>
  )
}
