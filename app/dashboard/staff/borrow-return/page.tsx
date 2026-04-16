'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { notifyAdmins, notifyUser } from '@/lib/notifyAdmins'
import { toast } from 'sonner'
import {
  ArrowLeftRight, Clock, CheckCircle, AlertTriangle, Search, Plus,
  XCircle, CalendarCheck, Edit, Archive
} from 'lucide-react'
import { format, isPast, differenceInDays, addDays } from 'date-fns'
import { toInputDate, getMinReturnDate, getMaxReturnDate, validateReturnDate } from '@/lib/dateUtils'

export default function StaffTransactionsPage() {
  const supabase = createClient()
  const { profile: staffProfile } = useAuthStore()

  // ── Transactions (actual borrow/return records) ─────────────────────────
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [txLoading, setTxLoading] = React.useState(true)

  // ── Reservations (online requests from book_requests table) ─────────────
  const [reservations, setReservations] = React.useState<any[]>([])
  const [resLoading, setResLoading] = React.useState(true)

  const [tab, setTab] = React.useState('all')

  // ── Issue Book Modal ───────────────────────────────────────────────────
  const [isOpen, setIsOpen] = React.useState(false)
  const [studentSearch, setStudentSearch] = React.useState('')
  const [bookSearch, setBookSearch] = React.useState('')
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(null)
  const [selectedBook, setSelectedBook] = React.useState<any | null>(null)
  const [dueDate, setDueDate] = React.useState(toInputDate(addDays(new Date(), 14)))
  const [notes, setNotes] = React.useState('')
  const [borrowing, setBorrowing] = React.useState(false)
  const [studentResults, setStudentResults] = React.useState<any[]>([])
  const [bookResults, setBookResults] = React.useState<any[]>([])

  // ── Edit & Approve dialog ──────────────────────────────────────────────
  const [editApproveOpen, setEditApproveOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<any | null>(null)
  const [editDate, setEditDate] = React.useState('')
  const [editDateError, setEditDateError] = React.useState<string | null>(null)
  const [editNote, setEditNote] = React.useState('')
  const [editApproving, setEditApproving] = React.useState(false)

  // ── Decline dialog ─────────────────────────────────────────────────────
  const [declineOpen, setDeclineOpen] = React.useState(false)
  const [declineTarget, setDeclineTarget] = React.useState<any | null>(null)
  const [declineReason, setDeclineReason] = React.useState('')
  const [declining, setDeclining] = React.useState(false)

  // ── Archive confirm dialog ─────────────────────────────────────────────
  const [archiveTarget, setArchiveTarget] = React.useState<{ id: string; table: string; label: string } | null>(null)

  // ── Load Transactions ──────────────────────────────────────────────────
  async function loadTransactions() {
    setTxLoading(true)
    const { data } = await supabase.from('transactions')
      .select('*, books(title, author, shelves(name, location)), profiles!borrower_id(full_name, student_id, contact_number)')
      .eq('is_archived', false)
      .not('status', 'eq', 'pending')
      .order('borrowed_at', { ascending: false })
    setTransactions(data ?? [])
    setTxLoading(false)
  }

  // ── Load Reservations (from book_requests with book_id) ────────────────
  async function loadReservations() {
    setResLoading(true)
    const { data: reqs } = await supabase
      .from('book_requests')
      .select('*, books(title, author, shelves(name))')
      .eq('status', 'pending')
      .eq('is_archived', false)
      .not('book_id', 'is', null)
      .order('created_at', { ascending: false })

    if (!reqs || reqs.length === 0) { setReservations([]); setResLoading(false); return }

    const userIds = [...new Set(reqs.map((r: any) => r.user_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, student_id, contact_number')
      .in('id', userIds)
    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

    setReservations(reqs.map((r: any) => ({ ...r, profile: profileMap[r.user_id] ?? null })))
    setResLoading(false)
  }

  React.useEffect(() => { loadTransactions(); loadReservations() }, [supabase])

  // ── Student Search ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!studentSearch.trim()) { setStudentResults([]); return }
    supabase.from('profiles')
      .select('id, full_name, student_id, contact_number, role')
      .ilike('full_name', `%${studentSearch}%`)
      .limit(10)
      .then(res => setStudentResults(res.data ?? []))
  }, [studentSearch, supabase])

  React.useEffect(() => {
    if (!bookSearch.trim()) { setBookResults([]); return }
    supabase.from('books')
      .select('id, title, author, available_copies')
      .eq('is_archived', false)
      .gt('available_copies', 0)
      .ilike('title', `%${bookSearch}%`)
      .limit(8)
      .then(res => setBookResults(res.data ?? []))
  }, [bookSearch, supabase])

  function resetBorrow() {
    setSelectedStudent(null); setSelectedBook(null)
    setStudentSearch(''); setBookSearch('')
    setDueDate(toInputDate(addDays(new Date(), 14))); setNotes(''); setIsOpen(true)
  }

  // ── Physical Walk-in Issue ─────────────────────────────────────────────
  async function handleBorrowSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent || !selectedBook) { toast.error('Please select both a student and a book.'); return }
    setBorrowing(true)

    const { error: txError } = await supabase.from('transactions').insert({
      book_id: selectedBook.id,
      borrower_id: selectedStudent.id,
      status: 'borrowed',
      due_date: dueDate,
      notes: notes || null
    })

    if (!txError) {
      const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', selectedBook.id).single()
      if (bk && bk.available_copies > 0) {
        await supabase.from('books').update({ available_copies: Math.max(bk.available_copies - 1, 0) }).eq('id', selectedBook.id)
      }
      await notifyUser(
        selectedStudent.id,
        'Book Issued 📚',
        `"${selectedBook.title}" has been issued to you. Due: ${format(new Date(dueDate), 'MMM d, yyyy')}.`,
        'info', '/dashboard/student/requests'
      )
      await notifyAdmins(supabase,
        `${staffProfile?.full_name ?? 'Staff'} issued a book`,
        `Issued "${selectedBook.title}" to ${selectedStudent.full_name}.`,
        '/dashboard/admin/borrow-return'
      )
      toast.success('Book successfully issued!')
      setIsOpen(false)
      loadTransactions()
    } else toast.error(txError.message)

    setBorrowing(false)
  }

  // ── BUG 1 FIX: Safe return — LEAST(available + 1, total_copies) ────────
  async function handleMarkReturned(txId: string, bookId: string, studentId: string | null) {
    const { error: markErr } = await supabase.from('transactions')
      .update({ status: 'returned', returned_at: new Date().toISOString() })
      .eq('id', txId)
    if (!markErr) {
      const { data: bk } = await supabase.from('books')
        .select('available_copies, total_copies')
        .eq('id', bookId).single()
      if (bk) {
        await supabase.from('books')
          .update({ available_copies: Math.min(bk.available_copies + 1, bk.total_copies) })
          .eq('id', bookId)
      }
      if (studentId) {
        await notifyUser(
          studentId, 'Book Returned ✅',
          'Thank you! The book has been marked as returned.',
          'success', '/dashboard/student/requests'
        )
      }
      toast.success('Transaction marked as returned.')
      loadTransactions()
    } else toast.error(markErr.message)
  }

  // ── Approve (as-is, use proposed_return_date) ─────────────────────────
  async function handleApprove(r: any) {
    const bk = r.books as any
    const bookTitle = bk?.title ?? r.book_title
    const dueDateStr = r.proposed_return_date ?? toInputDate(addDays(new Date(), 14))

    const { error: reqErr } = await supabase.from('book_requests').update({ status: 'approved', approved_return_date: dueDateStr }).eq('id', r.id)
    if (reqErr) { toast.error(reqErr.message); return }

    const { error: txErr } = await supabase.from('transactions').insert({
      book_id: r.book_id,
      borrower_id: r.user_id,
      status: 'borrowed',
      borrowed_at: new Date().toISOString(),
      due_date: dueDateStr,
    })
    if (txErr) { toast.error(txErr.message); return }

    const { data: bkData } = await supabase.from('books').select('available_copies, total_copies').eq('id', r.book_id).single()
    if (bkData && bkData.available_copies > 0) {
      await supabase.from('books')
        .update({ available_copies: Math.max(bkData.available_copies - 1, 0) })
        .eq('id', r.book_id)
    }

    if (r.user_id) {
      await notifyUser(
        r.user_id, 'Reservation Approved ✅',
        `Your request for "${bookTitle}" has been approved! Due: ${format(new Date(dueDateStr + 'T00:00:00'), 'MMM d, yyyy')}. Please collect from the library.`,
        'success', '/dashboard/student/requests'
      )
    }

    const studentName = r.profile?.full_name ?? 'a student'
    await notifyAdmins(supabase,
      `${staffProfile?.full_name ?? 'Staff'} approved a reservation`,
      `Approved ${studentName}'s request for "${bookTitle}".`,
      '/dashboard/admin/borrow-return'
    )

    toast.success('Reservation approved — book issued!')
    loadReservations(); loadTransactions()
  }

  // ── Edit & Approve ─────────────────────────────────────────────────────
  function openEditApprove(r: any) {
    setEditTarget(r)
    setEditDate(r.proposed_return_date ?? toInputDate(getMinReturnDate()))
    setEditDateError(null)
    setEditNote('')
    setEditApproveOpen(true)
  }

  async function handleEditApprove() {
    const err = validateReturnDate(editDate)
    if (err) { setEditDateError(err); return }
    if (!editTarget) return
    setEditApproving(true)

    const bk = editTarget.books as any
    const bookTitle = bk?.title ?? editTarget.book_title

    const { error: reqErr } = await supabase.from('book_requests').update({
      status: 'approved',
      approved_return_date: editDate,
      return_date_edited: true,
      staff_note: editNote || null,
    }).eq('id', editTarget.id)
    if (reqErr) { toast.error(reqErr.message); setEditApproving(false); return }

    const { error: txErr } = await supabase.from('transactions').insert({
      book_id: editTarget.book_id,
      borrower_id: editTarget.user_id,
      status: 'borrowed',
      borrowed_at: new Date().toISOString(),
      due_date: editDate,
    })
    if (txErr) { toast.error(txErr.message); setEditApproving(false); return }

    const { data: bkData } = await supabase.from('books').select('available_copies, total_copies').eq('id', editTarget.book_id).single()
    if (bkData && bkData.available_copies > 0) {
      await supabase.from('books')
        .update({ available_copies: Math.max(bkData.available_copies - 1, 0) })
        .eq('id', editTarget.book_id)
    }

    if (editTarget.user_id) {
      await notifyUser(
        editTarget.user_id, 'Reservation Approved ✅',
        `Your request for "${bookTitle}" was approved. Note: Return date adjusted to ${format(new Date(editDate + 'T00:00:00'), 'MMM d, yyyy')}.${editNote ? ` Staff note: ${editNote}` : ''}`,
        'success', '/dashboard/student/requests'
      )
    }

    const studentName = editTarget.profile?.full_name ?? 'a student'
    await notifyAdmins(supabase,
      `${staffProfile?.full_name ?? 'Staff'} approved a reservation (date adjusted)`,
      `Approved ${studentName}'s request for "${bookTitle}" with adjusted return date.`,
      '/dashboard/admin/borrow-return'
    )

    toast.success('Reservation approved with adjusted date!')
    setEditApproveOpen(false)
    loadReservations(); loadTransactions()
    setEditApproving(false)
  }

  // ── Decline ────────────────────────────────────────────────────────────
  function openDecline(r: any) {
    setDeclineTarget(r)
    setDeclineReason('')
    setDeclineOpen(true)
  }

  async function handleDecline() {
    if (!declineTarget) return
    setDeclining(true)

    const bk = declineTarget.books as any
    const bookTitle = bk?.title ?? declineTarget.book_title

    const { error } = await supabase.from('book_requests').update({ status: 'rejected' }).eq('id', declineTarget.id)
    if (!error) {
      if (declineTarget.user_id) {
        await notifyUser(
          declineTarget.user_id, 'Reservation Declined ❌',
          `Your request for "${bookTitle}" could not be approved at this time.${declineReason ? ` Reason: ${declineReason}` : ''}`,
          'danger', '/dashboard/student/requests'
        )
      }

      const studentName = declineTarget.profile?.full_name ?? 'a student'
      await notifyAdmins(supabase,
        `${staffProfile?.full_name ?? 'Staff'} declined a reservation`,
        `Declined ${studentName}'s request for "${bookTitle}".${declineReason ? ` Reason: ${declineReason}` : ''}`,
        '/dashboard/admin/borrow-return'
      )

      toast.success('Reservation declined.')
      setDeclineOpen(false)
      loadReservations()
    } else toast.error(error.message)
    setDeclining(false)
  }

  // ── Archive ────────────────────────────────────────────────────────────
  async function handleArchive() {
    if (!archiveTarget) return
    await supabase.from(archiveTarget.table as any).update({ is_archived: true }).eq('id', archiveTarget.id)
    toast.success(`"${archiveTarget.label}" archived.`)
    setArchiveTarget(null)
    loadTransactions(); loadReservations()
  }

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = transactions.filter(t => {
    if (tab === 'all') return true
    if (tab === 'borrowed') return t.status === 'borrowed' && !isPast(new Date(t.due_date ?? '9999-12-31'))
    if (tab === 'returned') return t.status === 'returned'
    if (tab === 'overdue') return t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
    return false
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">Track all borrowing, returns, and online reservations.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" onClick={resetBorrow}>
              <Plus className="size-4" /> Issue Book (Walk-in)
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Issue Book to Student</DialogTitle></DialogHeader>
            <DialogDescription className="sr-only">Issue book dialog</DialogDescription>
            <form onSubmit={handleBorrowSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Student Search</Label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-sm">
                    <div><b>{selectedStudent.full_name}</b>{selectedStudent.student_id && <span className="opacity-70 ml-1">(ID: {selectedStudent.student_id})</span>}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input autoComplete="off" className="pl-9 rounded-xl" placeholder="Type any part of name..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                    </div>
                    {studentSearch.trim() && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        {studentResults.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-3">No match for &ldquo;{studentSearch}&rdquo;</p>
                        ) : studentResults.map(s => (
                          <div key={s.id} className="p-2.5 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0" onClick={() => { setSelectedStudent(s); setStudentSearch('') }}>
                            <span className="font-medium text-slate-800">{s.full_name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${s.role === 'student' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Book Search</Label>
                {selectedBook ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-sm">
                    <div><b>{selectedBook.title}</b> <span className="opacity-70">({selectedBook.author})</span></div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBook(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input autoComplete="off" className="pl-9 rounded-xl" placeholder="Type title... (available only)" value={bookSearch} onChange={e => setBookSearch(e.target.value)} />
                    </div>
                    {bookSearch.trim() && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        {bookResults.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-3">No available books matching &ldquo;{bookSearch}&rdquo;</p>
                        ) : bookResults.map(b => (
                          <div key={b.id} className="p-2.5 text-sm hover:bg-indigo-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0" onClick={() => { setSelectedBook(b); setBookSearch('') }}>
                            <span className="font-medium text-slate-800">{b.title} <span className="text-slate-500 font-normal">by {b.author}</span></span>
                            <span className="text-emerald-600 bg-emerald-50 text-xs px-2 py-0.5 rounded">{b.available_copies} avail</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <input type="date" required
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  min={toInputDate(getMinReturnDate())} max={toInputDate(getMaxReturnDate())}
                  value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl resize-none" rows={2} />
              </div>

              <Button type="submit" disabled={borrowing || !selectedStudent || !selectedBook} className="w-full bg-indigo-600 text-white rounded-xl">
                {borrowing ? 'Processing...' : 'Confirm Issuance'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-slate-100 rounded-xl p-1 mb-4 border border-slate-200 flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="rounded-lg">All Records</TabsTrigger>
          <TabsTrigger value="reservations" className="rounded-lg text-amber-700 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800">
            Online Reservations
            {reservations.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">{reservations.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="borrowed" className="rounded-lg">Active Borrowed</TabsTrigger>
          <TabsTrigger value="returned" className="rounded-lg">Returned</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-lg text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">Overdue</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Reservations Table (book_requests) ── */}
      {tab === 'reservations' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-amber-50 text-amber-800 border-b border-amber-100">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">Book Requested</th>
                <th className="p-4 font-semibold">Proposed Return</th>
                <th className="p-4 font-semibold">Requested</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto" /></td></tr>
              ) : reservations.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500">
                  <Clock className="size-10 text-slate-300 mx-auto mb-3" /> No pending reservations.
                </td></tr>
              ) : reservations.map(r => {
                const bk = r.books as any
                const p = r.profile as any
                const hoursOld = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
                return (
                  <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-4 align-top">
                      <p className="font-bold text-slate-900">{p?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{p?.student_id || ''}</p>
                    </td>
                    <td className="p-4 align-top">
                      <p className="font-semibold text-slate-900">{bk?.title ?? r.book_title}</p>
                      <p className="text-xs text-slate-500">{bk?.author ?? r.author}</p>
                      {bk?.shelves && <p className="text-xs text-slate-400 mt-1">📍 {bk.shelves.name}</p>}
                    </td>
                    <td className="p-4 align-top text-sm">
                      {r.proposed_return_date ? (
                        <span className="font-medium text-indigo-700">
                          {format(new Date(r.proposed_return_date + 'T00:00:00'), 'MMM d, yyyy')}
                        </span>
                      ) : <span className="text-slate-400 text-xs italic">Not specified</span>}
                    </td>
                    <td className="p-4 align-top text-xs text-slate-500 space-y-0.5">
                      <p>{format(new Date(r.created_at), 'MMM d, h:mm a')}</p>
                      <p className={hoursOld > 24 ? 'text-red-500 font-semibold' : 'text-slate-400'}>
                        {hoursOld > 24 ? `⚠ ${Math.floor(hoursOld)}h ago` : `${Math.round(hoursOld)}h ago`}
                      </p>
                    </td>
                    <td className="p-4 text-right align-top space-y-1.5">
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white w-full gap-1"
                        onClick={() => handleApprove(r)}>
                        <CheckCircle className="size-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 w-full gap-1"
                        onClick={() => openEditApprove(r)}>
                        <Edit className="size-3" /> Edit &amp; Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 w-full gap-1"
                        onClick={() => openDecline(r)}>
                        <XCircle className="size-3" /> Decline
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Transactions Table ── */
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
              {txLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500">
                  <ArrowLeftRight className="size-10 text-slate-300 mx-auto mb-3" /> No transactions found for this filter.
                </td></tr>
              ) : filtered.map(t => {
                const book = t.books as any
                const p = t.profiles as any
                const isOverdue = t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
                const daysDiff = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : 0

                let statusEl = <span className="text-slate-500">-</span>
                if (t.status === 'returned') statusEl = <Badge className="bg-slate-100 text-slate-600 border-transparent hover:bg-slate-100">Returned</Badge>
                else if (isOverdue) statusEl = <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50"><AlertTriangle className="size-3 mr-1" /> Overdue by {Math.abs(daysDiff)} days</Badge>
                else if (daysDiff <= 3) statusEl = <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"><Clock className="size-3 mr-1" /> Due in {daysDiff} days</Badge>
                else statusEl = <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"><CheckCircle className="size-3 mr-1" /> {daysDiff} days left</Badge>

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
                    <td className="p-4 text-right align-top space-y-1.5">
                      {t.status === 'borrowed' && (
                        <Button size="sm" variant="outline" className="bg-white border-slate-200 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 w-full"
                          onClick={() => handleMarkReturned(t.id, t.book_id, t.borrower_id)}>
                          Mark Returned
                        </Button>
                      )}
                      {t.status === 'returned' && (
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 w-full gap-1"
                          onClick={() => setArchiveTarget({ id: t.id, table: 'transactions', label: book?.title ?? 'record' })}>
                          <Archive className="size-3" /> Archive
                        </Button>
                      )}
                      {t.status !== 'borrowed' && t.status !== 'returned' && (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit & Approve Dialog ── */}
      <Dialog open={editApproveOpen} onOpenChange={setEditApproveOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-amber-600" /> Edit &amp; Approve
            </DialogTitle>
            <DialogDescription>Adjust the return date for this reservation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {editTarget?.proposed_return_date && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm text-slate-600">
                Student proposed: <strong className="text-indigo-700">
                  {format(new Date(editTarget.proposed_return_date + 'T00:00:00'), 'MMM d, yyyy')}
                </strong>
              </div>
            )}
            <div className="space-y-2">
              <Label>New Return Date</Label>
              <input type="date"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                min={toInputDate(getMinReturnDate())} max={toInputDate(getMaxReturnDate())}
                value={editDate}
                onChange={e => { setEditDate(e.target.value); setEditDateError(validateReturnDate(e.target.value)) }} />
              <p className="text-xs text-slate-500">Max 15 days. Weekends not allowed.</p>
              {editDateError && <p className="text-xs text-red-600 font-medium">{editDateError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Note to Student (Optional)</Label>
              <Textarea className="rounded-xl resize-none" rows={2} placeholder="e.g. Due to high demand, adjusted to a shorter period."
                value={editNote} onChange={e => setEditNote(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditApproveOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleEditApprove}
                disabled={editApproving || !!editDateError || !editDate}>
                {editApproving ? 'Approving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Decline Dialog ── */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" /> Decline Reservation
            </DialogTitle>
            <DialogDescription>
              Declining &ldquo;{(declineTarget?.books as any)?.title ?? declineTarget?.book_title}&rdquo; for {declineTarget?.profile?.full_name ?? 'student'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea className="rounded-xl resize-none" rows={3} placeholder="e.g. Book already reserved by another student..."
                value={declineReason} onChange={e => setDeclineReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeclineOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDecline} disabled={declining}>
                {declining ? 'Declining...' : 'Decline Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Archive Confirm Dialog ── */}
      <AlertDialog open={!!archiveTarget} onOpenChange={open => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this record?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{archiveTarget?.label}&rdquo; will be moved to the archive. It can be restored later from the Archive page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-amber-600 hover:bg-amber-700">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
