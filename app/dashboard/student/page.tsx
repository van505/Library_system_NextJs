'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { BookOpen, Clock, CheckCircle, AlertTriangle, ArrowRight, Sparkles, MessageSquare, History, Bell, Search } from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import Link from 'next/link'

export default function StudentDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  
  // Data
  const [profile, setProfile] = React.useState<any>(null)
  const [activeTx, setActiveTx] = React.useState<any[]>([])
  const [stats, setStats] = React.useState({ total: 0, active: 0, returned: 0, overdue: 0 })
  const [latestBooks, setLatestBooks] = React.useState<any[]>([])
  const [announcements, setAnnouncements] = React.useState<any[]>([])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [pRes, txRes, bRes, aRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('transactions').select('*, books(title, author, cover_url, categories(color))').eq('borrower_id', user.id).order('borrowed_at', { ascending: false }),
      supabase.from('books').select('*, categories(name, color)').order('created_at', { ascending: false }).limit(4),
      supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })
    ])

    setProfile(pRes.data)
    
    const allTx = txRes.data ?? []
    const active = allTx.filter(t => t.status === 'borrowed')
    const returned = allTx.length - active.length
    const overdue = active.filter(t => t.due_date && isPast(new Date(t.due_date))).length
    
    setStats({ total: allTx.length, active: active.length, returned, overdue })
    setActiveTx(active)
    setLatestBooks(bRes.data ?? [])
    setAnnouncements(aRes.data ?? [])

    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  if (loading) return <div className="p-6 space-y-6"><Skeleton className="h-40 rounded-3xl" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-32 rounded-2xl"/><Skeleton className="h-32 rounded-2xl"/><Skeleton className="h-32 rounded-2xl"/><Skeleton className="h-32 rounded-2xl"/></div></div>

  const initials = profile?.full_name?.split(' ').map((n:any) => n[0]).join('').substring(0,2).toUpperCase() || 'U'

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        
        {/* Glassmorphic Ambient Glow & Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-20 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 z-0 transition-transform duration-1000 group-hover:scale-110"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary opacity-10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 z-0"></div>
        
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none z-0">
          <BookOpen className="size-64 -rotate-12 translate-x-12 -translate-y-12" />
        </div>

        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
           <div className="size-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-md shadow-lg shrink-0">
             {initials}
           </div>
           <div>
             <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 opacity-95">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
             <p className="text-slate-300 font-medium flex-wrap flex items-center gap-2">
                {profile?.student_id && <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/10 border backdrop-blur-sm shadow-none font-semibold">ID: {profile.student_id}</Badge>}
                Ready to explore new worlds today?
             </p>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10 shrink-0">
          <Button asChild className="rounded-xl flex-1 md:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:-translate-y-1 hover:shadow-xl transition-all h-12 px-6">
            <Link href="/dashboard/student/browse"><Search className="size-4 mr-2" /> Browse Catalog</Link>
          </Button>
          <Button asChild className="rounded-xl flex-1 md:flex-none bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold backdrop-blur-md shadow-none hover:-translate-y-1 transition-all h-12 px-6">
            <Link href="/chat"><Sparkles className="size-4 mr-2 text-amber-300" /> Ask Libby AI</Link>
          </Button>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((a: any) => {
            const colors: Record<string, string> = {
              info: 'border-l-blue-400 bg-blue-50/60',
              warning: 'border-l-amber-400 bg-amber-50/60',
              success: 'border-l-emerald-400 bg-emerald-50/60',
              danger: 'border-l-red-400 bg-red-50/60',
            }
            const iconColors: Record<string, string> = {
              info: 'text-blue-500', warning: 'text-amber-500',
              success: 'text-emerald-500', danger: 'text-red-500',
            }
            return (
              <div key={a.id} className={`border border-slate-200 border-l-4 rounded-r-xl p-4 shadow-sm flex gap-4 ${colors[a.type] || colors.info}`}>
                <Bell className={`size-5 shrink-0 mt-0.5 ${iconColors[a.type] || iconColors.info}`} />
                <div>
                  <h4 className="font-bold text-slate-800">{a.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{a.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Books Borrowed', v: stats.total, icon: History, c: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'Currently Active', v: stats.active, icon: BookOpen, c: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Books Returned', v: stats.returned, icon: CheckCircle, c: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Overdue Books', v: stats.overdue, icon: AlertTriangle, c: `text-red-600 ${stats.overdue > 0 ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100' : 'bg-slate-50 border-slate-100 text-slate-400'}` }
        ].map((s,i) => (
          <Card key={i} className={`border rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${s.c}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                 <div className={`p-2.5 rounded-xl bg-white shadow-sm shrink-0`}>
                    <s.icon className="size-5" />
                 </div>
                 <p className="text-4xl font-black">{s.v}</p>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80 mt-4">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Currently Borrowed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Currently Borrowed</h2>
            <Button asChild variant="link" className="text-emerald-600 hover:text-emerald-700">
              <Link href="/dashboard/student/borrowed">View All <ArrowRight className="size-4 ml-1"/></Link>
            </Button>
          </div>
          
          {activeTx.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
               <BookOpen className="size-12 text-slate-200 mx-auto mb-3" />
               <p className="text-slate-500 font-medium">You have no active borrowed books.</p>
               <Button asChild variant="outline" className="mt-4 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                 <Link href="/dashboard/student/browse">Browse Catalog</Link>
               </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTx.map(t => {
                const b = t.books as any
                const daysLeft = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : 0
                const overdue = isPast(new Date(t.due_date))
                
                let badge = null
                let ring = 'ring-slate-100'
                if (overdue) { badge = <Badge className="bg-red-500 hover:bg-red-600">Overdue!</Badge>; ring = 'ring-red-100 shadow-md shadow-red-100 border-red-100' }
                else if (daysLeft <= 3) { badge = <Badge className="bg-amber-500 hover:bg-amber-600">{daysLeft} days left</Badge>; ring = 'ring-amber-50 border-amber-100' }
                else badge = <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent shadow-none">{daysLeft} days left</Badge>

                return (
                  <div key={t.id} className={`bg-white p-4 rounded-3xl border border-slate-200 ring-4 transition-all ${ring} flex gap-4`}>
                    <div className="w-16 h-24 rounded-lg bg-slate-200 overflow-hidden shrink-0 shadow-sm relative">
                      {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover"/> : <div className="w-full h-full" style={{backgroundColor: b.categories?.color || '#cbd5e1'}} />}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="font-bold text-slate-900 leading-tight truncate">{b.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{b.author}</p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                         {badge}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions / Side Panel */}
        <div className="space-y-6">
           <Card className="rounded-3xl border-slate-200 shadow-sm bg-slate-900 text-white overflow-hidden relative">
             <div className="absolute -right-6 -top-6 size-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
             <CardHeader className="pb-3 relative z-10">
               <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="size-5 text-indigo-400" /> Actions</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2 relative z-10">
               <Button asChild variant="secondary" className="w-full justify-start rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white border-transparent">
                 <Link href="/dashboard/student/requests"><BookOpen className="size-4 mr-3 opacity-70" /> Request a Book</Link>
               </Button>
               <Button asChild variant="secondary" className="w-full justify-start rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white border-transparent">
                 <Link href="/dashboard/student/reviews"><MessageSquare className="size-4 mr-3 opacity-70" /> Write a Review</Link>
               </Button>
             </CardContent>
           </Card>

           <div>
             <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Fresh Arrivals</h2>
             <div className="space-y-3">
               {latestBooks.map(b => (
                 <div key={b.id} className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-3 cursor-pointer">
                   <div className="w-12 h-16 rounded overflow-hidden shrink-0">
                     {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover"/> : <div className="w-full h-full" style={{backgroundColor: b.categories?.color || '#cbd5e1'}} />}
                   </div>
                   <div className="flex-1 min-w-0 py-0.5">
                     <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-600 transition-colors">{b.title}</h4>
                     <p className="text-xs text-slate-500 truncate">{b.author}</p>
                     {b.categories && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                           <div className="size-2 rounded-full" style={{backgroundColor: b.categories.color}} />
                           <span className="text-[10px] text-slate-500 font-medium">{b.categories.name}</span>
                        </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>

      </div>
    </div>
  )
}
