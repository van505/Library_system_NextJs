'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import {
  ClipboardList, Send, Clock, CheckCircle, XCircle,
  BookOpen, BookMarked, RotateCcw, AlertTriangle,
} from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────
type Reservation = {
  id: string
  user_id: string
  book_id: string | null
  book_title: string
  author: string | null
  status: string
  created_at: string
  proposed_return_date?: string | null
  approved_return_date?: string | null
  return_date_edited?: boolean | null
  staff_note?: string | null
  books?: { title: string; author: string; cover_url?: string; shelves?: { name: string } } | null
}

type Transaction = {
  id: string
  book_id: string
  borrower_id: string
  status: string
  borrowed_at: string | null
  due_date: string | null
  returned_at: string | null
  created_at: string
  books?: { title: string; author: string; cover_url?: string; shelves?: { name: string } } | null
}

type AcqRequest = {
  id: string
  book_title: string
  author: string | null
  reason: string | null
  status: string
  created_at: string
}

const acqStatus: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending:  { label: 'Pending',  icon: Clock,       cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', icon: XCircle,     cls: 'bg-red-50 text-red-700 border-red-200' },
}

// ── Component ──────────────────────────────────────────────────────────────
export default function StudentRequestsPage() {
  const supabase = createClient()
  const { profile } = useAuthStore()

  // Pending reservations (from book_requests table, book_id not null)
  const [pending, setPending] = React.useState<Reservation[]>([])
  const [pendingLoading, setPendingLoading] = React.useState(true)

  // Active borrows (from transactions table, status='borrowed')
  const [active, setActive] = React.useState<Transaction[]>([])
  // Returned history (from transactions table, status='returned')
  const [returned, setReturned] = React.useState<Transaction[]>([])
  // Cancelled reservations
  const [cancelled, setCancelled] = React.useState<Reservation[]>([])
  const [txLoading, setTxLoading] = React.useState(true)

  // Acquisition requests (book_requests where book_id IS NULL)
  const [acqRequests, setAcqRequests] = React.useState<AcqRequest[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [acqTitle, setAcqTitle] = React.useState('')
  const [acqAuthor, setAcqAuthor] = React.useState('')
  const [acqReason, setAcqReason] = React.useState('')

  // ── Fetch pending reservations (book_requests with book_id) ─────────────
  async function fetchPending() {
    if (!profile) return
    setPendingLoading(true)
    const { data } = await supabase
      .from('book_requests')
      .select('*, books(title, author, cover_url, shelves(name))')
      .eq('user_id', profile.id)
      .not('book_id', 'is', null)
      .in('status', ['pending'])
      .order('created_at', { ascending: false })
    setPending((data ?? []) as Reservation[])
    setPendingLoading(false)
  }

  // ── Fetch cancelled reservations (book_requests cancelled/rejected) ─────
  async function fetchCancelled() {
    if (!profile) return
    const { data } = await supabase
      .from('book_requests')
      .select('*, books(title, author, cover_url, shelves(name))')
      .eq('user_id', profile.id)
      .not('book_id', 'is', null)
      .in('status', ['cancelled', 'rejected', 'approved'])
      .order('created_at', { ascending: false })
    setCancelled((data ?? []) as Reservation[])
  }

  // ── Fetch transactions (active + returned) ──────────────────────────────
  async function fetchTransactions() {
    if (!profile) return
    setTxLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, books(title, author, cover_url, shelves(name))')
      .eq('borrower_id', profile.id)
      .order('borrowed_at', { ascending: false })
    const allTx = (data ?? []) as Transaction[]
    setActive(allTx.filter(t => t.status === 'borrowed'))
    setReturned(allTx.filter(t => t.status === 'returned'))
    setTxLoading(false)
  }

  // ── Fetch acquisition requests (book_requests WITHOUT book_id) ──────────
  async function fetchAcqRequests() {
    if (!profile) return
    const { data } = await supabase
      .from('book_requests')
      .select('*')
      .eq('user_id', profile.id)
      .is('book_id', null)
      .order('created_at', { ascending: false })
    setAcqRequests(data ?? [])
  }

  async function loadAll() {
    await Promise.all([fetchPending(), fetchTransactions(), fetchCancelled(), fetchAcqRequests()])
  }

  React.useEffect(() => { loadAll() }, [profile])

  // ── Cancel a pending reservation ────────────────────────────────────────
  async function cancelReservation(reqId: string) {
    const { error } = await supabase
      .from('book_requests')
      .update({ status: 'cancelled' })
      .eq('id', reqId)
    if (!error) {
      toast.success('Reservation cancelled.')
      loadAll()
    } else {
      toast.error(error.message)
    }
  }

  // ── Submit acquisition request ──────────────────────────────────────────
  async function handleAcqSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!acqTitle.trim() || !profile) return
    setSubmitting(true)
    const { error } = await supabase.from('book_requests').insert({
      user_id: profile.id,
      book_id: null,
      book_title: acqTitle.trim(),
      author: acqAuthor.trim() || null,
      reason: acqReason.trim() || null,
      status: 'pending',
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Book acquisition request submitted!')
      setAcqTitle(''); setAcqAuthor(''); setAcqReason('')
      fetchAcqRequests()
    }
    setSubmitting(false)
  }

  // ── Shared empty state ──────────────────────────────────────────────────
  function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
      <div className="text-center py-14 bg-white rounded-2xl border border-slate-200">
        <Icon className="size-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">{label}</p>
        <p className="text-slate-400 text-sm mt-1">Nothing to show here yet.</p>
      </div>
    )
  }

  // ── Reservation card (from book_requests) ──────────────────────────────
  function ReservationCard({ r, onCancel }: { r: Reservation; onCancel?: () => void }) {
    const bk = r.books
    const hoursOld = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
    const isExpiringSoon = hoursOld > 36
    const isExpired = hoursOld > 48
    return (
      <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex gap-4">
          <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
            {bk?.cover_url ? (
              <img src={bk.cover_url} alt={bk.title} className="w-full h-full object-cover" />
            ) : <BookOpen className="size-6 text-slate-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{bk?.title ?? r.book_title}</p>
            <p className="text-xs text-slate-500 mb-2">{bk?.author ?? r.author}</p>
            {bk?.shelves?.name && <p className="text-xs text-slate-400 mb-2">📍 {bk.shelves.name}</p>}
            <p className="text-xs text-slate-400">Requested: {format(new Date(r.created_at), 'MMM d, yyyy')}</p>
            {/* Proposed return date */}
            {r.proposed_return_date && (
              <p className="text-xs text-indigo-600 font-medium mt-1">
                📅 Proposed return: {format(new Date(r.proposed_return_date + 'T00:00:00'), 'MMM d, yyyy')}
              </p>
            )}
            {/* Staff-adjusted return date */}
            {r.return_date_edited && r.approved_return_date && (
              <p className="text-xs text-amber-600 font-medium mt-0.5">
                ✏️ Staff adjusted to: {format(new Date(r.approved_return_date + 'T00:00:00'), 'MMM d, yyyy')}
              </p>
            )}
            {/* Staff note */}
            {r.staff_note && (
              <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                Staff note: {r.staff_note}
              </p>
            )}
            {r.status === 'pending' && (
              <p className={`text-xs mt-1 font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                {isExpired ? '⚠ May have expired — contact staff' : isExpiringSoon ? `⏰ Expiring soon (${Math.round(hoursOld)}h old)` : 'Awaiting staff approval'}
              </p>
            )}
            {r.status === 'approved' && <p className="text-xs text-emerald-600 font-semibold mt-1">✅ Approved — please collect from the library</p>}
            {r.status === 'cancelled' && <p className="text-xs text-slate-500 mt-1">Cancelled</p>}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            {r.status === 'pending' && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                <Clock className="size-3" /> Pending
              </Badge>
            )}
            {r.status === 'approved' && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <CheckCircle className="size-3" /> Approved
              </Badge>
            )}
            {(r.status === 'cancelled' || r.status === 'rejected') && (
              <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 flex items-center gap-1">
                <XCircle className="size-3" /> Cancelled
              </Badge>
            )}
            {onCancel && r.status === 'pending' && !isExpired && (
              <Button variant="outline" size="sm" onClick={onCancel}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Transaction card (from transactions table) ──────────────────────────
  function TxCard({ t }: { t: Transaction }) {
    const bk = t.books
    const isOverdue = t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
    const daysLeft = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : null
    return (
      <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex gap-4">
          <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
            {bk?.cover_url ? (
              <img src={bk.cover_url} alt={bk.title} className="w-full h-full object-cover" />
            ) : <BookOpen className="size-6 text-slate-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{bk?.title ?? 'Unknown Book'}</p>
            <p className="text-xs text-slate-500 mb-1">{bk?.author}</p>
            {bk?.shelves?.name && <p className="text-xs text-slate-400 mb-2">📍 {bk.shelves.name}</p>}
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {t.borrowed_at && <span>Borrowed: {format(new Date(t.borrowed_at), 'MMM d, yyyy')}</span>}
              {t.due_date && t.status === 'borrowed' && (
                <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                  · Due: {format(new Date(t.due_date), 'MMM d, yyyy')}
                  {isOverdue ? ' ⚠ OVERDUE' : daysLeft !== null ? ` (${daysLeft}d left)` : ''}
                </span>
              )}
              {t.returned_at && <span>· Returned: {format(new Date(t.returned_at), 'MMM d, yyyy')}</span>}
            </div>
          </div>
          <div className="shrink-0">
            {t.status === 'borrowed' && (
              <Badge variant="outline" className={isOverdue
                ? 'bg-red-50 text-red-700 border-red-200 flex items-center gap-1'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1'}>
                {isOverdue ? <AlertTriangle className="size-3" /> : <BookMarked className="size-3" />}
                {isOverdue ? 'Overdue' : 'Active'}
              </Badge>
            )}
            {t.status === 'returned' && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <CheckCircle className="size-3" /> Returned
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const historyItems = [...cancelled, ...returned.map(t => ({ ...t, _type: 'tx' }))]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Borrow Requests</h1>
        <p className="text-slate-500 text-sm mt-1">
          Track your reservations, active borrows, and history.
        </p>
      </div>

      {/* ── Borrow Tracking Tabs ─────────────────────────────────────────── */}
      <Tabs defaultValue="pending">
        <TabsList className="bg-slate-100 rounded-xl p-1 border border-slate-200 w-full sm:w-auto">
          <TabsTrigger value="pending" className="rounded-lg gap-1.5">
            <Clock className="size-3.5" /> Pending
            {pending.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 inline-flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg gap-1.5">
            <BookMarked className="size-3.5" /> Active
            {active.length > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 inline-flex items-center justify-center">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg gap-1.5">
            <RotateCcw className="size-3.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* Pending reservations — from book_requests */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : pending.length === 0 ? (
            <EmptyState icon={Clock} label="No pending reservations" />
          ) : (
            <>
              {pending.map(r => (
                <ReservationCard key={r.id} r={r} onCancel={() => cancelReservation(r.id)} />
              ))}
              <p className="text-xs text-slate-400 text-center px-4">
                💡 Your reservation is a soft hold. Staff will approve and notify you when ready.
              </p>
            </>
          )}
        </TabsContent>

        {/* Active borrows — from transactions */}
        <TabsContent value="active" className="mt-4 space-y-3">
          {txLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : active.length === 0 ? (
            <EmptyState icon={BookMarked} label="No books currently borrowed" />
          ) : active.map(t => <TxCard key={t.id} t={t} />)}
        </TabsContent>

        {/* History — returned transactions + cancelled reservations */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {txLoading && pendingLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : returned.length === 0 && cancelled.length === 0 ? (
            <EmptyState icon={RotateCcw} label="No borrow history yet" />
          ) : (
            <>
              {returned.map(t => <TxCard key={t.id} t={t} />)}
              {cancelled.map(r => <ReservationCard key={r.id} r={r} />)}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Book Acquisition Request ─────────────────────────────────────── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="size-4 text-indigo-600" />
            Can't find a book? Request an acquisition
          </CardTitle>
          <p className="text-xs text-slate-500">
            Ask the library to acquire a title not yet in the catalog.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleAcqSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="acq-title">Book Title <span className="text-red-500">*</span></Label>
                <Input id="acq-title" className="rounded-xl" placeholder="e.g. The Alchemist" required value={acqTitle} onChange={e => setAcqTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="acq-author">Author <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input id="acq-author" className="rounded-xl" placeholder="e.g. Paulo Coelho" value={acqAuthor} onChange={e => setAcqAuthor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="acq-reason">Reason <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Textarea id="acq-reason" className="rounded-xl resize-none" rows={2} placeholder="Class project, research..." value={acqReason} onChange={e => setAcqReason(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" disabled={submitting || !acqTitle.trim()}>
              <Send className="size-4" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>

          {/* Past acquisition requests */}
          {acqRequests.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Past Acquisition Requests</p>
              {acqRequests.map(req => {
                const cfg = acqStatus[req.status] ?? acqStatus.pending
                const Icon = cfg.icon
                return (
                  <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{req.book_title}</p>
                      {req.author && <p className="text-xs text-slate-500">by {req.author}</p>}
                    </div>
                    <Badge variant="outline" className={`${cfg.cls} shrink-0 flex items-center gap-1 text-xs`}>
                      <Icon className="size-3" /> {cfg.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
