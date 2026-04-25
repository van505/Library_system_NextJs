'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Search, MapPin, BookOpen, User, Star, CalendarCheck, AlertCircle, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { toInputDate, getMinReturnDate, getMaxReturnDate, validateReturnDate } from '@/lib/dateUtils'
import { notifyRoles } from '@/lib/notifyAdmins'
import { checkBorrowingLimit, type BorrowLimitResult } from '@/lib/borrowingLimit'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type BookCat = { id: string; name: string; color: string; icon: string }
type TagItem = { id: string; name: string; color: string }
type BookRow = {
  id: string
  title: string
  author: string
  isbn: string | null
  description: string | null
  shelf_id: string | null
  available_copies: number
  total_copies: number
  cover_url: string | null
  published_year: string | null
  publisher: string | null
  shelves?: { name: string; location: string } | null
  book_categories?: { categories: BookCat }[]
  book_tags?: { tags: TagItem }[]
}

export default function StudentBrowsePage() {
  const supabase = createClient()
  const { t } = useLanguage()
  const [books, setBooks] = React.useState<BookRow[]>([])
  const [allCategories, setAllCategories] = React.useState<BookCat[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState('all')
  const [availOnly, setAvailOnly] = React.useState(false)

  const [selectedBook, setSelectedBook] = React.useState<BookRow | null>(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [reviews, setReviews] = React.useState<any[]>([])
  const [requesting, setRequesting] = React.useState(false)
  const [myId, setMyId] = React.useState<string | null>(null)

  // ── Borrow limit ─────────────────────────────────────────────────────────
  const [borrowLimit, setBorrowLimit] = React.useState<BorrowLimitResult | null>(null)
  // ── Tag filter (Feature T) ──────────────────────────────────────────────────
  const [allTags, setAllTags] = React.useState<TagItem[]>([])
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([])
  const [tagDropdownOpen, setTagDropdownOpen] = React.useState(false)
  const tagDropdownRef = React.useRef<HTMLDivElement>(null)

  // ── Return date dialog ────────────────────────────────────────────────────
  const [returnDateDialogOpen, setReturnDateDialogOpen] = React.useState(false)
  const [proposedReturnDate, setProposedReturnDate] = React.useState('')
  const [returnDateError, setReturnDateError] = React.useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setMyId(user.id)
      const limitResult = await checkBorrowingLimit(supabase, user.id)
      setBorrowLimit(limitResult)
    }

    const [bRes, cRes, tRes] = await Promise.all([
      supabase
        .from('books')
        .select('*, shelves(name, location), book_categories(categories(id, name, color, icon)), book_tags(tags(id, name, color))')
        .order('title'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('tags').select('*').order('name'),
    ])
    setBooks((bRes.data ?? []) as BookRow[])
    setAllCategories(cRes.data ?? [])
    setAllTags(tRes.data ?? [])
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [])

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const targetBookId = searchParams.get('book')
    if (targetBookId && books.length > 0) {
      const target = books.find(b => b.id === targetBookId)
      if (target && !isModalOpen) {
        openBook(target)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [books])

  async function openBook(b: BookRow) {
    setSelectedBook(b)
    setReviews([])
    setIsModalOpen(true)

    const { data } = await supabase
      .from('book_reviews')
      .select('*, profiles(full_name)')
      .eq('book_id', b.id)
      .order('created_at', { ascending: false })

    setReviews(data ?? [])
  }

  // Step 1: Student clicks "Request to Borrow" → check limit  first, then open date picker dialog
  function openReturnDateDialog() {
    if (!selectedBook || !myId) return
    if (borrowLimit && !borrowLimit.allowed) {
      toast.error(
        `You have reached your borrowing limit of ${borrowLimit.limit} books. Please return a book before borrowing another.`
      )
      return
    }
    setProposedReturnDate(toInputDate(getMinReturnDate()))
    setReturnDateError(null)
    setReturnDateDialogOpen(true)
  }

  // Step 2: Student confirms their proposed return date → insert into book_requests
  async function handleRequestBorrow() {
    const err = validateReturnDate(proposedReturnDate)
    if (err) { setReturnDateError(err); return }
    if (!selectedBook || !myId) return
    setRequesting(true)

    const { error: reqError } = await supabase.from('book_requests').insert({
      user_id: myId,
      book_id: selectedBook.id,
      book_title: selectedBook.title,
      author: selectedBook.author ?? null,
      status: 'pending',
      proposed_return_date: proposedReturnDate,
    })

    if (!reqError) {
      await notifyRoles(
        ['admin', 'staff'],
        'New Book Reservation 📋',
        `A student requested "${selectedBook.title}" — proposed return: ${proposedReturnDate}.`,
        'info',
        '/dashboard/staff/borrow-return'
      )

      toast.success('Reservation submitted! Staff will approve and notify you.')
      setReturnDateDialogOpen(false)
      setIsModalOpen(false)
      loadData()
    } else {
      toast.error(reqError.message)
    }
    setRequesting(false)
  }

  // Helper: get categories array from a book
  function getBookCats(b: BookRow): BookCat[] {
    return (b.book_categories ?? []).map((bc: any) => bc.categories).filter(Boolean)
  }

  // Helper: get tags array from a book
  function getBookTags(b: BookRow): TagItem[] {
    return (b.book_tags ?? []).map((bt: any) => bt.tags).filter(Boolean)
  }

  function toggleTagFilter(tagId: string) {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const bookCatIds = getBookCats(b).map(c => c.id)
    const bookTagIds = getBookTags(b).map(t => t.id)
    const matchTag = selectedTagIds.length === 0 || selectedTagIds.some(id => bookTagIds.includes(id))
    return (
      (q === '' || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (category === 'all' || bookCatIds.includes(category)) &&
      (!availOnly || b.available_copies > 0) &&
      matchTag
    )
  })

  const selectedBookCats = selectedBook ? getBookCats(selectedBook) : []
  const fallbackColor = selectedBookCats[0]?.color || '#cbd5e1'

  const limitAtMax = borrowLimit ? borrowLimit.current >= borrowLimit.limit : false

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Search bar */}
      <div className="flex flex-col md:flex-row gap-6 md:items-end bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex-1 space-y-4 w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{t('libraryCatalog')}</h1>
            {borrowLimit && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${limitAtMax
                ? 'bg-red-50 text-red-700 border-red-200'
                : borrowLimit.current >= Math.ceil(borrowLimit.limit * 0.67)
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                {limitAtMax && <AlertCircle className="size-3.5" />}
                {t('activeBorrows')}: {borrowLimit.current} / {borrowLimit.limit}
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
            <Input
              className="pl-12 h-14 rounded-2xl bg-slate-50 border-transparent focus-visible:bg-white text-lg shadow-inner"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 shrink-0 text-sm">
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 self-start">
            <Switch checked={availOnly} onCheckedChange={setAvailOnly} />
            <span className="font-semibold text-slate-700 select-none">{t('availableOnly')}</span>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto pb-2 scrollbar-hide">
        <Tabs value={category} onValueChange={setCategory} className="w-max">
          <TabsList className="bg-transparent space-x-2 h-auto p-0">
            <TabsTrigger value="all" className="rounded-full px-6 py-2.5 bg-white border border-slate-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary shadow-sm transition-all">
              {t('allGenres')}
            </TabsTrigger>
            {allCategories.map(c => (
              <TabsTrigger key={c.id} value={c.id} className="rounded-full px-5 py-2.5 bg-white border border-slate-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary shadow-sm transition-all">
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Tag filter chips (Feature T) */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Tag className="size-3" /> Tags:
          </span>
          {selectedTagIds.length > 0 && (
            <button
              onClick={() => setSelectedTagIds([])}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear
            </button>
          )}
          {allTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTagFilter(tag.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${selectedTagIds.includes(tag.id)
                ? 'shadow-sm scale-105'
                : 'opacity-60 hover:opacity-100'
                }`}
              style={{
                backgroundColor: selectedTagIds.includes(tag.id) ? `${tag.color}25` : `${tag.color}10`,
                color: tag.color,
                borderColor: selectedTagIds.includes(tag.id) ? `${tag.color}60` : `${tag.color}30`,
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Book grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <BookOpen className="size-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">No books found</h3>
          <p className="text-slate-500 mt-2">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map(b => {
            const cats = getBookCats(b)
            const primaryColor = cats[0]?.color || '#cbd5e1'

            return (
              <Card
                key={b.id}
                className="rounded-3xl border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group"
                onClick={() => openBook(b)}
              >
                {/* Cover */}
                <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                  {b.cover_url ? (
                    <img src={b.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={b.title} />
                  ) : (
                    <div className="w-full h-full p-6 flex flex-col justify-end relative z-10" style={{ backgroundColor: primaryColor }}>
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

                {/* Card footer */}
                <CardContent className="p-4 bg-white">
                  <p className="font-bold text-slate-900 truncate">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{b.author}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cats.slice(0, 2).map(cat => (
                      <Badge
                        key={cat.id}
                        variant="outline"
                        className="text-[10px] uppercase font-bold py-0.5 border-transparent px-2"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        {cat.name}
                      </Badge>
                    ))}
                    {cats.length > 2 && (
                      <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2">
                        +{cats.length - 2}
                      </Badge>
                    )}
                  </div>
                  {/* Tag chips (Feature T) */}
                  {(() => {
                    const bTags = getBookTags(b); return bTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {bTags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >{tag.name}</span>
                        ))}
                        {bTags.length > 2 && <span className="text-[9px] text-slate-400">+{bTags.length - 2}</span>}
                      </div>
                    ) : null
                  })()}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Book Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 rounded-[2rem] overflow-hidden gap-0 border-0 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedBook?.title ?? 'Book Details'}</DialogTitle>
            <DialogDescription>Book detail view</DialogDescription>
          </DialogHeader>
          {selectedBook && (
            <div className="flex flex-col md:flex-row max-h-[85vh] overflow-y-auto">
              {/* Left: cover */}
              <div className="w-full md:w-[280px] shrink-0 bg-slate-100 relative aspect-square md:aspect-auto">
                {selectedBook.cover_url ? (
                  <img src={selectedBook.cover_url} className="w-full h-full object-cover" alt={selectedBook.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: fallbackColor }}>
                    <span className="text-white text-5xl font-bold px-8 text-center drop-shadow-md">
                      {selectedBook.title.charAt(0)}
                    </span>
                  </div>
                )}
                {/* Stats overlay */}
                <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
                  <div className="bg-white/90 backdrop-blur shadow-sm rounded-xl py-2 px-3 flex-1 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Available</p>
                    <p className="text-xl font-black text-emerald-600 leading-none mt-0.5">{selectedBook.available_copies}</p>
                  </div>
                  <div className="bg-white/90 backdrop-blur shadow-sm rounded-xl py-2 px-3 flex-1 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total</p>
                    <p className="text-xl font-black text-slate-900 leading-none mt-0.5">{selectedBook.total_copies}</p>
                  </div>
                </div>
              </div>

              {/* Right: details */}
              <div className="flex-1 bg-white p-6 md:p-8 flex flex-col min-w-0">
                <div className="flex-1 space-y-5">
                  {/* Categories + shelf badges */}
                  <div className="flex flex-wrap gap-2 mb-1">
                    {selectedBookCats.map(cat => (
                      <Badge
                        key={cat.id}
                        className="border-transparent hover:border-transparent font-bold"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        {cat.name}
                      </Badge>
                    ))}
                    {selectedBook.shelves && (
                      <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">
                        <MapPin className="size-3 mr-1" /> {selectedBook.shelves.name}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">{selectedBook.title}</h2>
                    <p className="text-lg text-slate-500 font-medium mt-1">by {selectedBook.author}</p>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-sm">
                    {selectedBook.description || <em>No description available for this book.</em>}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {[
                      { label: 'ISBN', value: selectedBook.isbn || 'N/A' },
                      { label: 'Publisher', value: selectedBook.publisher || 'N/A' },
                      { label: 'Year', value: selectedBook.published_year || 'N/A' },
                      { label: 'Location', value: selectedBook.shelves?.location || 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">{label}</span>
                        <span className="text-slate-700 truncate block">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Reviews */}
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Star className="size-4 text-amber-400 fill-amber-400" /> Student Reviews ({reviews.length})
                    </h4>
                    {reviews.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No reviews yet. Borrow the book to leave the first one!</p>
                    ) : (
                      <div className="space-y-3">
                        {reviews.slice(0, 3).map(r => (
                          <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2 font-medium text-slate-900">
                                <User className="size-4 text-slate-400" />
                                {(r.profiles as any)?.full_name}
                              </div>
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`size-3.5 ${s <= r.rating ? 'fill-current' : 'fill-slate-100 text-slate-100'}`} />
                                ))}
                              </div>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{r.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  {limitAtMax && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>You have reached your borrowing limit of <strong>{borrowLimit?.limit}</strong> books. Return a book before borrowing another.</span>
                    </div>
                  )}
                  {selectedBook.available_copies > 0 ? (
                    <Button
                      className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold shadow-lg shadow-primary/20 gap-2 transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                      onClick={openReturnDateDialog}
                      disabled={limitAtMax}
                      title={limitAtMax ? t('borrowLimitReached') : undefined}
                    >
                      <CalendarCheck className="size-5" />
                      {t('requestToBorrow')}
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full h-14 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">
                      <Link href={`/dashboard/student/requests?title=${encodeURIComponent(selectedBook.title)}&author=${encodeURIComponent(selectedBook.author)}`}>
                        Notify &amp; Request a Copy
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Return Date Dialog (Phase 2) ── */}
      <Dialog open={returnDateDialogOpen} onOpenChange={setReturnDateDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-primary" />
              When will you return it?
            </DialogTitle>
            <DialogDescription>
              Choose your planned return date for &ldquo;{selectedBook?.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="return-date">Return Date</Label>
              <input
                id="return-date"
                type="date"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                min={toInputDate(getMinReturnDate())}
                max={toInputDate(getMaxReturnDate())}
                value={proposedReturnDate}
                onChange={e => {
                  setProposedReturnDate(e.target.value)
                  setReturnDateError(validateReturnDate(e.target.value))
                }}
              />
              <p className="text-xs text-slate-500">Maximum 15 days. Weekends (Sat/Sun) not allowed.</p>
              {returnDateError && (
                <p className="text-xs text-red-600 font-medium">{returnDateError}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setReturnDateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleRequestBorrow}
                disabled={requesting || !!returnDateError || !proposedReturnDate}
              >
                {requesting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Trigger rebuild
