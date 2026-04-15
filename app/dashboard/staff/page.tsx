'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { BookOpen, Search, ArrowRightLeft, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, Phone } from 'lucide-react'
import { format, isPast, addDays, getMonth, getDate, differenceInDays } from 'date-fns'

export default function StaffDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  
  // Stats
  const [stats, setStats] = React.useState({ available: 0, borrowed: 0, dueToday: 0, overdue: 0 })

  // Activity and Overdue Alerts
  const [recentActivity, setRecentActivity] = React.useState<any[]>([])
  const [overdueAlerts, setOverdueAlerts] = React.useState<any[]>([])
  const [announcements, setAnnouncements] = React.useState<any[]>([])

  // Quick Borrow Widget
  const [studentSearch, setStudentSearch] = React.useState('')
  const [bookSearch, setBookSearch] = React.useState('')
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null)
  const [selectedBook, setSelectedBook] = React.useState<any>(null)
  const [dueDate, setDueDate] = React.useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
  const [studentResults, setStudentResults] = React.useState<any[]>([])
  const [bookResults, setBookResults] = React.useState<any[]>([])
  const [processing, setProcessing] = React.useState(false)

  // Quick Return Widget
  const [returnSearch, setReturnSearch] = React.useState('')
  const [returnResults, setReturnResults] = React.useState<any[]>([])
  const [selectedReturnTx, setSelectedReturnTx] = React.useState<any>(null)

  async function loadData() {
    setLoading(true)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    
    const [bRes, txRes, aRes] = await Promise.all([
      supabase.from('books').select('available_copies'),
      supabase.from('transactions')
        .select('*, books(title, author), profiles!borrower_id(full_name, contact_number, student_id)')
        .order('borrowed_at', { ascending: false }),
      supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })
    ])

    const available = bRes.data?.reduce((a, b) => a + (b.available_copies || 0), 0) ?? 0
    const allTx = txRes.data ?? []
    
    let dueToday = 0
    let overdue = 0
    const borrowed = allTx.filter(t => {
      if (t.status === 'borrowed') {
        if (t.due_date === todayStr) dueToday++
        if (t.due_date && isPast(new Date(t.due_date)) && t.due_date !== todayStr) overdue++
        return true
      }
      return false
    }).length

    setStats({ available, borrowed, dueToday, overdue })

    setRecentActivity(allTx.slice(0, 10))
    setOverdueAlerts(allTx.filter(t => t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))))
    setAnnouncements(aRes.data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  // Live searches with debounce — only use columns that exist on profiles table
  // Search ALL profiles by full_name ilike (simple, no broken OR with nullable student_id)
  React.useEffect(() => {
    if (!studentSearch.trim()) { setStudentResults([]); return }
    const timer = setTimeout(() => {
      supabase
        .from('profiles')
        .select('id, full_name, student_id, contact_number, role')
        .ilike('full_name', `%${studentSearch}%`)
        .limit(10)
        .then(({ data }) => setStudentResults(data ?? []))
    }, 250)
    return () => clearTimeout(timer)
  }, [studentSearch, supabase])

  React.useEffect(() => {
    if (!bookSearch.trim()) { setBookResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('books')
        .select('id, title, author, available_copies')
        .gt('available_copies', 0)
        .ilike('title', `%${bookSearch}%`)
        .limit(8)
      setBookResults(data ?? [])
    }, 250)
    return () => clearTimeout(timer)
  }, [bookSearch, supabase])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (returnSearch.length > 0) {
        supabase.from('transactions')
          .select('id, book_id, borrower_id, books(title), profiles(full_name)')
          .eq('status', 'borrowed')
          .order('borrowed_at', { ascending: false })
          .then(res => {
            const matched = (res.data ?? []).filter(t => {
              const bt = ((t.books as any)?.title || '').toLowerCase()
              const pt = ((t.profiles as any)?.full_name || '').toLowerCase()
              const s = returnSearch.toLowerCase()
              return bt.includes(s) || pt.includes(s)
            })
            setReturnResults(matched.slice(0, 8))
          })
      } else setReturnResults([])
    }, 250)
    return () => clearTimeout(timer)
  }, [returnSearch, supabase])

  async function handleBorrow() {
    if (!selectedBook || !selectedStudent) return
    setProcessing(true)
    const { error: txErr } = await supabase.from('transactions').insert({
      book_id: selectedBook.id, borrower_id: selectedStudent.id, due_date: dueDate, status: 'borrowed', borrowed_at: new Date().toISOString()
    })
    if (!txErr) {
      // BUG 1 FIX: Safe decrement — GREATEST(available - 1, 0)
      const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', selectedBook.id).single()
      if (bk && bk.available_copies > 0) {
        await supabase.from('books').update({ available_copies: Math.max(bk.available_copies - 1, 0) }).eq('id', selectedBook.id)
      }
      await supabase.from('notifications').insert({
        user_id: selectedStudent.id, title: 'Book Issued 📚', message: `"${selectedBook.title}" has been issued to you. Due: ${format(new Date(dueDate), 'MMM d, yyyy')}`, type: 'info', link: '/dashboard/student/requests'
      })
      toast.success('Book issued successfully!')
      setSelectedBook(null); setSelectedStudent(null); setStudentSearch(''); setBookSearch('')
      loadData()
    } else toast.error('Failed to issue book')
    setProcessing(false)
  }

  async function handleReturn() {
    if (!selectedReturnTx) return
    setProcessing(true)
    const { error } = await supabase.from('transactions').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', selectedReturnTx.id)
    if (!error) {
      // BUG 1 FIX: Safe increment — LEAST(available + 1, total_copies)
      const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', selectedReturnTx.book_id).single()
      if (bk) await supabase.from('books').update({ available_copies: Math.min(bk.available_copies + 1, bk.total_copies) }).eq('id', selectedReturnTx.book_id)
      await supabase.from('notifications').insert({
        user_id: selectedReturnTx.borrower_id, title: 'Book Returned ✅', message: 'Thank you! Your book has been marked as returned.', type: 'success', link: '/dashboard/student/requests'
      })
      toast.success('Book returned successfully!')
      setSelectedReturnTx(null); setReturnSearch('')
      loadData()
    } else toast.error('Failed to return book')
    setProcessing(false)
  }

  if (loading) return <div className="p-6"><Skeleton className="h-[200px] rounded-2xl" /></div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((a: any) => {
            const colors: Record<string, string> = {
              info: 'border-l-blue-400 bg-blue-50/50',
              warning: 'border-l-amber-400 bg-amber-50/50',
              success: 'border-l-emerald-400 bg-emerald-50/50',
              danger: 'border-l-red-400 bg-red-50/50',
            }
            const iconColors: Record<string, string> = {
              info: 'text-blue-500', warning: 'text-amber-500',
              success: 'text-emerald-500', danger: 'text-red-500',
            }
            return (
              <div key={a.id} className={`border border-slate-200 border-l-4 rounded-r-xl p-4 shadow-sm flex gap-3 ${colors[a.type] || colors.info}`}>
                <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${iconColors[a.type] || iconColors.info}`} />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{a.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{a.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Books', v: stats.available, icon: BookOpen, c: 'bg-emerald-50 text-emerald-600' },
          { label: 'Currently Borrowed', v: stats.borrowed, icon: ArrowRightLeft, c: 'bg-indigo-50 text-indigo-600' },
          { label: 'Due Today', v: stats.dueToday, icon: Clock, c: 'bg-amber-50 text-amber-600' },
          { label: 'Overdue', v: stats.overdue, icon: AlertTriangle, c: 'bg-red-50 text-red-600' }
        ].map((s,i) => (
          <Card key={i} className="rounded-2xl shadow-sm border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-1">{s.label}</p>
                <p className={`text-3xl font-bold ${s.c.split(' ')[1]}`}>{s.v}</p>
              </div>
              <div className={`size-12 rounded-xl flex items-center justify-center ${s.c}`}><s.icon className="size-6" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
            <CardHeader className="bg-indigo-600 text-white rounded-t-none border-b-0 py-3.5 px-5">
              <CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="size-4" /> Quick Action Flow</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="borrow" className="w-full">
                <TabsList className="w-full rounded-none h-12 bg-indigo-50 p-0 overflow-hidden text-indigo-800 border-b border-indigo-100 grid grid-cols-2">
                   <TabsTrigger value="borrow" className="rounded-none data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:font-bold data-[state=active]:shadow-none h-full border-r border-indigo-100/50 m-0">
                     <ArrowUpRight className="size-4 mr-2" /> Issue Book
                   </TabsTrigger>
                   <TabsTrigger value="return" className="rounded-none data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:font-bold data-[state=active]:shadow-none h-full m-0">
                     <ArrowDownRight className="size-4 mr-2" /> Return Book
                   </TabsTrigger>
                </TabsList>
                
                <TabsContent value="borrow" className="p-5 space-y-4 outline-none m-0 focus:outline-none">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wide">Student</Label>
                    {selectedStudent ? (
                      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-indigo-800 text-sm font-medium">
                        <span className="truncate">{selectedStudent.full_name}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 hover:bg-indigo-100 bg-white shadow-sm" onClick={() => setSelectedStudent(null)}>Clear</Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            autoComplete="off"
                            className="pl-9 rounded-xl border-slate-200 bg-slate-50"
                            placeholder="Type any part of name..."
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                          />
                        </div>
                        {studentSearch.trim() && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            {studentResults.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-2.5">No match for "{studentSearch}"</p>
                            ) : (
                              studentResults.map(s => (
                                <div
                                  key={s.id}
                                  className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                                  onClick={() => { setSelectedStudent(s); setStudentSearch('') }}
                                >
                                  <span className="font-medium text-slate-800">{s.full_name}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    s.role === 'student' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>{s.role}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wide">Book</Label>
                    {selectedBook ? (
                       <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-indigo-800 text-sm font-medium">
                        <span className="truncate">{selectedBook.title}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 hover:bg-indigo-100 bg-white shadow-sm" onClick={()=>setSelectedBook(null)}>Clear</Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input className="pl-9 rounded-xl border-slate-200 bg-slate-50" placeholder="Search available books..." value={bookSearch} onChange={e=>setBookSearch(e.target.value)} />
                        {bookResults.length > 0 && (
                          <Card className="absolute top-full left-0 w-full mt-1 z-50 p-1 shadow-xl border-slate-200">
                            {bookResults.map(b => (
                               <div key={b.id} className="p-2 text-sm hover:bg-indigo-50 rounded-lg cursor-pointer" onClick={()=>{setSelectedBook(b); setBookSearch('')}}>
                                <span className="font-semibold text-slate-800">{b.title}</span>
                                <div className="text-xs text-emerald-600">{b.available_copies} available</div>
                              </div>
                            ))}
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wide">Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="rounded-xl border-slate-200 bg-slate-50" />
                  </div>
                  <Button disabled={processing || !selectedStudent || !selectedBook} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold mt-2 py-6 shadow-md shadow-indigo-200" onClick={handleBorrow}>
                    {processing ? 'Processing...' : 'Confirm Issue'}
                  </Button>
                </TabsContent>

                <TabsContent value="return" className="p-5 min-h-[310px] m-0 outline-none focus:outline-none flex flex-col items-center justify-center">
                  {selectedReturnTx ? (
                    <div className="w-full space-y-4">
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                         <Badge className="bg-emerald-100 text-emerald-700 font-bold mb-2 border-emerald-200 shadow-none hover:bg-emerald-100">Ready to Return</Badge>
                         <h4 className="font-bold text-slate-900 text-lg">{(selectedReturnTx.books as any)?.title}</h4>
                         <p className="text-sm text-slate-600">Borrowed by: <span className="font-semibold">{(selectedReturnTx.profiles as any)?.full_name}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 rounded-xl bg-white hover:bg-slate-50 border-slate-200 text-slate-600" onClick={()=>setSelectedReturnTx(null)}>Cancel</Button>
                        <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 font-semibold" onClick={handleReturn} disabled={processing}>Confirm Return</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-4 text-center">
                      <div className="mx-auto size-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                        <ArrowDownRight className="size-8 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-slate-900">Scan or Search</h3>
                      <div className="relative text-left">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input className="pl-9 rounded-xl border-slate-200 bg-slate-50 h-12" placeholder="Student or Book Name..." value={returnSearch} onChange={e=>setReturnSearch(e.target.value)} />
                        {returnResults.length > 0 && (
                          <Card className="absolute top-full left-0 w-full mt-1 z-50 p-1 shadow-xl border-slate-200">
                            {returnResults.map(r => (
                               <div key={r.id} className="p-3 text-sm hover:bg-emerald-50 rounded-lg cursor-pointer border-b border-slate-50 last:border-0" onClick={()=>{setSelectedReturnTx(r); setReturnSearch('')}}>
                                <div className="font-semibold text-slate-800">{(r.books as any)?.title}</div>
                                <div className="text-xs text-slate-500 mt-1">Due from {(r.profiles as any)?.full_name}</div>
                              </div>
                            ))}
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-slate-200 shadow-sm border-2 border-red-50 bg-red-50/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-800 flex items-center gap-2"><AlertTriangle className="size-4" /> Action Required (Overdue)</CardTitle>
            </CardHeader>
            <CardContent>
              {overdueAlerts.length === 0 ? <p className="text-sm text-slate-500 italic">No overdue books right now.</p> : (
                <div className="space-y-3">
                  {overdueAlerts.slice(0,4).map(o => {
                    const days = differenceInDays(new Date(), new Date(o.due_date))
                    return (
                      <div key={o.id} className="text-sm bg-white border border-red-100 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-slate-900 truncate pr-2">{(o.books as any)?.title}</span>
                          <span className="text-red-600 font-bold whitespace-nowrap text-[11px] bg-red-100 px-1.5 py-0.5 rounded uppercase">{days}d late</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span className="truncate">{(o.profiles as any)?.full_name}</span>
                          {/* We can show a small contact info dot or link */}
                          {(o.profiles as any)?.contact_number && <a href={`tel:${(o.profiles as any).contact_number}`} className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors"><Phone className="size-3"/> Call</a>}
                        </div>
                      </div>
                    )
                  })}
                  {overdueAlerts.length > 4 && <div className="text-center mt-2"><Button variant="link" className="text-xs text-red-600 h-auto p-0">View all {overdueAlerts.length} overdue →</Button></div>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-slate-200 shadow-sm h-full">
             <CardHeader>
               <CardTitle>Recent Activity Stream</CardTitle>
             </CardHeader>
             <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <ArrowRightLeft className="size-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No activity yet. Issue or return a book to see it here.</p>
                  </div>
                ) : recentActivity.map((a) => {
                  const isReturn = a.status === 'returned'
                  const date = a.returned_at || a.borrowed_at
                  const profileName = (a.profiles as any)?.full_name || 'Unknown'
                  return (
                    <div key={a.id} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isReturn ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                        {isReturn ? <ArrowDownRight className={`size-4 text-emerald-600`} /> : <ArrowUpRight className="size-4 text-indigo-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{(a.books as any)?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isReturn ? 'Returned by' : 'Issued to'} <span className="font-medium">{profileName}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isReturn ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-indigo-700 bg-indigo-50 border-indigo-100'}`}>
                          {isReturn ? 'Returned' : 'Issued'}
                        </Badge>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {date ? format(new Date(date), 'MMM d, h:mm a') : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
