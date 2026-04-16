'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Archive, RotateCcw, ArrowLeftRight, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'

export default function StaffArchivePage() {
  const supabase = createClient()
  const [tab, setTab] = React.useState('transactions')
  const [loading, setLoading] = React.useState(true)
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [requests, setRequests] = React.useState<any[]>([])
  const [restoreTarget, setRestoreTarget] = React.useState<{ id: string; table: string; label: string } | null>(null)

  async function loadAll() {
    setLoading(true)
    const [tRes, rRes] = await Promise.all([
      supabase.from('transactions')
        .select('*, books(title, author), profiles!borrower_id(full_name, student_id)')
        .eq('is_archived', true).order('borrowed_at', { ascending: false }),
      supabase.from('book_requests')
        .select('*, profiles!user_id(full_name, student_id)')
        .eq('is_archived', true).order('created_at', { ascending: false }),
    ])
    setTransactions(tRes.data ?? [])
    setRequests(rRes.data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadAll() }, [supabase])

  async function handleRestore() {
    if (!restoreTarget) return
    const { error } = await supabase.from(restoreTarget.table as any).update({ is_archived: false }).eq('id', restoreTarget.id)
    if (!error) { toast.success(`Restored "${restoreTarget.label}".`); setRestoreTarget(null); loadAll() }
    else toast.error(error.message)
  }

  const tabCounts = { transactions: transactions.length, requests: requests.length }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Archive className="size-6 text-amber-600" /> Archive</h1>
        <p className="text-slate-500 text-sm mt-1">Archived records are hidden from active views. You can restore them here.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100 rounded-xl p-1 border border-slate-200">
          {([['transactions', 'Transactions', ArrowLeftRight], ['requests', 'Book Requests', ClipboardList]] as const).map(([key, label, Icon]) => (
            <TabsTrigger key={key} value={key} className="rounded-lg gap-1.5">
              <Icon className="size-3.5" /> {label}
              {tabCounts[key] > 0 && <span className="bg-slate-400 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 inline-flex items-center justify-center">{tabCounts[key]}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td className="p-8 text-center"><Skeleton className="h-4 w-32 mx-auto" /></td></tr>
            ) : (
              <>
                {tab === 'transactions' && (transactions.length === 0
                  ? <tr><td className="p-12 text-center text-slate-500"><ArrowLeftRight className="size-10 text-slate-200 mx-auto mb-3" />No archived transactions.</td></tr>
                  : transactions.map(t => {
                    const bk = t.books as any; const p = t.profiles as any
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">{bk?.title ?? '—'}</p>
                          <p className="text-xs text-slate-500">{p?.full_name ?? 'Unknown'} · {t.status} · {t.borrowed_at ? format(new Date(t.borrowed_at), 'MMM d, yyyy') : '—'}</p>
                        </td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant="outline" className="gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => setRestoreTarget({ id: t.id, table: 'transactions', label: bk?.title ?? 'Transaction' })}>
                            <RotateCcw className="size-3" /> Restore
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
                {tab === 'requests' && (requests.length === 0
                  ? <tr><td className="p-12 text-center text-slate-500"><ClipboardList className="size-10 text-slate-200 mx-auto mb-3" />No archived requests.</td></tr>
                  : requests.map(r => {
                    const p = (r as any).profiles as any
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">{r.book_title}</p>
                          <p className="text-xs text-slate-500">{p?.full_name ?? 'Unknown'} · {format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                          <Badge variant="outline" className={`mt-1 text-[10px] ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : r.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{r.status}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant="outline" className="gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => setRestoreTarget({ id: r.id, table: 'book_requests', label: r.book_title })}>
                            <RotateCcw className="size-3" /> Restore
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!restoreTarget} onOpenChange={open => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this record?</AlertDialogTitle>
            <AlertDialogDescription>&ldquo;{restoreTarget?.label}&rdquo; will be moved back to its active list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-emerald-600 hover:bg-emerald-700">Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
