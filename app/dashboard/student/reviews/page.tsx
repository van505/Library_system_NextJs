'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, BookOpen, Edit2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

export default function StudentReviewsPage() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const [returnedBooks, setReturnedBooks] = React.useState<any[]>([])
  const [reviews, setReviews] = React.useState<Record<string, any>>({})
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState<string | null>(null)
  
  const [editState, setEditState] = React.useState<Record<string, { rating: number, comment: string }>>({})

  React.useEffect(() => {
    if (!profile) return
    async function load() {
      setLoading(true)
      // Get all unique returned books for this student
      const { data: txData } = await supabase.from('transactions').select('book_id, books(title, author, cover_url)').eq('borrower_id', profile!.id).eq('status', 'returned')
      
      const uniqueBooks = Array.from(new Map(txData?.map(t => [t.book_id, { id: t.book_id, ...t.books }])).values())
      
      if (uniqueBooks.length > 0) {
        const bookIds = uniqueBooks.map(b => b.id)
        const { data: revData } = await supabase.from('book_reviews').select('*').eq('user_id', profile!.id).in('book_id', bookIds)
        
        const revMap: Record<string, any> = {}
        const editMap: Record<string, { rating: number, comment: string }> = {}
        
        revData?.forEach(r => {
          revMap[r.book_id] = r
          editMap[r.book_id] = { rating: r.rating, comment: r.comment || '' }
        })
        
        // Init edit state for books without reviews yet
        uniqueBooks.forEach(b => {
          if (!editMap[b.id]) editMap[b.id] = { rating: 0, comment: '' }
        })
        
        setReviews(revMap)
        setEditState(editMap)
      }
      
      setReturnedBooks(uniqueBooks)
      setLoading(false)
    }
    load()
  }, [profile, supabase])

  async function handleSaveReview(bookId: string) {
    if (!profile) return
    const state = editState[bookId]
    if (state.rating === 0) { toast.error('Please select a star rating'); return }
    
    setSubmitting(bookId)
    const { data, error } = await supabase.from('book_reviews').upsert({
      book_id: bookId,
      user_id: profile.id,
      rating: state.rating,
      comment: state.comment
    }, { onConflict: 'book_id,user_id' }).select().single()
    
    if (error) toast.error(error.message)
    else {
      toast.success('Review saved!')
      setReviews(prev => ({ ...prev, [bookId]: data }))
    }
    setSubmitting(null)
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Reviews</h1>
        <p className="text-sm text-slate-600 mt-1">Rate and review books you've read to help others decide.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? Array.from({length: 4}).map((_,i) => <Skeleton key={i} className="h-48 rounded-2xl" />) : returnedBooks.length === 0 ? <p className="col-span-full py-12 text-center text-slate-500">You haven't returned any books yet.</p> : returnedBooks.map(b => {
          const hasReview = !!reviews[b.id]
          const st = editState[b.id] || { rating: 0, comment: '' }
          
          return (
            <Card key={b.id} className={`rounded-2xl border ${hasReview ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'} shadow-sm overflow-hidden flex flex-col`}>
              <div className="flex bg-slate-50 border-b border-slate-100 p-4 gap-4">
                <div className="w-12 h-16 bg-white border border-slate-200 shadow-sm rounded-md overflow-hidden shrink-0">
                  {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-3 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-semibold text-slate-900 truncate text-sm">{b.title}</h3>
                  <p className="text-xs text-slate-500 truncate">{b.author}</p>
                  {hasReview && <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 w-fit"><CheckCircle2 className="size-3" /> Reviewed</span>}
                </div>
              </div>
              
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setEditState(prev => ({...prev, [b.id]: {...prev[b.id], rating: star}}))} className="p-1 -m-1 focus:outline-none group transition-transform hover:scale-110 active:scale-95">
                      <Star className={`size-6 transition-colors ${star <= st.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 group-hover:text-amber-200'}`} />
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-slate-400 ml-2">{st.rating > 0 ? `${st.rating} / 5` : 'Rate this book'}</span>
                </div>
                
                <Textarea 
                  placeholder="What did you think of the book?" 
                  value={st.comment} 
                  onChange={e => setEditState(prev => ({...prev, [b.id]: {...prev[b.id], comment: e.target.value}}))}
                  className="resize-none h-20 text-sm rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                />
                
                <div className="flex justify-end mt-1">
                  <Button onClick={() => handleSaveReview(b.id)} disabled={submitting === b.id || st.rating === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 text-sm px-6">
                    {hasReview ? <Edit2 className="size-3.5 mr-2" /> : null}
                    {submitting === b.id ? 'Saving...' : hasReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
