'use client'

import * as React from 'react'
import { Plus, Search, CheckCircle, AlertCircle, ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format, differenceInDays, isBefore, addDays } from 'date-fns'

export default function TransactionsPage() {
  const supabase = createClient()
  const [txs, setTxs] = React.useState<any[]>([])
  const [books, setBooks] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState('All')
  const [search, setSearch] = React.useState('')
  const [addOpen, setAddOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({ book_id: '', borrower_id: '', notes: '' })

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [tRes, bRes, uRes] = await Promise.all([
      supabase.from('transactions').select('*, books(title, cover_url), profiles(full_name)').order('borrowed_at', { ascending: false }),
      supabase.from('books').select('id, title, available_copies').gt('available_copies', 0),
      supabase.from('profiles').select('id, full_name').in('role', ['student', 'staff'])
    ])
    setTxs(tRes.data || [])
    setBooks(bRes.data || [])
    setStudents(uRes.data || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      book_id: form.book_id,
      borrower_id: form.borrower_id,
      status: 'borrowed',
      borrowed_at: new Date().toISOString(),
      due_date: addDays(new Date(), 14).toISOString(),
      notes: form.notes
    }
    const { data, error } = await supabase.from('transactions').insert([payload]).select('*, books(title, cover_url), profiles(full_name)').single()
    if (error) toast.error(error.message)
    else {
      toast.success('Book borrowed successfully')
      setTxs([data, ...txs])
      setAddOpen(false)
    }
    setSaving(false)
  }

  async function handleReturn(id: string) {
    const { error } = await supabase.from('transactions').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Marked as returned')
      setTxs(txs.map(t => t.id === id ? { ...t, status: 'returned', returned_at: new Date().toISOString() } : t))
    }
  }

  const filtered = txs.filter(t => {
    const q = search.toLowerCase()
    const matchesSearch = !q || t.books?.title?.toLowerCase().includes(q) || t.profiles?.full_name?.toLowerCase().includes(q)
    const isOverdue = t.status === 'borrowed' && t.due_date && isBefore(new Date(t.due_date), new Date())
    
    let matchesFilter = true
    if (filter === 'Active') matchesFilter = t.status === 'borrowed'
    if (filter === 'Returned') matchesFilter = t.status === 'returned'
    if (filter === 'Overdue') matchesFilter = isOverdue

    return matchesSearch && matchesFilter
  })

  function getDueDateStyle(dateStr?: string, status?: string) {
    if (!dateStr || status === 'returned') return 'text-slate-500'
    const date = new Date(dateStr)
    const diff = differenceInDays(date, new Date())
    if (isBefore(date, new Date())) return 'text-red-600 font-semibold'
    if (diff <= 3) return 'text-amber-600 font-semibold'
    return 'text-emerald-600'
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-600 mt-1">Manage borrowing and returns</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><Plus className="size-4 mr-2" /> Borrow Book</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Manual Borrow Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="flex flex-col gap-4 py-4">
              <Select value={form.borrower_id} onValueChange={v => setForm({...form, borrower_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Select Borrower" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.book_id} onValueChange={v => setForm({...form, book_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Select Book (Available only)" /></SelectTrigger>
                <SelectContent>
                  {books.map(b => <SelectItem key={b.id} value={b.id}>{b.title} (Avail: {b.available_copies})</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Optional Notes" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} />
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">Confirm Borrow</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          {['All', 'Active', 'Returned', 'Overdue'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input placeholder="Search user or book..." className="pl-9 h-9 rounded-xl bg-white border-slate-200" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Book & User</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Status & Notes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td></tr> : filtered.length===0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">No transactions found</td></tr> : filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-semibold text-slate-900 line-clamp-1">{t.books?.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">by {t.profiles?.full_name}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-slate-700">Out: {format(new Date(t.borrowed_at), 'MMM d, yyyy')}</p>
                    <p className={`text-xs mt-0.5 ${getDueDateStyle(t.due_date, t.status)}`}>Due: {t.due_date ? format(new Date(t.due_date), 'MMM d, yyyy') : 'N/A'}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                           t.status === 'returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                           t.status === 'borrowed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                           'bg-amber-50 text-amber-700 border-amber-200'
                         }`}>{t.status}</span>
                      {t.notes && <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{t.notes}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {t.status === 'borrowed' && (
                      <Button size="sm" variant="outline" className="text-xs rounded-lg h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50" onClick={() => handleReturn(t.id)}>
                        <CheckCircle className="size-3.5 mr-1" /> Return
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
