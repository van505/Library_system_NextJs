'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { ClipboardList, Send, Clock, CheckCircle, XCircle, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type BookRequest = {
  id: string
  book_title: string
  author: string | null
  reason: string | null
  status: string
  created_at: string
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  pending: { label: 'Pending', icon: Clock, class: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', icon: CheckCircle, class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', icon: XCircle, class: 'bg-red-50 text-red-700 border-red-200' },
}

export default function StudentRequestsPage() {
  const supabase = createClient()
  const { profile } = useAuthStore()
  const [title, setTitle] = React.useState('')
  const [author, setAuthor] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [requests, setRequests] = React.useState<BookRequest[]>([])
  const [loading, setLoading] = React.useState(true)

  async function fetchRequests() {
    if (!profile) return
    const { data } = await supabase
      .from('book_requests')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
    setLoading(false)
  }

  React.useEffect(() => {
    fetchRequests()
  }, [profile, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !profile) return
    setSubmitting(true)

    const { error } = await supabase.from('book_requests').insert({
      user_id: profile.id,
      book_title: title.trim(),
      author: author.trim() || null,
      reason: reason.trim() || null,
      status: 'pending',
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Book request submitted!')
      setTitle('')
      setAuthor('')
      setReason('')
      fetchRequests()
    }
    setSubmitting(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Request a Book</h1>
        <p className="text-slate-500 text-sm mt-1">Can't find a book? Submit a request and the library staff will try to acquire it.</p>
      </div>

      {/* Request Form */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Book Title <span className="text-red-500">*</span></Label>
                <Input id="title" className="rounded-xl" placeholder="e.g. The Alchemist" required value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input id="author" className="rounded-xl" placeholder="e.g. Paulo Coelho" value={author} onChange={e => setAuthor(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Textarea id="reason" className="rounded-xl resize-none" rows={3} placeholder="Why do you need this book? Is it for a class project?" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2" disabled={submitting || !title.trim()}>
              <Send className="size-4" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Past Requests */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ClipboardList className="size-5 text-indigo-600" /> My Past Requests
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <BookOpen className="size-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No requests yet</p>
            <p className="text-slate-400 text-sm mt-1">Your submitted book requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => {
              const cfg = statusConfig[req.status] ?? statusConfig.pending
              const Icon = cfg.icon
              return (
                <Card key={req.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{req.book_title}</p>
                      {req.author && <p className="text-sm text-slate-500 mt-0.5">by {req.author}</p>}
                      {req.reason && <p className="text-xs text-slate-400 mt-2 italic">"{req.reason}"</p>}
                      <p className="text-xs text-slate-400 mt-2">{format(new Date(req.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <Badge variant="outline" className={`${cfg.class} shrink-0 flex items-center gap-1 font-medium`}>
                      <Icon className="size-3" /> {cfg.label}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
