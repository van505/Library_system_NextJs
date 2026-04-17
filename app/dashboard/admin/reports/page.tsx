'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { Download, Book, Users, CalendarCheck, AlertTriangle, Activity } from 'lucide-react'
import Papa from 'papaparse'
import { format, subDays, startOfDay, isPast } from 'date-fns'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function AdminReportsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // System States
  const [totals, setTotals] = useState({ books: 0, users: 0, activeBorrows: 0, overdue: 0 })
  const [checkoutTrend, setCheckoutTrend] = useState<any[]>([])
  const [categoryDist, setCategoryDist] = useState<any[]>([])
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([])
  const [topStudents, setTopStudents] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // 1. Snapshot Aggregations
      const pBooks = supabase.from('books').select('total_copies', { count: 'exact' })
      const pUsers = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student')
      const pBorrows = supabase.from('transactions').select('id, due_date').eq('status', 'borrowed')
      
      const [rBooks, rUsers, rBorrows] = await Promise.all([pBooks, pUsers, pBorrows])
      
      let totalBooks = 0
      rBooks.data?.forEach((b: any) => { totalBooks += b.total_copies })
      const totalUsers = rUsers.count || 0
      const activeBorrows = rBorrows.data?.length || 0
      const overdue = rBorrows.data?.filter((t: any) => t.due_date && isPast(new Date(t.due_date))).length || 0

      setTotals({ books: totalBooks, users: totalUsers, activeBorrows, overdue })

      // 2. Checkout Trends (last 14 days)
      const { data: trendTxs } = await supabase.from('transactions')
        .select('borrowed_at')
        .gte('borrowed_at', startOfDay(subDays(new Date(), 14)).toISOString())
        .order('borrowed_at', { ascending: true })

      const trendMap: Record<string, number> = {}
      for (let i = 13; i >= 0; i--) { trendMap[format(subDays(new Date(), i), 'MMM dd')] = 0 }
      trendTxs?.forEach((tx: any) => {
        if (!tx.borrowed_at) return
        const d = format(new Date(tx.borrowed_at), 'MMM dd')
        if (trendMap[d] !== undefined) trendMap[d]++
      })
      setCheckoutTrend(Object.entries(trendMap).map(([date, count]) => ({ date, checkoutCount: count })))

      // 3. Category Distribution
      const { data: catTies } = await supabase.from('book_categories').select('categories(name)')
      const catCount: Record<string, number> = {}
      catTies?.forEach((c: any) => {
        if (c.categories?.name) {
          catCount[c.categories.name] = (catCount[c.categories.name] || 0) + 1
        }
      })
      setCategoryDist(Object.entries(catCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value))

      // 4. Most Borrowed (Simple inference from transactions group by book)
      const { data: allTxs } = await supabase.from('transactions').select('book_id, books(title)')
      const bookCount: Record<string, { count: number, title: string }> = {}
      allTxs?.forEach((t: any) => {
        if (t.book_id && t.books?.title) {
          if (!bookCount[t.book_id]) bookCount[t.book_id] = { count: 0, title: t.books.title }
          bookCount[t.book_id].count++
        }
      })
      setMostBorrowed(Object.values(bookCount).sort((a, b) => b.count - a.count).slice(0, 10))

      // 5. User Activity (Top active students)
      const studentCount: Record<string, { count: number, name: string }> = {}
      const { data: popStuds } = await supabase.from('transactions').select('borrower_id, profiles!borrower_id(full_name)')
      popStuds?.forEach((t: any) => {
        if (t.borrower_id && t.profiles?.full_name) {
          if (!studentCount[t.borrower_id]) studentCount[t.borrower_id] = { count: 0, name: t.profiles.full_name }
          studentCount[t.borrower_id].count++
        }
      })
      setTopStudents(Object.values(studentCount).sort((a, b) => b.count - a.count).slice(0, 10).map((u, i) => ({ rank: i + 1, ...u })))

      // 6. Audit Logs
      const { data: logs } = await supabase.from('activity_logs')
        .select('*, profiles!performed_by(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      setAuditLogs(logs || [])

    } catch (e: any) {
      toast.error('Failed to compile reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboardData() }, [])

  const handleExportCSV = (dataset: string) => {
    let data: any[] = []
    let name = 'report.csv'

    switch (dataset) {
      case 'overview':
        data = [{ Metric: 'Total Catalog Assets', Value: totals.books }, { Metric: 'Registered Students', Value: totals.users }, { Metric: 'Active Checkouts', Value: totals.activeBorrows }, { Metric: 'Overdue Items', Value: totals.overdue }]
        name = 'overview_report.csv'
        break
      case 'books':
        data = mostBorrowed.map(b => ({ 'Book Title': b.title, 'Total Lifetime Borrows': b.count }))
        name = 'most_borrowed_report.csv'
        break
      case 'checkouts':
        data = checkoutTrend.map(t => ({ 'Date': t.date, 'Checkouts': t.checkoutCount }))
        name = 'checkouts_trend.csv'
        break
      case 'users':
        data = topStudents.map(s => ({ 'Rank': s.rank, 'Student Name': s.name, 'Total Checkouts': s.count }))
        name = 'top_readers.csv'
        break
      case 'logs':
        data = auditLogs.map(l => ({ 'Date': new Date(l.created_at).toLocaleString(), 'Staff Member': l.profiles?.full_name || 'System', 'Action': l.action_type, 'Description': l.description }))
        name = 'audit_logs.csv'
        break    
    }

    const csvContent = Papa.unparse(data)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = name
    link.click()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 mt-1">Deep dive into data trends, library utilization, and system logs.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl flex-wrap h-auto gap-2 mb-6 w-full justify-start overflow-x-auto shadow-inner">
          <TabsTrigger value="overview" className="rounded-xl px-6">Overview</TabsTrigger>
          <TabsTrigger value="books" className="rounded-xl px-6">Book Analytics</TabsTrigger>
          <TabsTrigger value="checkouts" className="rounded-xl px-6">Checkout Trends</TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl px-6">User Activity</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl px-6">Audit Log</TabsTrigger>
        </TabsList>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 min-h-[500px]">
          
          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">System Overview</h2>
              <Button onClick={() => handleExportCSV('overview')} size="sm" variant="outline" className="gap-2 rounded-xl"><Download className="size-4" /> Export CSV</Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl shadow-sm border-emerald-100 bg-emerald-50/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-emerald-600 mb-1">Catalog Assets</p><p className="text-3xl font-bold text-emerald-900">{loading ? '-' : totals.books}</p></div>
                  <div className="size-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><Book className="size-6" /></div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm border-blue-100 bg-blue-50/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-blue-600 mb-1">Registered Readers</p><p className="text-3xl font-bold text-blue-900">{loading ? '-' : totals.users}</p></div>
                  <div className="size-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Users className="size-6" /></div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm border-orange-100 bg-orange-50/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-orange-600 mb-1">Active Checkouts</p><p className="text-3xl font-bold text-orange-900">{loading ? '-' : totals.activeBorrows}</p></div>
                  <div className="size-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><CalendarCheck className="size-6" /></div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm border-red-100 bg-red-50/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-red-600 mb-1">Overdue Items</p><p className="text-3xl font-bold text-red-900">{loading ? '-' : totals.overdue}</p></div>
                  <div className="size-12 bg-red-100 rounded-full flex items-center justify-center text-red-600"><AlertTriangle className="size-6" /></div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm">
              <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Books Issued — Last 14 Days</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Daily checkout velocity across all staff</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full">
                  <span className="size-2 rounded-full bg-violet-500 inline-block"></span> Checkouts
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={checkoutTrend} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} dx={-4} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgb(0 0 0 / 0.08)', fontSize: 12 }}
                    labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}
                    itemStyle={{ color: '#8b5cf6' }}
                  />
                  <Area type="monotone" dataKey="checkoutCount" name="Books Issued" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#velocityGrad)" dot={false} activeDot={{ r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* TAB 2: BOOK ANALYTICS */}
          <TabsContent value="books" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Book Utilization & Categorizations</h2>
              <Button onClick={() => handleExportCSV('books')} size="sm" variant="outline" className="gap-2 rounded-xl"><Download className="size-4" /> Export Top Books</Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[400px]">
              <Card className="rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4"><CardTitle className="text-base text-slate-800">Most Borrowed Titles</CardTitle></CardHeader>
                <CardContent className="p-4 flex-1 h-0 overflow-y-auto w-full">
                  {mostBorrowed.length === 0 && !loading && <span className="text-slate-400 text-sm mt-4 block text-center">No data</span>}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostBorrowed} layout="vertical" margin={{ left: 80, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4"><CardTitle className="text-base text-slate-800">Category Spread</CardTitle></CardHeader>
                <CardContent className="p-4 flex-1 h-0">
                  {categoryDist.length === 0 && !loading && <span className="text-slate-400 text-sm mt-4 block text-center">No data</span>}
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryDist} innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                        {categoryDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: CHECKOUT TRENDS */}
          <TabsContent value="checkouts" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Checkout Velocity Tracker</h2>
              <Button onClick={() => handleExportCSV('checkouts')} size="sm" variant="outline" className="gap-2 rounded-xl"><Download className="size-4" /> Export CSV</Button>
            </div>
            
            <div className="h-[450px] w-full pt-12 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={checkoutTrend} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dx={-10} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: 4 }}
                  />
                  <Line type="monotone" dataKey="checkoutCount" name="Books Issued" stroke="#10b981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* TAB 4: USER ACTIVITY */}
          <TabsContent value="users" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Top Prolific Readers</h2>
              <Button onClick={() => handleExportCSV('users')} size="sm" variant="outline" className="gap-2 rounded-xl"><Download className="size-4" /> Export CSV</Button>
            </div>

            <div className="border border-slate-200 overflow-hidden rounded-2xl shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-4 w-20 text-center">Rank</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4 text-right">Lifetime Checkouts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topStudents.length === 0 ? (
                    <tr><td colSpan={3} className="p-12 text-center text-slate-400">No active readers found!</td></tr>
                  ) : topStudents.map(student => (
                    <tr key={student.rank} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">
                        {student.rank === 1 ? <span className="text-amber-500 text-lg">🥇</span> : student.rank === 2 ? <span className="text-slate-400 text-lg">🥈</span> : student.rank === 3 ? <span className="text-amber-700 text-lg">🥉</span> : `#${student.rank}`}
                      </td>
                      <td className="p-4 font-bold text-slate-900">{student.name}</td>
                      <td className="p-4 text-right"><Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent shadow-none">{student.count} books</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 5: AUDIT LOG */}
          <TabsContent value="logs" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">System Audit Log</h2>
                <p className="text-xs text-slate-500 mt-1">Tracks all major administrative and staff-level security/entity changes.</p>
              </div>
              <Button onClick={() => handleExportCSV('logs')} size="sm" variant="outline" className="gap-2 rounded-xl"><Download className="size-4" /> Export Logs</Button>
            </div>

            <div className="border border-slate-200 overflow-hidden rounded-2xl shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3 w-40">Timestamp</th>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Action Type</th>
                    <th className="p-3 max-w-[300px]">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={4} className="p-12 text-center text-slate-400">No recent activity.</td></tr>
                  ) : auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-500 font-mono tracking-tighter">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {log.profiles?.full_name || <span className="text-slate-400 italic">System Auto</span>}
                        {log.role === 'admin' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700 uppercase tracking-widest font-black">Admin</span>}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-[9px] uppercase shadow-none border-slate-200 text-slate-600">
                          {log.action_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-700 truncate max-w-[300px]" title={log.description}>
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-center pt-2">
              <a href="/dashboard/admin/activity-log" className="text-sm font-semibold text-primary hover:underline gap-1 inline-flex items-center">
                View Full Advanced Activity Log <Activity className="size-3" />
              </a>
            </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}
