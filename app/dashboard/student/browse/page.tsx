'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Search, Info, MapPin, Hash, CheckCircle, BookOpen, User, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

export default function StudentBrowsePage() {
  const supabase = createClient()
  const [books, setBooks] = React.useState<any[]>([])
  const [categories, setCategories] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState('all')
  const [availOnly, setAvailOnly] = React.useState(false)

  const [selectedBook, setSelectedBook] = React.useState<any>(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [reviews, setReviews] = React.useState<any[]>([])
  const [requesting, setRequesting] = React.useState(false)
  const [myId, setMyId] = React.useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)

    const [bRes, cRes] = await Promise.all([
      supabase.from('books').select('*, categories(name, color), shelves(name, location)').order('title'),
      supabase.from('categories').select('*').order('name')
    ])
    setBooks(bRes.data ?? [])
    setCategories(cRes.data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [supabase])

  async function openBook(b: any) {
    setSelectedBook(b)
    setReviews([]) // reset
    setIsModalOpen(true)
    
    // Load reviews
    const { data } = await supabase.from('book_reviews')
      .select('*, profiles(full_name)')
      .eq('book_id', b.id)
      .order('created_at', { ascending: false })
    
    setReviews(data ?? [])
  }

  async function handleRequestBorrow() {
    if (!selectedBook || !myId) return
    setRequesting(true)
    
    // This inserts a transaction in 'pending' state
    const { error: txError } = await supabase.from('transactions').insert({
      book_id: selectedBook.id,
      borrower_id: myId,
      status: 'pending'
    })

    if (!txError) {
      // Decrement logic handles when actual borrow happens or now depending on strictness.
      // Usually, pending reserves it. Let's reserve it:
      await supabase.from('books').update({ available_copies: selectedBook.available_copies - 1 }).eq('id', selectedBook.id)
      
      // Notify staff
      const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'staff'])
      if (admins) {
        await supabase.from('notifications').insert(
          admins.map(a => ({
            user_id: a.id,
            title: 'New Borrow Request',
            message: `A student has requested to borrow "${selectedBook.title}".`,
            type: 'info',
            link: '/dashboard/admin/transactions'
          }))
        )
      }

      toast.success('Borrow request submitted!')
      setIsModalOpen(false)
      loadData()
    } else {
      toast.error(txError.message)
    }
    setRequesting(false)
  }

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    return (
      (q === '' || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (category === 'all' || b.category_id === category) &&
      (!availOnly || b.available_copies > 0)
    )
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row gap-6 md:items-end bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
         <div className="flex-1 space-y-4 w-full">
           <h1 className="text-2xl font-bold text-slate-900">Library Catalog</h1>
           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
             <Input className="pl-12 h-14 rounded-2xl bg-slate-50 border-transparent focus-visible:bg-white text-lg shadow-inner" placeholder="Search by book title or author..." value={search} onChange={e=>setSearch(e.target.value)} />
           </div>
         </div>
         <div className="flex flex-col gap-4 shrink-0 overflow-hidden text-sm">
           <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 self-start">
             <Switch checked={availOnly} onCheckedChange={setAvailOnly} />
             <span className="font-semibold text-slate-700 select-none">Available Only</span>
           </div>
         </div>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-hide">
        <Tabs value={category} onValueChange={setCategory} className="w-max">
          <TabsList className="bg-transparent space-x-2 h-auto p-0">
            <TabsTrigger value="all" className="rounded-full px-6 py-2.5 bg-white border border-slate-200 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 shadow-sm transition-all">All Genres</TabsTrigger>
            {categories.map(c => (
              <TabsTrigger key={c.id} value={c.id} className="rounded-full px-5 py-2.5 bg-white border border-slate-200 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 shadow-sm transition-all">
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <BookOpen className="size-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">No books found</h3>
          <p className="text-slate-500 mt-2">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map(b => (
            <Card key={b.id} className="rounded-3xl border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group" onClick={() => openBook(b)}>
              <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                {b.cover_url ? (
                  <img src={b.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full p-6 flex flex-col justify-end relative z-10" style={{backgroundColor: b.categories?.color || '#cbd5e1'}}>
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                     <h3 className="text-white font-bold leading-tight relative z-20 text-balance">{b.title}</h3>
                     <p className="text-white/80 text-xs mt-1 relative z-20">{b.author}</p>
                  </div>
                )}
                <div className="absolute top-3 right-3 z-30">
                  <Badge className={`border-transparent shadow-none font-bold ${b.available_copies > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-900/80 hover:bg-slate-900 backdrop-blur-sm text-white'}`}>
                     {b.available_copies > 0 ? 'Available' : 'Borrowed Out'}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4 bg-white relative z-20">
                <p className="font-bold text-slate-900 truncate">{b.title}</p>
                <div className="flex items-center justify-between mt-2">
                   {b.categories ? (
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 border-transparent px-2" style={{backgroundColor: `${b.categories.color}20`, color: b.categories.color}}>
                        {b.categories.name}
                      </Badge>
                   ) : <span/>}
                   <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 rounded-full">{b.available_copies} left</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Book Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 rounded-[2rem] overflow-hidden gap-0 border-0 shadow-2xl">
          {selectedBook && (
            <div className="flex flex-col md:flex-row max-h-[85vh] overflow-y-auto">
              {/* Left Image Side */}
              <div className="w-full md:w-[300px] shrink-0 bg-slate-100 relative aspect-square md:aspect-auto">
                <div className="absolute inset-0 z-0 opacity-20" style={{backgroundColor: selectedBook.categories?.color || '#cbd5e1'}} />
                {selectedBook.cover_url ? (
                  <img src={selectedBook.cover_url} className="w-full h-full object-cover relative z-10" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative z-10" style={{backgroundColor: selectedBook.categories?.color || '#cbd5e1'}}>
                     <span className="text-white text-5xl font-serif px-8 text-center drop-shadow-md">{selectedBook.title}</span>
                  </div>
                )}
                {/* Stats overlays */}
                <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
                   <div className="bg-white/90 backdrop-blur shadow-sm rounded-xl py-2 px-3 flex-1 text-center border border-white/50">
                     <p className="text-[10px] font-bold text-slate-500 uppercase">Available</p>
                     <p className="text-xl font-black text-emerald-600 leading-none mt-0.5">{selectedBook.available_copies}</p>
                   </div>
                   <div className="bg-white/90 backdrop-blur shadow-sm rounded-xl py-2 px-3 flex-1 text-center border border-white/50">
                     <p className="text-[10px] font-bold text-slate-500 uppercase">Total</p>
                     <p className="text-xl font-black text-slate-900 leading-none mt-0.5">{selectedBook.total_copies}</p>
                   </div>
                </div>
              </div>

              {/* Right Content Side */}
              <div className="flex-1 bg-white p-6 md:p-8 flex flex-col min-w-0">
                <div className="flex-1 space-y-6">
                  <div>
                     <div className="flex items-center gap-2 mb-3 flex-wrap">
                       {selectedBook.categories && (
                         <Badge className="border-transparent hover:border-transparent font-bold" style={{backgroundColor: `${selectedBook.categories.color}20`, color: selectedBook.categories.color}}>
                           {selectedBook.categories.name}
                         </Badge>
                       )}
                       {selectedBook.shelves && (
                         <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">
                           <MapPin className="size-3 mr-1" /> {selectedBook.shelves.name}
                         </Badge>
                       )}
                     </div>
                     <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-1">{selectedBook.title}</h2>
                     <p className="text-lg text-slate-500 font-medium">by {selectedBook.author}</p>
                  </div>

                  <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                    {selectedBook.description ? <p>{selectedBook.description}</p> : <p className="italic">No description available for this book.</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">ISBN</span>
                      <span className="font-mono text-slate-700">{selectedBook.isbn || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">Publisher</span>
                      <span className="text-slate-700 truncate">{selectedBook.publisher || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">Year</span>
                      <span className="text-slate-700">{selectedBook.published_year || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">Location</span>
                      <span className="text-slate-700">{selectedBook.shelves?.location || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                     <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Star className="size-4 text-amber-400 fill-amber-400"/> Student Reviews ({reviews.length})</h4>
                     {reviews.length === 0 ? <p className="text-sm text-slate-500 italic">No reviews yet. Borrow the book to leave the first one!</p> : (
                       <div className="space-y-4">
                         {reviews.slice(0,3).map(r => (
                           <div key={r.id} className="bg-white border text-sm border-slate-100 rounded-2xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 font-medium text-slate-900"><User className="size-4 text-slate-400"/> {(r.profiles as any)?.full_name}</div>
                                <div className="flex text-amber-400">
                                  {[1,2,3,4,5].map(s => <Star key={s} className={`size-3.5 ${s <= r.rating ? 'fill-current' : 'fill-slate-100 text-slate-100'}`} />)}
                                </div>
                              </div>
                              <p className="text-slate-600 leading-relaxed">{r.review_text}</p>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  {selectedBook.available_copies > 0 ? (
                    <Button className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold shadow-lg shadow-indigo-200" onClick={handleRequestBorrow} disabled={requesting}>
                      {requesting ? 'Checking...' : 'Request to Borrow'}
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full h-14 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">
                       <Link href={`/dashboard/student/requests?title=${encodeURIComponent(selectedBook.title)}&author=${encodeURIComponent(selectedBook.author)}`}>Notify & Request Copy</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
