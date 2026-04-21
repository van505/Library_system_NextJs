'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
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
import { notifyUser } from '@/lib/notifyAdmins'
import { toast } from 'sonner'
import { ReturnDialog } from '@/components/dashboard/return-dialog'
import { ArrowLeftRight, Clock, CheckCircle, AlertTriangle, Search, Plus, XCircle, CalendarCheck, Edit, Archive, Trash2 } from 'lucide-react'
import { format, isPast, differenceInDays, addDays } from 'date-fns'
import { toInputDate, getMinReturnDate, getMaxReturnDate, validateReturnDate } from '@/lib/dateUtils'

export default function AdminBorrowReturnPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [txLoading, setTxLoading] = React.useState(true)
  const [reservations, setReservations] = React.useState<any[]>([])
  const [resLoading, setResLoading] = React.useState(true)
  const [tab, setTab] = React.useState('all')

  const [isOpen, setIsOpen] = React.useState(false)
  const [studentSearch, setStudentSearch] = React.useState('')
  const [bookSearch, setBookSearch] = React.useState('')
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null)
  const [selectedBook, setSelectedBook] = React.useState<any>(null)
  const [dueDate, setDueDate] = React.useState(toInputDate(getMinReturnDate()))
  const [dueDateError, setDueDateError] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState('')
  const [borrowing, setBorrowing] = React.useState(false)
  const [studentResults, setStudentResults] = React.useState<any[]>([])
  const [bookResults, setBookResults] = React.useState<any[]>([])

  // Edit & Approve
  const [editApproveOpen, setEditApproveOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<any>(null)
  const [editDate, setEditDate] = React.useState('')
  const [editDateError, setEditDateError] = React.useState<string | null>(null)
  const [editNote, setEditNote] = React.useState('')
  const [editApproving, setEditApproving] = React.useState(false)

  // Decline
  const [declineOpen, setDeclineOpen] = React.useState(false)
  const [declineTarget, setDeclineTarget] = React.useState<any>(null)
  const [declineReason, setDeclineReason] = React.useState('')

  // Archive / Delete (admin-only)
  const [archiveTarget, setArchiveTarget] = React.useState<{ id: string; table: string; label: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; table: string; bookId?: string; status?: string; label: string } | null>(null)

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false)
  const [returnTarget, setReturnTarget] = React.useState<{ txId: string; bookId: string; studentId: string | null; bookTitle: string } | null>(null)

  async function loadTransactions() {
    setTxLoading(true)
    const { data } = await supabase.from('transactions')
      .select('*, books(title, author, shelves(name, location)), profiles!borrower_id(full_name, student_id, contact_number)')
      .eq('is_archived', false)
      .order('borrowed_at', { ascending: false })
    setTransactions(data ?? [])
    setTxLoading(false)
  }

  async function loadReservations() {
    setResLoading(true)
    const { data: reqs } = await supabase.from('book_requests')
      .select('*, books(title, author, shelves(name))')
      .eq('status', 'pending').eq('is_archived', false)
      .not('book_id', 'is', null)
      .order('created_at', { ascending: false })

    if (!reqs || reqs.length === 0) { setReservations([]); setResLoading(false); return }
    const userIds = [...new Set(reqs.map((r: any) => r.user_id).filter(Boolean))]
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, student_id, email').in('id', userIds)
    const pm = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))
    setReservations(reqs.map((r: any) => ({ ...r, profile: pm[r.user_id] ?? null })))
    setResLoading(false)
  }

  React.useEffect(() => { loadTransactions(); loadReservations() }, [supabase])

  React.useEffect(() => {
    if (!studentSearch.trim()) { setStudentResults([]); return }
    supabase.from('profiles').select('id, full_name, student_id, role').ilike('full_name', `%${studentSearch}%`).limit(10).then(res => setStudentResults(res.data ?? []))
  }, [studentSearch, supabase])

  React.useEffect(() => {
    if (!bookSearch.trim()) { setBookResults([]); return }
    supabase.from('books').select('id, title, author, available_copies').eq('is_archived', false).gt('available_copies', 0).ilike('title', `%${bookSearch}%`).limit(8).then(res => setBookResults(res.data ?? []))
  }, [bookSearch, supabase])

  async function handleBorrowSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent || !selectedBook) { toast.error('Select student and book first.'); return }
    const err = validateReturnDate(dueDate)
    if (err) { setDueDateError(err); return }
    setBorrowing(true)
    const { error } = await supabase.from('transactions').insert({ book_id: selectedBook.id, borrower_id: selectedStudent.id, status: 'borrowed', due_date: dueDate, notes: notes || null })
    if (!error) {
      const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', selectedBook.id).single()
      if (bk && bk.available_copies > 0) await supabase.from('books').update({ available_copies: Math.max(bk.available_copies - 1, 0) }).eq('id', selectedBook.id)
      await notifyUser(selectedStudent.id, 'Book Issued 📚', `"${selectedBook.title}" issued. Due: ${format(new Date(dueDate), 'MMM d, yyyy')}.`, 'info', '/dashboard/student/requests')
      toast.success('Book issued!'); setIsOpen(false); loadTransactions()
    } else toast.error(error.message)
    setBorrowing(false)
  }

  // handleMarkReturned logic replaced by <ReturnDialog /> component

  async function handleApprove(r: any) {
    const bookTitle = (r.books as any)?.title ?? r.book_title
    const due = r.proposed_return_date ?? toInputDate(addDays(new Date(), 14))
    const { error: re } = await supabase.from('book_requests').update({ status: 'approved', approved_return_date: due }).eq('id', r.id)
    if (re) { toast.error(re.message); return }
    const { error: te } = await supabase.from('transactions').insert({ book_id: r.book_id, borrower_id: r.user_id, status: 'borrowed', borrowed_at: new Date().toISOString(), due_date: due })
    if (te) { toast.error(te.message); return }
    const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', r.book_id).single()
    if (bk && bk.available_copies > 0) await supabase.from('books').update({ available_copies: Math.max(bk.available_copies - 1, 0) }).eq('id', r.book_id)
    if (r.user_id) await notifyUser(r.user_id, 'Reservation Approved ✅', `"${bookTitle}" approved! Due: ${format(new Date(due + 'T00:00:00'), 'MMM d, yyyy')}.`, 'success', '/dashboard/student/requests')
    toast.success('Approved!'); loadReservations(); loadTransactions()
  }

  async function handleEditApprove() {
    const err = validateReturnDate(editDate)
    if (err) { setEditDateError(err); return }
    if (!editTarget) return
    setEditApproving(true)
    const bookTitle = (editTarget.books as any)?.title ?? editTarget.book_title
    await supabase.from('book_requests').update({ status: 'approved', approved_return_date: editDate, return_date_edited: true, staff_note: editNote || null }).eq('id', editTarget.id)
    await supabase.from('transactions').insert({ book_id: editTarget.book_id, borrower_id: editTarget.user_id, status: 'borrowed', borrowed_at: new Date().toISOString(), due_date: editDate })
    const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', editTarget.book_id).single()
    if (bk && bk.available_copies > 0) await supabase.from('books').update({ available_copies: Math.max(bk.available_copies - 1, 0) }).eq('id', editTarget.book_id)
    if (editTarget.user_id) await notifyUser(editTarget.user_id, 'Reservation Approved ✅', `"${bookTitle}" approved with adjusted return: ${format(new Date(editDate + 'T00:00:00'), 'MMM d, yyyy')}.${editNote ? ` Note: ${editNote}` : ''}`, 'success', '/dashboard/student/requests')
    toast.success('Approved with adjusted date!'); setEditApproveOpen(false); loadReservations(); loadTransactions(); setEditApproving(false)
  }

  async function handleDecline() {
    if (!declineTarget) return
    const bookTitle = (declineTarget.books as any)?.title ?? declineTarget.book_title
    await supabase.from('book_requests').update({ status: 'rejected' }).eq('id', declineTarget.id)
    if (declineTarget.user_id) await notifyUser(declineTarget.user_id, 'Reservation Declined', `"${bookTitle}" declined.${declineReason ? ` Reason: ${declineReason}` : ''}`, 'warning', '/dashboard/student/requests')
    toast.success('Declined.'); setDeclineOpen(false); loadReservations()
  }

  async function handleArchive() {
    if (!archiveTarget) return
    await supabase.from(archiveTarget.table as any).update({ is_archived: true }).eq('id', archiveTarget.id)
    toast.success('Archived.'); setArchiveTarget(null); loadTransactions(); loadReservations()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    if (deleteTarget.status === 'borrowed' && deleteTarget.bookId) {
      const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', deleteTarget.bookId).single()
      if (bk) await supabase.from('books').update({ available_copies: Math.min(bk.available_copies + 1, bk.total_copies) }).eq('id', deleteTarget.bookId)
    }
    await supabase.from(deleteTarget.table as any).delete().eq('id', deleteTarget.id)
    toast.success('Permanently deleted.'); setDeleteTarget(null); loadTransactions(); loadReservations()
  }

  const filtered = transactions.filter(t => {
    if (tab === 'all') return true
    if (tab === 'borrowed') return t.status === 'borrowed' && !isPast(new Date(t.due_date ?? '9999'))
    if (tab === 'returned') return t.status === 'returned'
    if (tab === 'overdue') return t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
    return false
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Borrow / Return (Admin)</h1>
          <p className="text-slate-500 text-sm mt-1">Issue books, manage reservations, and handle returns. Admin can delete records.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 transition-transform hover:-translate-y-0.5"><Plus className="size-4" /> Issue Book</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Issue Book to Student</DialogTitle></DialogHeader>
            <DialogDescription className="sr-only">Issue book dialog</DialogDescription>
            <form onSubmit={handleBorrowSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Student</Label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-sm text-emerald-800">
                    <b>{selectedStudent.full_name}</b>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" /><Input autoComplete="off" className="pl-9 rounded-xl" placeholder="Search student name..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} /></div>
                    {studentSearch.trim() && <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">{studentResults.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">No results</p> : studentResults.map(s => <div key={s.id} className="p-2.5 text-sm hover:bg-primary/5 cursor-pointer border-b border-slate-100 last:border-0" onClick={() => { setSelectedStudent(s); setStudentSearch('') }}>{s.full_name} <span className="text-xs text-slate-400">({s.student_id})</span></div>)}</div>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Book</Label>
                {selectedBook ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-sm text-emerald-800">
                    <b>{selectedBook.title}</b>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBook(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" /><Input autoComplete="off" className="pl-9 rounded-xl" placeholder="Search book title..." value={bookSearch} onChange={e => setBookSearch(e.target.value)} /></div>
                    {bookSearch.trim() && <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">{bookResults.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">No available books</p> : bookResults.map(b => <div key={b.id} className="p-2.5 text-sm hover:bg-primary/5 cursor-pointer border-b border-slate-100 last:border-0" onClick={() => { setSelectedBook(b); setBookSearch('') }}>{b.title} <span className="text-emerald-600 text-xs">({b.available_copies} avail)</span></div>)}</div>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <input
                  type="date"
                  required
                  className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white transition-colors ${
                    dueDateError
                      ? 'border-red-400 focus:ring-red-400 bg-red-50'
                      : 'border-slate-200 focus:ring-primary'
                  }`}
                  min={toInputDate(getMinReturnDate())}
                  max={toInputDate(getMaxReturnDate())}
                  value={dueDate}
                  onChange={e => {
                    setDueDate(e.target.value)
                    setDueDateError(validateReturnDate(e.target.value))
                  }}
                />
                {dueDateError && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    {dueDateError}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">Saturdays and Sundays are not allowed as return dates.</p>
              </div>
              <div className="space-y-2"><Label>Notes (Optional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl resize-none" rows={2} /></div>
              <Button type="submit" disabled={borrowing || !selectedStudent || !selectedBook || !!dueDateError} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-transform hover:-translate-y-0.5">{borrowing ? 'Processing...' : 'Confirm Issuance'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100 rounded-xl p-1 mb-4 border border-slate-200 flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="rounded-lg">All Records</TabsTrigger>
          <TabsTrigger value="reservations" className="rounded-lg text-amber-700 data-[state=active]:bg-amber-50">
            Reservations {reservations.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">{reservations.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="borrowed" className="rounded-lg">Active</TabsTrigger>
          <TabsTrigger value="returned" className="rounded-lg">Returned</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-lg text-red-600">Overdue</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'reservations' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-amber-50 text-amber-800 border-b border-amber-100">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">Book</th>
                <th className="p-4 font-semibold">Proposed Return</th>
                <th className="p-4 font-semibold">Age</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resLoading ? <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto" /></td></tr>
                : reservations.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-slate-500">No pending reservations.</td></tr>
                : reservations.map(r => {
                  const bk = r.books as any; const p = r.profile as any
                  const hoursOld = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
                  return (
                    <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 align-top"><p className="font-bold text-slate-900">{p?.full_name || 'Unknown'}</p><p className="text-xs text-slate-500">{p?.student_id}</p></td>
                      <td className="p-4 align-top"><p className="font-semibold text-slate-900">{bk?.title ?? r.book_title}</p><p className="text-xs text-slate-500">{bk?.author ?? r.author}</p></td>
                      <td className="p-4 align-top text-sm">{r.proposed_return_date ? <span className="font-medium text-primary">{format(new Date(r.proposed_return_date + 'T00:00:00'), 'MMM d, yyyy')}</span> : <span className="text-slate-400 italic text-xs">Not specified</span>}</td>
                      <td className="p-4 align-top text-xs text-slate-500">{Math.round(hoursOld)}h ago</td>
                      <td className="p-4 text-right align-top space-y-1.5">
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white w-full gap-1" onClick={() => handleApprove(r)}><CheckCircle className="size-3" /> Approve</Button>
                        <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 w-full gap-1" onClick={() => { setEditTarget(r); setEditDate(r.proposed_return_date ?? toInputDate(getMinReturnDate())); setEditDateError(null); setEditNote(''); setEditApproveOpen(true) }}><Edit className="size-3" /> Edit &amp; Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 w-full gap-1" onClick={() => { setDeclineTarget(r); setDeclineReason(''); setDeclineOpen(true) }}><XCircle className="size-3" /> Decline</Button>
                        {/* Admin-only: Delete */}
                        <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 w-full gap-1" onClick={() => setDeleteTarget({ id: r.id, table: 'book_requests', label: bk?.title ?? r.book_title })}><Trash2 className="size-3" /> Delete</Button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border text-sm border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">Book</th>
                <th className="p-4 font-semibold">Timeline</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txLoading ? <tr><td colSpan={5} className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-slate-500"><ArrowLeftRight className="size-10 text-slate-300 mx-auto mb-3" /> No transactions found.</td></tr>
                : filtered.map(t => {
                  const book = t.books as any; const p = t.profiles as any
                  const isOverdue = t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
                  const daysDiff = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : 0
                  let statusEl = <span />
                  if (t.status === 'returned') statusEl = <Badge className="bg-slate-100 text-slate-600 border-transparent">Returned</Badge>
                  else if (isOverdue) statusEl = <Badge className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="size-3 mr-1" />Overdue {Math.abs(daysDiff)}d</Badge>
                  else if (daysDiff <= 3) statusEl = <Badge className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="size-3 mr-1" />Due in {daysDiff}d</Badge>
                  else statusEl = <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle className="size-3 mr-1" />{daysDiff}d left</Badge>

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 align-top"><p className="font-bold text-slate-900">{p?.full_name || 'Unknown'}</p><p className="text-xs text-slate-500">{p?.student_id || '-'}</p></td>
                      <td className="p-4 align-top"><p className="font-semibold text-slate-900">{book?.title}</p><p className="text-xs text-slate-500">{book?.author}</p></td>
                      <td className="p-4 align-top text-xs text-slate-600">
                        <div className="space-y-1">
                          <div className="flex gap-2"><span className="text-slate-400">Borrowed:</span>{t.borrowed_at ? format(new Date(t.borrowed_at), 'MMM d, yyyy') : '-'}</div>
                          {t.returned_at && <div className="flex gap-2"><span className="text-slate-400">Returned:</span>{format(new Date(t.returned_at), 'MMM d, yyyy')}</div>}
                        </div>
                      </td>
                      <td className="p-4 align-top">{statusEl}</td>
                      <td className="p-4 text-right align-top space-y-1.5">
                        {t.status === 'borrowed' && <Button size="sm" variant="outline" className="w-full bg-white border-slate-200 text-slate-700 hover:bg-primary/5 hover:text-primary" onClick={() => { setReturnTarget({ txId: t.id, bookId: t.book_id, studentId: t.borrower_id, bookTitle: book?.title ?? 'a book' }); setReturnDialogOpen(true) }}>Mark Returned</Button>}
                        {/* Archive & Delete (admin-only) */}
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-50" onClick={() => setArchiveTarget({ id: t.id, table: 'transactions', label: book?.title ?? 'record' })}><Archive className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget({ id: t.id, table: 'transactions', bookId: t.book_id, status: t.status, label: book?.title ?? 'record' })}><Trash2 className="size-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit & Approve Dialog */}
      <Dialog open={editApproveOpen} onOpenChange={setEditApproveOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarCheck className="size-5 text-amber-600" /> Edit &amp; Approve</DialogTitle><DialogDescription>Adjust return date.</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-1">
            {editTarget?.proposed_return_date && <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm text-slate-600">Student proposed: <strong className="text-primary">{format(new Date(editTarget.proposed_return_date + 'T00:00:00'), 'MMM d, yyyy')}</strong></div>}
            <div className="space-y-2"><Label>New Return Date</Label><input type="date" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white" min={toInputDate(getMinReturnDate())} max={toInputDate(getMaxReturnDate())} value={editDate} onChange={e => { setEditDate(e.target.value); setEditDateError(validateReturnDate(e.target.value)) }} />{editDateError && <p className="text-xs text-red-600">{editDateError}</p>}</div>
            <div className="space-y-2"><Label>Note to Student (Optional)</Label><Textarea className="rounded-xl resize-none" rows={2} value={editNote} onChange={e => setEditNote(e.target.value)} /></div>
            <div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditApproveOpen(false)}>Cancel</Button><Button className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={handleEditApprove} disabled={editApproving || !!editDateError}>{editApproving ? 'Approving...' : 'Confirm'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><XCircle className="size-5" /> Decline</DialogTitle><DialogDescription>Decline reservation for &ldquo;{(declineTarget?.books as any)?.title ?? declineTarget?.book_title}&rdquo;</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2"><Label>Reason (Optional)</Label><Textarea className="rounded-xl resize-none" rows={2} value={declineReason} onChange={e => setDeclineReason(e.target.value)} /></div>
            <div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeclineOpen(false)}>Cancel</Button><Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleDecline}>Decline</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm */}
      <AlertDialog open={!!archiveTarget} onOpenChange={open => !open && setArchiveTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive this record?</AlertDialogTitle><AlertDialogDescription>&ldquo;{archiveTarget?.label}&rdquo; can be restored from the Archive page.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleArchive} className="bg-amber-600 hover:bg-amber-700">Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-red-600">Permanently delete?</AlertDialogTitle><AlertDialogDescription>&ldquo;{deleteTarget?.label}&rdquo; will be <strong>permanently deleted</strong>. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Return Dialog */}
      <ReturnDialog 
        open={returnDialogOpen} 
        onOpenChange={setReturnDialogOpen} 
        transactionId={returnTarget?.txId ?? null}
        bookId={returnTarget?.bookId ?? null}
        studentId={returnTarget?.studentId ?? null}
        bookTitle={returnTarget?.bookTitle ?? ''}
        onSuccess={() => loadTransactions()}
      />
    </div>
  )
}
