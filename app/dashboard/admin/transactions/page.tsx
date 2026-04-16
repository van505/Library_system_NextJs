'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeftRight, Clock, CheckCircle, AlertTriangle, Archive, Trash2, Download } from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function AdminTransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState('all')

  const [archiveTarget, setArchiveTarget] = React.useState<{ id: string; label: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; bookId: string; status: string; label: string } | null>(null)

  async function loadTransactions() {
    setLoading(true)
    const { data } = await supabase.from('transactions')
      .select('*, books(title, author, shelves(name, location)), profiles!borrower_id(full_name, student_id, contact_number)')
      .eq('is_archived', false)
      .order('borrowed_at', { ascending: false })
    setTransactions(data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadTransactions() }, [supabase])

  async function handleArchive() {
    if (!archiveTarget) return
    await supabase.from('transactions').update({ is_archived: true }).eq('id', archiveTarget.id)
    toast.success('Archived.')
    setArchiveTarget(null); loadTransactions()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    if (deleteTarget.status === 'borrowed') {
      const { data: bk } = await supabase.from('books').select('available_copies, total_copies').eq('id', deleteTarget.bookId).single()
      if (bk) await supabase.from('books').update({ available_copies: Math.min(bk.available_copies + 1, bk.total_copies) }).eq('id', deleteTarget.bookId)
    }
    await supabase.from('transactions').delete().eq('id', deleteTarget.id)
    toast.success('Permanently deleted.')
    setDeleteTarget(null); loadTransactions()
  }

  function exportToCSV() {
    const rows = filtered
    const fmt = (d: string | null) => d ? format(new Date(d), 'yyyy-MM-dd HH:mm:ss') : ''
    const headers = ['Student Name', 'Student ID', 'Book Title', 'Author', 'Shelf', 'Status', 'Borrowed At', 'Due Date', 'Returned At']
    const csvRows = rows.map(t => {
      const p = t.profiles as any
      const b = t.books as any
      return [
        p?.full_name ?? '',
        p?.student_id ?? '',
        b?.title ?? '',
        b?.author ?? '',
        b?.shelves?.name ?? '',
        t.status,
        fmt(t.borrowed_at),
        fmt(t.due_date),
        fmt(t.returned_at),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} records to CSV.`)
  }

  const filtered = transactions.filter(t => {
    if (tab === 'all') return true
    if (tab === 'borrowed') return t.status === 'borrowed' && t.due_date && !isPast(new Date(t.due_date))
    if (tab === 'returned') return t.status === 'returned'
    if (tab === 'overdue') return t.status === 'borrowed' && t.due_date && isPast(new Date(t.due_date))
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaction Audit Log</h1>
          <p className="text-slate-500 text-sm mt-1">Complete transaction history and records. Use Borrow/Return to process active operations.</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2 rounded-xl border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300">
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-slate-100 rounded-xl p-1 mb-4 border border-slate-200">
          <TabsTrigger value="all" className="rounded-lg tabular-nums">All Records</TabsTrigger>
          <TabsTrigger value="borrowed" className="rounded-lg tabular-nums">Active</TabsTrigger>
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
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Admin Actions</th>
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
              else if (isOverdue) statusEl = <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50"><AlertTriangle className="size-3 mr-1"/> Overdue {Math.abs(daysDiff)}d</Badge>
              else if (daysDiff <= 3) statusEl = <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"><Clock className="size-3 mr-1"/> Due in {daysDiff}d</Badge>
              else statusEl = <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"><CheckCircle className="size-3 mr-1"/> {daysDiff}d left</Badge>

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
                    {t.due_date && (
                      <div className="flex gap-2">
                        <span className="w-16 text-slate-400">Due:</span>
                        <span className="font-medium text-slate-900">{format(new Date(t.due_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {t.returned_at && (
                      <div className="flex gap-2">
                        <span className="w-16 text-slate-400">Returned:</span>
                        <span className="font-medium text-slate-900">{format(new Date(t.returned_at), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">{statusEl}</td>
                  <td className="p-4 text-right align-top">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-50 gap-1" title="Archive" onClick={() => setArchiveTarget({ id: t.id, label: book?.title ?? 'record' })}>
                        <Archive className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 gap-1" title="Delete permanently" onClick={() => setDeleteTarget({ id: t.id, bookId: t.book_id, status: t.status, label: book?.title ?? 'record' })}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Archive Confirm */}
      <AlertDialog open={!!archiveTarget} onOpenChange={open => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this record?</AlertDialogTitle>
            <AlertDialogDescription>&ldquo;{archiveTarget?.label}&rdquo; will be moved to the archive and hidden from this view.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-amber-600 hover:bg-amber-700">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.label}&rdquo; will be <strong>permanently deleted</strong>. This cannot be undone. If the book was borrowed, inventory will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
