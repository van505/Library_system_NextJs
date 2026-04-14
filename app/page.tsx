'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BookOpen, Bot, Search, ArrowRight, GraduationCap, Info, AlertTriangle, CheckCircle2, ChevronRight, MessageSquare, MapPin, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import type { Book, Profile } from '@/lib/supabase'

type BookWithShelf = Book & { shelves?: { name: string; location: string } | null }
type Announcement = { id: string; title: string; content: string; type: string; created_at: string }

export default function HomePage() {
  const supabase = createClient()
  const { profile } = useAuthStore()
  const [stats, setStats] = React.useState({ books: 0, available: 0, shelves: 0, students: 0 })
  const [books, setBooks] = React.useState<BookWithShelf[]>([])
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [genreFilter, setGenreFilter] = React.useState('All')
  const [borrowingId, setBorrowingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      const [bRes, sRes, uRes, aRes, authRes] = await Promise.all([
        supabase.from('books').select('*, shelves(name, location)').order('created_at', { ascending: false }),
        supabase.from('shelves').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.auth.getUser()
      ])

      const allBooks = (bRes.data ?? []) as BookWithShelf[]
      setBooks(allBooks)
      setStats({
        books: allBooks.reduce((acc, b) => acc + (b.total_copies ?? 1), 0),
        available: allBooks.filter(b => b.available_copies > 0).length,
        shelves: sRes.count ?? 0,
        students: uRes.count ?? 0,
      })
      setAnnouncements(aRes.data ?? [])

      if (authRes.data.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', authRes.data.user.id).single()
        useAuthStore.getState().setProfile(data as Profile)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const genres = ['All', ...Array.from(new Set(books.map(b => b.genre).filter(Boolean)))].slice(0, 8) as string[]

  const filteredBooks = books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q)
    const matchGenre = genreFilter === 'All' || b.genre === genreFilter
    return matchSearch && matchGenre
  }).slice(0, 12)

  async function handleBorrowRequest(book: BookWithShelf) {
    if (!profile) {
      toast.error('You must be signed in to borrow a book.')
      return
    }
    setBorrowingId(book.id)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    const { error } = await supabase.from('transactions').insert([{
      book_id: book.id,
      borrower_id: profile.id, // we still use borrower_id as it was standard
      status: 'pending',
      borrowed_at: new Date().toISOString(),
      due_date: dueDate.toISOString(),
    }])

    if (error) { toast.error(error.message) }
    else { toast.success(`Borrow request for "${book.title}" submitted!`) }
    setBorrowingId(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-32 px-4 flex flex-col items-center justify-center text-white overflow-hidden min-h-[90vh]">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900" />
        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl text-center">
          <div className="size-24 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
            <BookOpen className="size-12 text-white" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2">
              <GraduationCap className="size-5 text-indigo-300" />
              <span className="text-sm font-semibold tracking-widest uppercase text-indigo-300">
                SchoolLib System
              </span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
              Your school library, <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                supercharged with AI
              </span>
            </h1>
          </div>

          <div className="relative w-full max-w-xl mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, or keyword..."
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {!profile ? (
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 text-base shadow-lg shadow-indigo-600/20" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-xl px-8 h-12 text-base" asChild>
                <Link href="/register">Register as Student</Link>
              </Button>
            </div>
          ) : (
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 mt-4" asChild>
              <Link href="/dashboard">Go to Dashboard <ArrowRight className="ml-2 size-4" /></Link>
            </Button>
          )}

          {/* Live Stats */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm font-medium text-indigo-200 bg-black/20 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/10">
            {loading ? (
              <Skeleton className="h-5 w-64 bg-white/10" />
            ) : (
              <>
                <div className="flex items-center gap-2"><BookOpen className="size-4" /> <span className="text-white text-lg font-bold">{stats.books}</span> Books</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> <span className="text-white text-lg font-bold">{stats.available}</span> Available Now</div>
                <div className="flex items-center gap-2"><BookMarked className="size-4" /> <span className="text-white text-lg font-bold">{stats.shelves}</span> Shelves</div>
                <div className="flex items-center gap-2"><GraduationCap className="size-4" /> <span className="text-white text-lg font-bold">{stats.students}</span> Students</div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 3: Announcements (Moved up if active) ─────────────── */}
      {announcements.length > 0 && (
        <section className="bg-white border-b border-slate-200 py-6 px-4">
          <div className="max-w-6xl mx-auto flex flex-col gap-3">
            {announcements.map(ann => (
              <div key={ann.id} className={`flex items-start gap-4 p-4 rounded-xl border ${ann.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                ann.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                  'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                {ann.type === 'warning' ? <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600" /> :
                  ann.type === 'success' ? <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600" /> :
                    <Info className="size-5 shrink-0 mt-0.5 text-blue-600" />}
                <div>
                  <h4 className="font-semibold text-sm">{ann.title}</h4>
                  <p className="text-sm mt-1 opacity-90">{ann.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: Featured Books ────────────────────────────────── */}
      <section className="py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Browse Our Collection</h2>
          <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" asChild>
            <Link href="/dashboard/student/browse">View All Directory <ChevronRight className="ml-1 size-4" /></Link>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {genres.map(g => (
            <button key={g} onClick={() => setGenreFilter(g)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${genreFilter === g
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}>
              {g}
            </button>
          ))}
        </div>

        {/* Book Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)
          ) : filteredBooks.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <BookOpen className="size-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No books found matching your criteria.</p>
            </div>
          ) : (
            filteredBooks.map(b => (
              <Card key={b.id} className="overflow-hidden bg-white rounded-2xl border border-slate-200 flex flex-col">
                <div className="h-32 flex items-center justify-center shrink-0 border-b border-slate-100"
                  style={{
                    background: b.cover_url
                      ? `url(${b.cover_url}) center/cover`
                      : `linear-gradient(135deg, #${Math.floor(Math.random() * 16777215).toString(16)}20, #${Math.floor(Math.random() * 16777215).toString(16)}40)`
                  }}>
                  {!b.cover_url && <span className="text-4xl font-bold text-slate-800/20">{b.title.charAt(0)}</span>}
                </div>
                <CardContent className="p-5 flex-1 flex flex-col gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 line-clamp-1">{b.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{b.author}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {b.genre && <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">{b.genre}</Badge>}
                    <Badge variant="outline" className={`border-transparent ${b.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {b.available_copies > 0 ? 'Available' : 'Borrowed'}
                    </Badge>
                  </div>
                  {b.shelves && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-1">
                      📍 {b.shelves.name} - {b.shelves.location}
                    </p>
                  )}
                  <div className="mt-auto pt-4 flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl text-xs" asChild>
                      <Link href={`/dashboard/student/browse?search=${encodeURIComponent(b.title)}`}>Details</Link>
                    </Button>
                    <Button className="flex-1 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700"
                        disabled={b.available_copies === 0 || borrowingId === b.id}
                        onClick={() => handleBorrowRequest(b)}>
                        {borrowingId === b.id ? 'Processing...' : 'Borrow'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* ── Section 4: AI Chat Preview ───────────────────────────────── */}
      <section className="bg-indigo-900 py-24 px-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-96 bg-violet-600 blur-[120px] rounded-full opacity-50 pointer-events-none" />
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="flex-1 flex flex-col gap-6">
            <Badge className="bg-indigo-500/30 text-indigo-200 hover:bg-indigo-500/40 w-fit border-none px-3 py-1 text-xs">
              <Bot className="size-3.5 mr-1.5" /> Introducing Libby
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Meet your new AI Librarian</h2>
            <p className="text-indigo-200 text-lg leading-relaxed">
              Don't know where to look? Just ask Libby! Our AI assistant knows exactly where every book is located on the shelves and if it's currently available.
            </p>
            <div className="flex flex-col gap-3 mt-2">
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {['Where is Harry Potter?', 'Do you have science books?', 'What is available today?'].map(q => (
                  <span key={q} className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm text-indigo-100">
                    "{q}"
                  </span>
                ))}
              </div>
            </div>
            <Button size="lg" className="bg-white text-indigo-900 hover:bg-slate-100 rounded-xl px-8 w-fit mt-4" asChild>
              <Link href="/chat"><MessageSquare className="size-4 mr-2" /> Ask Libby Now</Link>
            </Button>
          </div>
          <div className="flex-1 w-full max-w-sm">
            <div className="bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden shadow-indigo-900/50 flex flex-col h-80">
              <div className="bg-[#1e293b] p-4 flex items-center gap-3 border-b border-white/5">
                <div className="size-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                  <Bot className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Libby</p>
                  <p className="text-xs text-emerald-400">Online</p>
                </div>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="w-8 shrink-0" />
                  <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 text-sm ml-auto">
                    Where is the Great Gatsby?
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-[#1e293b] flex items-center justify-center shrink-0 border border-white/10">
                    <Bot className="size-4 text-indigo-300" />
                  </div>
                  <div className="bg-[#1e293b] text-slate-200 rounded-2xl rounded-tl-sm p-3 text-sm border border-white/5 shadow-sm">
                    "The Great Gatsby" by F. Scott Fitzgerald is currently available! You can find it on Shelf "Fiction A-G" (Location: 2nd Floor, Isle 3).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: How it works ──────────────────────────────────── */}
      <section className="bg-slate-50 py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">How SchoolLib Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: '1. Search or Ask AI', desc: 'Find your book via our catalog or ask Libby the AI assistant.' },
              { icon: MapPin, title: '2. Find the Shelf', desc: 'Get exact shelf locations and real-time availability status.' },
              { icon: BookOpen, title: '3. Borrow & Read', desc: 'Place a borrow request and pick up your book from the library.' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="size-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <step.icon className="size-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Footer ────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BookOpen className="size-6 text-indigo-600" />
            <span className="font-bold text-lg text-slate-900">SchoolLib</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            <Link href="/chat" className="hover:text-indigo-600">AI Chat</Link>
            <Link href="/login" className="hover:text-indigo-600">Admin/Staff Login</Link>
          </div>
          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 gap-1.5 py-1">
            <Bot className="size-3" /> Powered by AI
          </Badge>
        </div>
        <div className="max-w-6xl mx-auto mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} School Library System. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
