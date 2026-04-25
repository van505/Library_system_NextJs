'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { BookOpen, Clock, CheckCircle, AlertTriangle, ArrowRight, Sparkles, MessageSquare, History, Bell, Search, Crown, Star } from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import Link from 'next/link'
import { checkBorrowingLimit, type BorrowLimitResult } from '@/lib/borrowingLimit'
import { checkAndSendReminders } from '@/lib/dueDateReminders'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function StudentDashboard() {
  const supabase = createClient()
  const { t: tr } = useLanguage()
  const [loading, setLoading] = React.useState(true)

  // Data
  const [profile, setProfile] = React.useState<any>(null)
  const [activeTx, setActiveTx] = React.useState<any[]>([])
  const [stats, setStats] = React.useState({ total: 0, active: 0, returned: 0, overdue: 0 })
  const [latestBooks, setLatestBooks] = React.useState<any[]>([])
  const [announcements, setAnnouncements] = React.useState<any[]>([])
  const [borrowLimit, setBorrowLimit] = React.useState<BorrowLimitResult | null>(null)
  const [hasDueSoon, setHasDueSoon] = React.useState(false)
  const [hasOverdue, setHasOverdue] = React.useState(false)
  // Feature W
  const [bookOfMonth, setBookOfMonth] = React.useState<any>(null)
  const [featuredBooks, setFeaturedBooks] = React.useState<any[]>([])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [pRes, txRes, bRes, aRes, botmRes, featRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('transactions').select('*, books(title, author, cover_url, categories(color))').eq('borrower_id', user.id).order('borrowed_at', { ascending: false }),
      supabase.from('books').select('*, categories(name, color)').order('created_at', { ascending: false }).limit(4),
      supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('books').select('*, shelves(name), book_categories(categories(name,color))').eq('is_book_of_month', true).eq('is_archived', false).single(),
      supabase.from('books').select('*, shelves(name), book_categories(categories(name,color))').eq('is_featured', true).eq('is_archived', false).neq('is_book_of_month', true).order('title'),
    ])

    const limitResult = await checkBorrowingLimit(supabase, user.id)
    setBorrowLimit(limitResult)

    // Trigger reminders once per session
    try {
      if (!sessionStorage.getItem('reminders_checked')) {
        await checkAndSendReminders(supabase, user.id)
        sessionStorage.setItem('reminders_checked', 'true')
      }
    } catch { /* never block page load */ }

    setProfile(pRes.data)

    const allTx = txRes.data ?? []
    const active = allTx.filter(t => t.status === 'borrowed')
    const returned = allTx.length - active.length
    const overdue = active.filter(t => t.due_date && isPast(new Date(t.due_date))).length

    setStats({ total: allTx.length, active: active.length, returned, overdue })
    setActiveTx(active)

    // Compute due-soon and overdue flags for banners
    const today = new Date()
    const dueSoon = active.some(t => {
      if (!t.due_date) return false
      const days = differenceInDays(new Date(t.due_date), today)
      return days >= 0 && days <= 3
    })
    const overdueFlag = active.some(t => t.due_date && isPast(new Date(t.due_date)))
    setHasDueSoon(dueSoon)
    setHasOverdue(overdueFlag)
    setLatestBooks(bRes.data ?? [])
    setAnnouncements(aRes.data ?? [])
    setBookOfMonth(botmRes.data ?? null)
    setFeaturedBooks(featRes.data ?? [])

    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  if (loading) return <div className="p-6 space-y-6"><Skeleton className="h-40 rounded-3xl" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div></div>

  const initials = profile?.full_name?.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'

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

      {/* Due Date Alert Banners (Feature R) */}
      {hasOverdue && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-xl p-4 shadow-sm">
          <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">{tr('overdueAlert')}</p>
            <p className="text-sm text-red-700 mt-0.5">{tr('overdueMsg')} <Link href="/dashboard/student/borrowed" className="underline font-semibold">{tr('viewOverdueBooks')} →</Link></p>
          </div>
        </div>
      )}
      {!hasOverdue && hasDueSoon && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 rounded-xl p-4 shadow-sm">
          <Clock className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800">{tr('dueSoonAlert')}</p>
            <p className="text-sm text-amber-700 mt-0.5">{tr('dueSoonMsg')} <Link href="/dashboard/student/borrowed" className="underline font-semibold">{tr('viewBorrowedBooks')} →</Link></p>
          </div>
        </div>
      )}

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
          { label: tr('booksBorrowed'), v: stats.total, icon: History, c: 'text-primary bg-primary/10 border-primary/20' },
          { label: tr('currentlyActive'), v: stats.active, icon: BookOpen, c: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: tr('booksReturned'), v: stats.returned, icon: CheckCircle, c: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: tr('overdueBooks'), v: stats.overdue, icon: AlertTriangle, c: `text-red-600 ${stats.overdue > 0 ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100' : 'bg-slate-50 border-slate-100 text-slate-400'}` }
        ].map((s, i) => (
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

      {/* Borrowing Capacity Bar */}
      {borrowLimit && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-slate-800">{tr('borrowingCapacity')}</p>
              <p className="text-xs text-slate-500">{borrowLimit.current} of {borrowLimit.limit} {tr('slotsUsed')}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${borrowLimit.current >= borrowLimit.limit
              ? 'bg-red-100 text-red-700'
              : borrowLimit.current >= Math.ceil(borrowLimit.limit * 0.5)
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
              }`}>
              {borrowLimit.current >= borrowLimit.limit ? tr('limitReached') : `${borrowLimit.limit - borrowLimit.current} ${tr('available')}`}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${borrowLimit.current >= borrowLimit.limit
                ? 'bg-red-500'
                : borrowLimit.current >= Math.ceil(borrowLimit.limit * 0.5)
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
                }`}
              style={{ width: `${Math.min((borrowLimit.current / borrowLimit.limit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Book of the Month (Feature W) */}
      {bookOfMonth && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-200 shadow-lg bg-gradient-to-br from-amber-50 via-amber-100 to-yellow-100">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-transparent pointer-events-none" />
          <div className="p-6 flex flex-col md:flex-row gap-6 items-center relative z-10">
            {/* Cover */}
            <div className="w-32 h-44 rounded-2xl overflow-hidden shrink-0 shadow-xl border-2 border-amber-300">
              {bookOfMonth.cover_url ? (
                <img src={bookOfMonth.cover_url} className="w-full h-full object-cover" alt={bookOfMonth.title} />
              ) : (
                <div className="w-full h-full bg-amber-400 flex items-center justify-center">
                  <span className="text-white text-3xl font-black">{bookOfMonth.title.charAt(0)}</span>
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-amber-600" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-200 px-2.5 py-1 rounded-full">Book of the Month</span>
              </div>
              <h2 className="text-2xl font-black text-amber-900 leading-tight">{bookOfMonth.title}</h2>
              <p className="text-amber-700 font-semibold">by {bookOfMonth.author}</p>
              {bookOfMonth.featured_note && (
                <p className="text-sm text-amber-800 italic bg-amber-200/50 rounded-xl px-3 py-2">&ldquo;{bookOfMonth.featured_note}&rdquo;</p>
              )}
              <div className="flex items-center gap-3">
                <Badge className={`border-transparent font-bold ${bookOfMonth.available_copies > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                  {bookOfMonth.available_copies > 0 ? `${bookOfMonth.available_copies} Available` : 'Borrowed Out'}
                </Badge>
                <Button asChild size="sm" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  <Link href={`/dashboard/student/browse?book=${bookOfMonth.id}`}>View Details</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Books (Feature W) */}
      {featuredBooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="size-5 text-amber-500 fill-amber-400" />
            <h2 className="text-lg font-bold text-slate-900">Featured Books</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {featuredBooks.map(b => {
              const cats = (b.book_categories ?? []).map((bc: any) => bc.categories).filter(Boolean)
              return (
                <Link key={b.id} href={`/dashboard/student/browse?book=${b.id}`}
                  className="shrink-0 w-36 group cursor-pointer">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 mb-2 shadow-sm group-hover:shadow-lg transition-all group-hover:-translate-y-1">
                    {b.cover_url ? (
                      <img src={b.cover_url} className="w-full h-full object-cover" alt={b.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200">
                        <BookOpen className="size-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{b.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{b.author}</p>
                  {cats[0] && (
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1"
                      style={{ backgroundColor: `${cats[0].color}20`, color: cats[0].color }}>{cats[0].name}</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Currently Borrowed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Currently Borrowed</h2>
            <Button asChild variant="link" className="text-emerald-600 hover:text-emerald-700">
              <Link href="/dashboard/student/borrowed">View All <ArrowRight className="size-4 ml-1" /></Link>
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
                      {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: b.categories?.color || '#cbd5e1' }} />}
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
                    {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: b.categories?.color || '#cbd5e1' }} />}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-600 transition-colors">{b.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{b.author}</p>
                    {b.categories && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="size-2 rounded-full" style={{ backgroundColor: b.categories.color }} />
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
