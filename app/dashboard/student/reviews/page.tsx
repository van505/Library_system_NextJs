'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Star, MessageSquareQuote, Check } from 'lucide-react'

export default function StudentReviewsPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [eligibleBooks, setEligibleBooks] = React.useState<any[]>([])
  const [reviews, setReviews] = React.useState<Record<string, any>>({})
  const [myId, setMyId] = React.useState<string | null>(null)

  // Editing state locally per book id
  const [editingData, setEditingData] = React.useState<Record<string, { rating: number, text: string, saving: boolean }>>({})

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)

    // 1. Get distinct books the user has RETURNED
    const { data: txs } = await supabase.from('transactions').select('book_id, books(id, title, author, cover_url, categories(color))').eq('borrower_id', user.id).eq('status', 'returned')
    
    const uniqueBooks = Array.from(new Map((txs || []).map((t:any) => [t.book_id, t.books])).values())
    setEligibleBooks(uniqueBooks)

    // 2. Get existing reviews for these books by this user
    if (uniqueBooks.length > 0) {
      const bookIds = uniqueBooks.map((b:any) => b.id)
      const { data: existingRevs } = await supabase.from('book_reviews').select('*').eq('user_id', user.id).in('book_id', bookIds)
      
      const rmap: Record<string, any> = {}
      existingRevs?.forEach(r => rmap[r.book_id] = r)
      setReviews(rmap)
    }

    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  function beginEdit(bookId: string) {
    const existing = reviews[bookId]
    setEditingData(prev => ({
      ...prev,
      [bookId]: { rating: existing?.rating || 5, text: existing?.review_text || '', saving: false }
    }))
  }

  function cancelEdit(bookId: string) {
    setEditingData(prev => {
      const next = { ...prev }
      delete next[bookId]
      return next
    })
  }

  function updateEditData(bookId: string, updates: Partial<{ rating: number, text: string, saving: boolean }>) {
    setEditingData(prev => ({ ...prev, [bookId]: { ...prev[bookId], ...updates } }))
  }

  async function handleSaveReview(bookId: string) {
    if (!myId) return
    const ed = editingData[bookId]
    if (!ed || ed.rating < 1 || ed.text.trim().length === 0) {
      toast.error('Please provide a rating and a review message.')
      return
    }

    updateEditData(bookId, { saving: true })

    const payload = { book_id: bookId, user_id: myId, rating: ed.rating, review_text: ed.text.trim() }
    
    let error;
    if (reviews[bookId]) {
      // update
      error = (await supabase.from('book_reviews').update(payload).eq('id', reviews[bookId].id)).error
    } else {
      // insert
      error = (await supabase.from('book_reviews').insert(payload)).error
    }

    if (error) {
      toast.error(error.message)
      updateEditData(bookId, { saving: false })
    } else {
      toast.success('Review saved!')
      cancelEdit(bookId)
      loadData() // Refresh fully
    }
  }

  const StarSelector = ({ rating, onChange }: { rating: number, onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} type="button" onClick={() => onChange(v)} className="p-1 hover:scale-110 transition-transform">
          <Star className={`size-6 ${v <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`} />
        </button>
      ))}
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Book Reviews</h1>
          <p className="text-slate-500 text-sm mt-1">Rate and review books you've read to help others find great stories.</p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <Skeleton className="h-64 rounded-3xl w-full" />
        ) : eligibleBooks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
             <MessageSquareQuote className="size-16 text-slate-200 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-700">No books eligible for review</h3>
             <p className="text-slate-500 mt-2 max-w-md mx-auto">
               You can only write reviews for books you have borrowed and officially returned.
             </p>
          </div>
        ) : (
          eligibleBooks.map(b => {
             const existing = reviews[b.id]
             const isEditing = b.id in editingData
             const ed = editingData[b.id]

             return (
               <Card key={b.id} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                  <div className="w-full md:w-48 bg-slate-100 p-6 flex flex-col items-center justify-center shrink-0" style={{backgroundColor: `${b.categories?.color}15` || '#f8fafc'}}>
                     <div className="w-24 h-36 rounded-lg bg-white shadow-md overflow-hidden relative mb-4">
                       {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover"/> : <div className="w-full h-full" style={{backgroundColor: b.categories?.color || '#cbd5e1'}} />}
                     </div>
                     <h4 className="font-bold text-slate-900 text-center text-sm leading-tight max-w-full truncate px-2">{b.title}</h4>
                     <p className="text-xs text-slate-500 text-center mt-1 truncate max-w-full px-2">{b.author}</p>
                  </div>
                  
                  <div className="p-6 md:p-8 flex-1 border-t md:border-t-0 md:border-l border-slate-100 bg-white">
                     {isEditing ? (
                       <div className="space-y-4">
                         <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <span className="font-semibold text-slate-700">Your Rating</span>
                           <StarSelector rating={ed.rating} onChange={(r) => updateEditData(b.id, { rating: r })} />
                         </div>
                         <Textarea 
                           value={ed.text} 
                           onChange={e => updateEditData(b.id, { text: e.target.value })} 
                           placeholder="What did you think of the book? Share your thoughts..." 
                           className="rounded-xl resize-none border-slate-200 bg-slate-50 h-32" 
                         />
                         <div className="flex gap-2 justify-end pt-2">
                           <Button variant="outline" onClick={() => cancelEdit(b.id)} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</Button>
                           <Button onClick={() => handleSaveReview(b.id)} disabled={ed.saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                             {ed.saving ? 'Saving...' : 'Publish Review'}
                           </Button>
                         </div>
                       </div>
                     ) : existing ? (
                       <div className="h-full flex flex-col">
                         <div className="flex justify-between items-start mb-4">
                           <div className="flex gap-1">
                             {[1,2,3,4,5].map(v => <Star key={v} className={`size-5 ${v <= existing.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`} />)}
                           </div>
                           <div className="flex gap-2">
                             <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md"><Check className="size-3 mr-1"/> Published</span>
                           </div>
                         </div>
                         <p className="text-slate-600 leading-relaxed text-sm flex-1">{existing.review_text}</p>
                         <div className="mt-6 pt-4 border-t border-slate-100 text-right">
                           <Button variant="outline" size="sm" onClick={() => beginEdit(b.id)} className="rounded-lg text-slate-500 hover:text-indigo-600 bg-white">Edit Your Review</Button>
                         </div>
                       </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center py-6 text-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                           <MessageSquareQuote className="size-6 text-slate-300" />
                         </div>
                         <h4 className="font-semibold text-slate-700 mb-1">How was this book?</h4>
                         <p className="text-sm text-slate-500 mb-6 max-w-sm">You haven't reviewed this book yet. Your feedback helps your schoolmates choose their next read.</p>
                         <Button onClick={() => beginEdit(b.id)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-8">Write a Review</Button>
                       </div>
                     )}
                  </div>
               </Card>
             )
          })
        )}
      </div>
    </div>
  )
}
