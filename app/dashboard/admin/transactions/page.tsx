'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeftRight, Clock, CheckCircle, AlertTriangle, Search, Plus } from 'lucide-react'
import { format, isPast, differenceInDays, addDays } from 'date-fns'

export default function AdminTransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState('all') // all, borrowed, returned, overdue

  // Borrow Modal
  const [isOpen, setIsOpen] = React.useState(false)
  const [studentSearch, setStudentSearch] = React.useState('')
  const [bookSearch, setBookSearch] = React.useState('')
  
  // Selected Data for Borrowing
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(null)
  const [selectedBook, setSelectedBook] = React.useState<any | null>(null)
  const [dueDate, setDueDate] = React.useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
  const [notes, setNotes] = React.useState('')
  const [borrowing, setBorrowing] = React.useState(false)

  // Live Search Results
  const [studentResults, setStudentResults] = React.useState<any[]>([])
  const [bookResults, setBookResults] = React.useState<any[]>([])

  async function loadTransactions() {
    setLoading(true)
    const { data } = await supabase.from('transactions')
      .select('*, books(title, author, shelves(name, location)), profiles(full_name, student_id, contact_number)')
      .order('borrowed_at', { ascending: false })
    
    setTransactions(data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadTransactions() }, [supabase])

  // Live Search Effects
  React.useEffect(() => {
    if (studentSearch.length > 2) {
      supabase.from('profiles').select('id, full_name, student_id, email, contact_number')
        .eq('role', 'student')
        .or(`full_name.ilike.%${studentSearch}%,email.ilike.%${studentSearch}%,student_id.ilike.%${studentSearch}%`)
        .limit(5).then(res => setStudentResults(res.data ?? []))
    } else setStudentResults([])
  }, [studentSearch, supabase])

  React.useEffect(() => {
    if (bookSearch.length > 2) {
      supabase.from('books').select('id, title, author, available_copies')
        .gt('available_copies', 0)
        .or(`title.ilike.%${bookSearch}%,author.ilike.%${bookSearch}%`)
        .limit(5).then(res => setBookResults(res.data ?? []))
    } else setBookResults([])
  }, [bookSearch, supabase])

  function resetBorrow() {
    setSelectedStudent(null); setSelectedBook(null)
    setStudentSearch(''); setBookSearch('')
    setDueDate(format(addDays(new Date(), 14), 'yyyy-MM-dd')); setNotes(''); setIsOpen(true)
  }

  async function handleBorrowSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent || !selectedBook) { toast.error('Please select both a student and a valid book.'); return }
    setBorrowing(true)

    // Insert Transaction
    const { error: txError } = await supabase.from('transactions').insert({
      book_id: selectedBook.id,
      borrower_id: selectedStudent.id,
      status: 'borrowed', // Note: borrower_id implies user_id from spec, our original schema used borrower_id
      due_date: dueDate,
      notes: notes || null
    })

    if (!txError) {
      // Decrement book inventory
      await supabase.from('books').update({ available_copies: selectedBook.available_copies - 1 }).eq('id', selectedBook.id)
      
      // Notify student
      await supabase.from('notifications').insert({
        user_id: selectedStudent.id,
        title: 'Book Borrowed',
        message: `You have borrowed "${selectedBook.title}". Due date: ${format(new Date(dueDate), 'MMM d, yyyy')}.`,
        type: 'info',
        link: '/dashboard/student/borrowed'
      })

      toast.success('Book successfully borrowed out!')
      setIsOpen(false)
      loadTransactions()
    } else toast.error(txError.message)

    setBorrowing(false)
  }

  async function handleMarkReturned(txId: string, bookId: string, studentId: string | null) {
    const { error: markErr } = await supabase.from('transactions').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', txId)
    if (!markErr) {
      // Get current copy count and increment
      const { data: b } = await supabase.from('books').select('available_copies').eq('id', bookId).single()
      if (b) await supabase.from('books').update({ available_copies: b.available_copies + 1 }).eq('id', bookId)
      
      if (studentId) {
        await supabase.from('notifications').insert({
          user_id: studentId,
          title: 'Book Returned',
          message: 'Thank you! The book has been marked as returned.',
          type: 'success',
          link: '/dashboard/student/borrowed'
        })
      }
      
      toast.success('Transaction marked as returned.')
      loadTransactions()
    } else toast.error(markErr.message)
  }

  // Filtering
  const filtered = transactions.filter(t => {
    if (tab === 'all') return true
    if (tab === 'borrowed') return t.status === 'borrowed' && !isPast(new Date(t.due_date))
    if (tab === 'returned') return t.status === 'returned'
    if (tab === 'overdue') return t.status === 'borrowed' && isPast(new Date(t.due_date))
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">Track all borrowing and return activity across the library.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" onClick={resetBorrow}><Plus className="size-4" /> Issue Book (Borrow)</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Issue Book to Student</DialogTitle></DialogHeader>
            <form onSubmit={handleBorrowSubmit} className="space-y-4 mt-2">
              
              <div className="space-y-2">
                <Label>Student Search</Label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-sm">
                    <div><b>{selectedStudent.full_name}</b> <span className="opacity-70">({selectedStudent.email})</span></div>
                    <Button type="button" variant="ghost" size="sm" onClick={()=>setSelectedStudent(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input className="pl-9 rounded-xl" placeholder="Type name or email..." value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} />
                    {studentResults.length > 0 && (
                      <Card className="absolute top-full left-0 w-full mt-1 z-50 p-1">
                        {studentResults.map(s => (
                          <div key={s.id} className="p-2 text-sm hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between" onClick={()=>{setSelectedStudent(s); setStudentSearch('')}}>
                            <span>{s.full_name}</span><span className="text-slate-400">{s.email}</span>
                          </div>
                        ))}
                      </Card>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Book Search</Label>
                {selectedBook ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-sm">
                    <div><b>{selectedBook.title}</b> <span className="opacity-70">({selectedBook.author})</span></div>
                    <Button type="button" variant="ghost" size="sm" onClick={()=>setSelectedBook(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input className="pl-9 rounded-xl" placeholder="Type title... (Available only)" value={bookSearch} onChange={e=>setBookSearch(e.target.value)} />
                    {bookResults.length > 0 && (
                      <Card className="absolute top-full left-0 w-full mt-1 z-50 p-1">
                        {bookResults.map(b => (
                          <div key={b.id} className="p-2 text-sm hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between" onClick={()=>{setSelectedBook(b); setBookSearch('')}}>
                            <span className="font-medium">{b.title} <span className="text-slate-500 font-normal">by {b.author}</span></span>
                            <span className="text-emerald-600 bg-emerald-50 px-2 rounded">{b.available_copies} avail</span>
                          </div>
                        ))}
                      </Card>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" required value={dueDate} onChange={e=>setDueDate(e.target.value)} className="rounded-xl" />
              </div>
              
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea value={notes} onChange={e=>setNotes(e.target.value)} className="rounded-xl resize-none" rows={2} />
              </div>

              <Button type="submit" disabled={borrowing || !selectedStudent || !selectedBook} className="w-full bg-indigo-600 text-white rounded-xl">
                {borrowing ? 'Processing...' : 'Confirm Issuance'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-slate-100 rounded-xl p-1 mb-4 border border-slate-200">
          <TabsTrigger value="all" className="rounded-lg tabular-nums">All Records</TabsTrigger>
          <TabsTrigger value="borrowed" className="rounded-lg tabular-nums">Active Borrowed</TabsTrigger>
          <TabsTrigger value="returned" className="rounded-lg tabular-nums">Returned</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-lg tabular-nums text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">Overdue</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white border text-sm border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold">Student</th>
              <th className="p-4 font-semibold">Book Info</th>
              <th className="p-4 font-semibold">Timeline</th>
              <th className="p-4 font-semibold">Status / Due</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto"/></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-500"><ArrowLeftRight className="size-10 text-slate-300 mx-auto mb-3" /> No transactions found for this filter.</td></tr>
            ) : filtered.map(t => {
              const book = t.books as any
              const p = t.profiles as any
              const isOverdue = t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
              const daysDiff = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : 0
              
              let statusEl = <span className="text-slate-500">-</span>
              if (t.status === 'returned') statusEl = <Badge className="bg-slate-100 text-slate-600 border-transparent hover:bg-slate-100">Returned</Badge>
              else if (isOverdue) statusEl = <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50"><AlertTriangle className="size-3 mr-1"/> Overdue by {Math.abs(daysDiff)} days</Badge>
              else if (daysDiff <= 3) statusEl = <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"><Clock className="size-3 mr-1"/> Due in {daysDiff} days</Badge>
              else statusEl = <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"><CheckCircle className="size-3 mr-1"/> {daysDiff} days left</Badge>

              return (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 align-top">
                    <p className="font-bold text-slate-900">{p?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{p?.student_id || '-'}</p>
                    {p?.contact_number && <p className="text-xs text-slate-400 mt-1">{p.contact_number}</p>}
                  </td>
                  <td className="p-4 align-top">
                    <p className="font-semibold text-slate-900">{book?.title}</p>
                    <p className="text-xs text-slate-500">{book?.author}</p>
                    {book?.shelves && <p className="text-xs text-slate-400 mt-1">📍 {book.shelves.name}</p>}
                  </td>
                  <td className="p-4 align-top text-xs text-slate-600 space-y-1">
                    <div className="flex gap-2">
                       <span className="w-16 text-slate-400">Borrowed:</span> 
                       <span className="font-medium text-slate-900">{t.borrowed_at ? format(new Date(t.borrowed_at), 'MMM d, yyyy') : '-'}</span>
                    </div>
                    {t.returned_at && (
                      <div className="flex gap-2">
                        <span className="w-16 text-slate-400">Returned:</span> 
                        <span className="font-medium text-slate-900">{format(new Date(t.returned_at), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    {statusEl}
                    {t.status === 'borrowed' && <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Due: {t.due_date}</p>}
                  </td>
                  <td className="p-4 text-right align-top">
                    {t.status === 'borrowed' ? (
                      <Button size="sm" variant="outline" className="bg-white border-slate-200 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => handleMarkReturned(t.id, t.book_id, t.borrower_id)}>
                        Mark Returned
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No action needed</span>
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
