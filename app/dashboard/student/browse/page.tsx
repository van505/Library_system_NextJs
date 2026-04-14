'use client'

import * as React from 'react'
import { Search, BookOpen, Star, AlertCircle, Library } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function StudentBrowsePage() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  
  const { profile } = useAuthStore()
  const supabase = createClient()
  const [books, setBooks] = React.useState<any[]>([])
  const [reviews, setReviews] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState(initialSearch)
  const [genreFilter, setGenreFilter] = React.useState('All')
  const [selectedBook, setSelectedBook] = React.useState<any>(null)
  const [borrowingId, setBorrowingId] = React.useState<string | null>(null)
  
  const [reqModalOpen, setReqModalOpen] = React.useState(false)
  const [reqReason, setReqReason] = React.useState('')

  React.useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('books').select('*, shelves(name, location)').order('title', { ascending: true })
    setBooks(data || [])
    setLoading(false)
  }

  async function loadReviews(bookId: string) {
    const { data } = await supabase.from('book_reviews').select('*, profiles:user_id(full_name)').eq('book_id', bookId)
    setReviews(data || [])
  }

  const handleBookClick = (b: any) => {
    setSelectedBook(b)
    loadReviews(b.id)
  }

  async function handleBorrowRequest(bookId: string) {
    if (!profile) return
    setBorrowingId(bookId)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)
    const { error } = await supabase.from('transactions').insert([{
      book_id: bookId,
      borrower_id: profile.id,
      status: 'pending',
      borrowed_at: new Date().toISOString(),
      due_date: dueDate.toISOString(),
    }])
    if (error) toast.error(error.message)
    else toast.success(`Borrow request submitted!`)
    setBorrowingId(null)
  }

  async function handleBookRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !selectedBook) return
    setBorrowingId('req')
    const { error } = await supabase.from('book_requests').insert([{
      user_id: profile.id,
      book_title: selectedBook.title,
      author: selectedBook.author,
      reason: reqReason
    }])
    if (error) toast.error(error.message)
    else {
      toast.success('Waitlist/Purchase request sent to staff')
      setReqModalOpen(false)
      setReqReason('')
    }
    setBorrowingId(null)
  }

  const genres = ['All', ...Array.from(new Set(books.map(b => b.genre).filter(Boolean)))].sort() as string[]
  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    const matchGenre = genreFilter === 'All' || b.genre === genreFilter
    return matchSearch && matchGenre
  })

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Browse Catalog</h1>
          <p className="text-sm text-slate-600 mt-1">Find your next book and check availability</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input placeholder="Search by title or author..." className="pl-9 h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-indigo-500" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0 max-w-full">
            {genres.map(g => (
              <button key={g} onClick={() => setGenreFilter(g)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${genreFilter === g ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {loading ? Array.from({length: 10}).map((_,i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />) : filtered.length===0 ? <p className="col-span-full py-12 text-center text-slate-500">No books found.</p> : filtered.map(b => (
          <Dialog key={b.id}>
            <DialogTrigger asChild>
              <div onClick={() => handleBookClick(b)} className="group cursor-pointer flex flex-col">
                <div className="aspect-[3/4] bg-slate-100 rounded-2xl mb-3 overflow-hidden border border-slate-200 relative shadow-sm transition-transform group-hover:-translate-y-1 group-hover:shadow-md">
                   {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : 
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center text-5xl font-black text-indigo-900/5 uppercase">{b.title[0]}</div>}
                   <div className="absolute top-2 right-2 flex gap-1">
                     <Badge className={`border-none shadow-sm text-[10px] uppercase font-bold py-0.5 px-2 ${b.available_copies > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>{b.available_copies > 0 ? 'Available' : 'Out'}</Badge>
                   </div>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{b.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{b.author}</p>
              </div>
            </DialogTrigger>
            
            <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0 border-0 bg-transparent shadow-2xl">
              {selectedBook && (
                <div className="flex flex-col sm:flex-row w-full bg-white max-h-[85vh]">
                  <div className="w-full sm:w-2/5 bg-slate-100 shrink-0 relative min-h-[300px]">
                    {selectedBook.cover_url ? <img src={selectedBook.cover_url} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-900/10 font-black text-9xl uppercase">{selectedBook.title[0]}</div>}
                  </div>
                  <div className="w-full sm:w-3/5 p-6 flex flex-col overflow-y-auto">
                    <DialogHeader className="p-0 text-left mb-4">
                      <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">{selectedBook.title}</DialogTitle>
                      <p className="text-slate-500 font-medium">by {selectedBook.author}</p>
                    </DialogHeader>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {selectedBook.genre && <Badge variant="secondary" className="bg-slate-100 text-slate-600">{selectedBook.genre}</Badge>}
                      <Badge variant="outline" className={`border ${selectedBook.available_copies > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {selectedBook.available_copies} / {selectedBook.total_copies} Available
                      </Badge>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1"><Library className="size-3" /> {selectedBook.shelves?.name || 'Unassigned'}</Badge>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed overflow-y-auto max-h-32 mb-6">
                      {selectedBook.description || 'No description available for this book.'}
                    </p>

                    <div className="mt-auto flex flex-col gap-3">
                      {selectedBook.available_copies > 0 ? (
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 text-base shadow-sm shadow-indigo-600/20" disabled={borrowingId === selectedBook.id} onClick={() => handleBorrowRequest(selectedBook.id)}>
                          {borrowingId === selectedBook.id ? 'Processing...' : 'Request to Borrow'}
                        </Button>
                      ) : (
                        <Dialog open={reqModalOpen} onOpenChange={setReqModalOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-xl h-12 text-base">Request Waitlist/Purchase</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Request {selectedBook.title}</DialogTitle></DialogHeader>
                            <form onSubmit={handleBookRequest} className="flex flex-col gap-4 py-4">
                              <p className="text-sm text-slate-500">This book is currently out of stock. Leave a reason below and we will notify you when it's available or consider acquiring more copies.</p>
                              <Input placeholder="Reason (e.g. needed for assignment)" required value={reqReason} onChange={e=>setReqReason(e.target.value)} />
                              <Button type="submit" disabled={borrowingId === 'req'} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Submit Request</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    {/* Minimal Reviews Preview */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Star className="size-4 text-amber-500 fill-amber-500" /> Student Reviews ({reviews.length})</h4>
                      {reviews.length === 0 ? <p className="text-xs text-slate-500">No reviews yet.</p> : (
                        <div className="flex flex-col gap-3">
                          {reviews.slice(0,2).map(r => (
                            <div key={r.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-1 mb-1">
                                {Array.from({length: 5}).map((_,i) => <Star key={i} className={`size-3 ${i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />)}
                                <span className="text-[10px] text-slate-400 ml-2">{r.profiles?.full_name}</span>
                              </div>
                              {r.comment && <p className="text-xs text-slate-700 line-clamp-2">{r.comment}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  )
}
