'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BookOpen, Bot, Search, ArrowRight, GraduationCap, Info, AlertTriangle, CheckCircle2, ChevronRight, MessageSquare, MapPin, BookMarked, Sparkles, Book, Compass, Library, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Book as SupabaseBook, Profile } from '@/lib/supabase'
import { getStudentCount } from '@/app/actions/stats'

type BookWithShelf = SupabaseBook & { 
  shelves?: { name: string; location: string } | null,
  book_categories?: { categories?: { name: string } }[] | null
}
type Announcement = { id: string; title: string; content: string; type: string; created_at: string }

// Map categories to icons/colors for premium UI
const CATEGORY_MAP: Record<string, { icon: string, color: string }> = {
  'All': { icon: '🌐', color: 'bg-slate-900 text-white border-slate-900' },
  'Programming': { icon: '💻', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  'Computer Science': { icon: '⚙️', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
  'Fiction': { icon: '🎭', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  'Science': { icon: '🔬', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  'History': { icon: '⌛', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  'Mathematics': { icon: '📏', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
  'Literature': { icon: '📖', color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
}

const getCategoryStyle = (cat: string) => {
  return CATEGORY_MAP[cat] || { icon: '📚', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' }
}

export default function HomePage() {
  const supabase = createClient()
  const { profile } = useAuthStore()
  const [stats, setStats] = React.useState({ books: 0, available: 0, shelves: 0, students: 0 })
  const [books, setBooks] = React.useState<BookWithShelf[]>([])
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('All')
  const [borrowingId, setBorrowingId] = React.useState<string | null>(null)
  const [uniqueCategories, setUniqueCategories] = React.useState<string[]>([])

  React.useEffect(() => {
    async function load() {
      const [bRes, sRes, studentCount, aRes, authRes] = await Promise.all([
        supabase.from('books').select('*, shelves(name, location), book_categories(categories(name))').order('created_at', { ascending: false }),
        supabase.from('shelves').select('id', { count: 'exact' }),
        getStudentCount(),
        supabase.from('announcements').select('*').eq('is_active', true).eq('show_on_landing', true).order('created_at', { ascending: false }),
        supabase.auth.getUser()
      ])

      const allBooks = (bRes.data ?? []) as BookWithShelf[]
      setBooks(allBooks)
      setStats({
        books: allBooks.reduce((acc, b) => acc + (b.total_copies ?? 1), 0),
        available: allBooks.filter(b => b.available_copies > 0).length,
        shelves: sRes.count ?? 0,
        students: studentCount,
      })
      setAnnouncements(aRes.data ?? [])

      // Extract unique categories
      const cats = new Set<string>()
      allBooks.forEach(b => {
        b.book_categories?.forEach(bc => {
          if (bc.categories?.name) cats.add(bc.categories.name)
        })
      })
      setUniqueCategories(['All', ...Array.from(cats)].slice(0, 8))

      if (authRes.data.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', authRes.data.user.id).single()
        useAuthStore.getState().setProfile(data as Profile)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const filteredBooks = books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q)
    
    let matchCat = categoryFilter === 'All'
    if (!matchCat && b.book_categories) {
      matchCat = b.book_categories.some(bc => bc.categories?.name === categoryFilter)
    }
    
    return matchSearch && matchCat
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
      borrower_id: profile.id,
      status: 'pending',
      borrowed_at: new Date().toISOString(),
      due_date: dueDate.toISOString(),
    }])

    if (error) { toast.error(error.message) }
    else { toast.success(`Borrow request for "${book.title}" submitted!`) }
    setBorrowingId(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans selection:bg-indigo-500/30">
      {/* ── Section 1: Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-32 px-4 flex flex-col items-center justify-center text-slate-900 overflow-hidden min-h-[90vh]">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-br from-indigo-400/20 via-purple-400/20 to-fuchsia-400/20 blur-[100px] rounded-[100%] pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-400/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 z-[-5] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-4xl text-center mt-12">
          <Badge className="bg-white/80 backdrop-blur-md text-indigo-700 hover:bg-white border-indigo-100/50 shadow-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-widest flex gap-2 items-center">
            <Sparkles className="size-3.5 text-indigo-500" /> Next-Gen Library Experience
          </Badge>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.1]">
            Your school library, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-300% animate-gradient">
              supercharged with AI
            </span>
          </h1>
          
          <p className="text-lg text-slate-500 max-w-2xl mt-2 leading-relaxed">
            Discover your next favorite book instantly. Search the catalog, find exact shelf locations, and chat with our AI Librarian to get personalized recommendations.
          </p>

          {/* Premium Glassmorphic Search Bar */}
          <div className="relative w-full max-w-2xl mt-6 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-white/80 backdrop-blur-xl border border-white rounded-2xl shadow-xl overflow-hidden p-2">
                <Search className="size-5 text-indigo-400 ml-4 shrink-0" />
                <input
                  type="text"
                  placeholder="Search catalog or ask Libby..."
                  className="w-full h-12 px-4 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-base"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      document.getElementById('browse-section')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                />
                <div className="flex gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-indigo-600 hover:bg-indigo-50 font-bold h-10 px-4 rounded-xl hidden sm:flex"
                    onClick={() => {
                      if (search.trim()) {
                         window.location.href = '/chat?q=' + encodeURIComponent(search.trim())
                      } else {
                         window.location.href = '/chat'
                      }
                    }}
                  >
                    <Bot className="size-4 mr-2" /> Ask AI
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 h-10 shadow-md"
                    onClick={() => {
                      document.getElementById('browse-section')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Search
                  </Button>
                </div>
              </div>
          </div>

          {!profile ? (
            <div className="flex gap-4 mt-8">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-12 shadow-lg shadow-indigo-600/20" asChild>
                <Link href="/login">Sign In <ArrowRight className="ml-2 size-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 rounded-full px-8 h-12 shadow-sm" asChild>
                <Link href="/register">Student Registration</Link>
              </Button>
            </div>
          ) : (
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-12 mt-8 shadow-lg shadow-indigo-600/20" asChild>
              <Link href="/dashboard">Access Dashboard <ArrowRight className="ml-2 size-4" /></Link>
            </Button>
          )}

          {/* Premium Live Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            {[
              { icon: Book, value: stats.books, label: 'Total Books', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: CheckCircle2, value: stats.available, label: 'Available Now', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { icon: Library, value: stats.shelves, label: 'Shelves', color: 'text-purple-500', bg: 'bg-purple-50' },
              { icon: GraduationCap, value: stats.students, label: 'Students', color: 'text-amber-500', bg: 'bg-amber-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white shadow-sm flex flex-col items-center justify-center text-center">
                <div className={`size-10 rounded-full flex items-center justify-center mb-2 ${stat.bg}`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                {loading ? <Skeleton className="h-6 w-12 mb-1" /> : <span className="text-2xl font-black text-slate-800">{stat.value}</span>}
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Announcements ─────────────────────────────────────────── */}
      {announcements.length > 0 && (
        <section className="bg-white border-y border-slate-200 py-8 px-4 relative z-20 shadow-sm">
          <div className="max-w-6xl mx-auto flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Zap className="size-4 text-amber-500" /> Latest Announcements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.slice(0,2).map(ann => (
                <div key={ann.id} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all hover:shadow-md ${ann.type === 'warning' ? 'bg-amber-50/50 border-amber-200' :
                  ann.type === 'success' ? 'bg-emerald-50/50 border-emerald-200' :
                    'bg-blue-50/50 border-blue-200'
                  }`}>
                  {ann.type === 'warning' ? <AlertTriangle className="size-6 shrink-0 text-amber-500" /> :
                    ann.type === 'success' ? <CheckCircle2 className="size-6 shrink-0 text-emerald-500" /> :
                      <Info className="size-6 shrink-0 text-blue-500" />}
                  <div>
                    <h4 className="font-bold text-slate-900">{ann.title}</h4>
                    <p className="text-sm mt-1 text-slate-600 leading-relaxed">{ann.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 2: Featured Books ────────────────────────────────────────── */}
      <section id="browse-section" className="py-24 px-4 max-w-7xl mx-auto w-full relative z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Browse Collection</h2>
            <p className="text-slate-500 mt-2">Discover popular titles and new arrivals.</p>
          </div>
          <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full font-semibold" asChild>
            <Link href="/dashboard/student/browse">View Full Directory <ArrowRight className="ml-2 size-4" /></Link>
          </Button>
        </div>

        {/* Dynamic Premium Category Filters */}
        <div className="flex gap-3 overflow-x-auto pb-6 mb-4 scrollbar-hide snap-x">
          {uniqueCategories.map(cat => {
            const style = getCategoryStyle(cat)
            const isActive = categoryFilter === cat
            return (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`snap-start flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border shadow-sm ${
                  isActive 
                  ? 'bg-slate-900 text-white border-slate-900 scale-105 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow'
                }`}>
                <span className="text-base">{style.icon}</span> {cat}
              </button>
            )
          })}
        </div>

        {/* Premium Book Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-3xl" />)
          ) : filteredBooks.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
              <Compass className="size-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No books found</h3>
              <p className="text-slate-500 mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            filteredBooks.map(b => {
              const mainCat = b.book_categories?.[0]?.categories?.name || 'General'
              const catStyle = getCategoryStyle(mainCat)
              
              return (
              <Card key={b.id} className="overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer">
                <div className="relative h-48 overflow-hidden bg-slate-100 flex items-center justify-center p-4">
                  {/* Decorative backdrop */}
                  <div className="absolute inset-0 opacity-20 blur-2xl transition-opacity group-hover:opacity-40" 
                       style={{ background: b.cover_url ? `url(${b.cover_url})` : catStyle.color.split(' ')[0] }}></div>
                  
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="h-full w-auto object-cover rounded-md shadow-lg relative z-10 group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className={`size-full rounded-xl flex items-center justify-center relative z-10 shadow-inner ${catStyle.color}`}>
                       <span className="text-5xl">{catStyle.icon}</span>
                    </div>
                  )}
                  
                  {/* Floating Availability Badge */}
                  <div className="absolute top-3 right-3 z-20">
                    <Badge className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-md ${b.available_copies > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' : 'bg-rose-500 hover:bg-rose-600 text-white border-transparent'}`}>
                      {b.available_copies > 0 ? 'Available' : 'Borrowed'}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-5 flex-1 flex flex-col gap-1.5 bg-white relative z-20">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{mainCat}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">{b.title}</h3>
                  <p className="text-xs font-medium text-slate-500 line-clamp-1">{b.author}</p>
                  
                  {b.shelves && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <MapPin className="size-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-tight">Shelf <b>{b.shelves.name}</b> {b.shelves.location ? `(${b.shelves.location})` : ''}</span>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-4 flex gap-2">
                    <Button className="w-full rounded-xl text-xs font-bold bg-slate-900 hover:bg-indigo-600 text-white shadow-md transition-colors"
                        disabled={b.available_copies === 0 || borrowingId === b.id}
                        onClick={(e) => { e.preventDefault(); handleBorrowRequest(b); }}>
                        {borrowingId === b.id ? 'Processing...' : 'Borrow Book'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )
            })
          )}
        </div>
      </section>

      {/* ── Section 4: AI Chat Preview ────────────────────────────────────────── */}
      <section className="bg-slate-900 py-32 px-4 text-white relative overflow-hidden mt-12">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
          <div className="flex-1 flex flex-col gap-6">
            <Badge className="bg-white/10 text-white hover:bg-white/20 w-fit border border-white/20 px-4 py-1.5 text-xs rounded-full font-bold uppercase tracking-widest backdrop-blur-md">
              <Bot className="size-4 mr-2 inline-block" /> Powered by Google Gemini
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black leading-[1.1]">Meet Libby,<br/>Your AI Librarian</h2>
            <p className="text-slate-300 text-lg leading-relaxed max-w-lg">
              Don't know where to look? Just ask Libby! She knows exactly where every book is located on the shelves and if it's currently available in real-time.
            </p>
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Try asking things like:</p>
              <div className="flex flex-wrap gap-2">
                {['"Where is The Great Gatsby located?"', '"Do you have any books on Python?"', '"What fiction is available today?"'].map(q => (
                  <span key={q} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-slate-200 backdrop-blur-sm cursor-default hover:bg-white/10 transition-colors">
                    {q}
                  </span>
                ))}
              </div>
            </div>
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-8 w-fit mt-6 font-bold shadow-xl shadow-white/10" asChild>
              <Link href="/chat"><MessageSquare className="size-4 mr-2" /> Chat with Libby Now</Link>
            </Button>
          </div>
          
          <div className="flex-1 w-full max-w-md relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-[2rem] blur-lg opacity-50"></div>
            <div className="bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[400px] relative z-10">
              <div className="bg-white/5 p-4 flex items-center gap-4 border-b border-white/10">
                <div className="size-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-inner border border-white/20">
                  <Bot className="size-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Libby</p>
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span> Online • AI Assistant
                  </p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-5 flex-1 bg-gradient-to-b from-transparent to-black/20">
                <div className="flex gap-3">
                  <div className="w-8 shrink-0" />
                  <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-4 text-sm ml-auto shadow-md">
                    Where is the Great Gatsby?
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                    <Bot className="size-4 text-indigo-300" />
                  </div>
                  <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm p-4 text-sm border border-white/5 shadow-md leading-relaxed">
                    "The Great Gatsby" by F. Scott Fitzgerald is currently available! You can find it on <b>Shelf "Fiction A-G"</b> (Location: 2nd Floor, Isle 3). Would you like to borrow it?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: How it works ─────────────────────────────────────────── */}
      <section className="bg-white py-32 px-4 border-b border-slate-200">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">Simple Process</Badge>
          <h2 className="text-4xl font-black text-slate-900 mb-16 tracking-tight">How SchoolLib Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: 'Search or Ask AI', desc: 'Find your book instantly via our live catalog or ask Libby the AI assistant for highly personalized recommendations.' },
              { icon: MapPin, title: 'Locate the Shelf', desc: 'Get exact physical shelf locations and real-time availability status so you never waste time searching the aisles.' },
              { icon: BookOpen, title: 'Borrow & Read', desc: 'Place a borrow request with one click and simply pick up your book from the librarian desk.' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-5 bg-slate-50 p-10 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="size-20 rounded-3xl bg-white shadow-md flex items-center justify-center border border-slate-100 relative">
                  <div className="absolute -top-3 -right-3 size-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md">{i + 1}</div>
                  <step.icon className="size-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Footer ─────────────────────────────────────────────── */}
      <footer className="bg-slate-50 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center">
               <BookOpen className="size-4 text-white" />
            </div>
            <span className="font-black text-xl text-slate-900 tracking-tight">SchoolLib</span>
          </div>
          <div className="flex gap-8 text-sm font-semibold text-slate-500">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
            <Link href="/chat" className="hover:text-indigo-600 transition-colors">AI Chat</Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Admin / Staff Login</Link>
          </div>
          <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 gap-2 py-1.5 px-4 rounded-full shadow-sm">
            <Bot className="size-4 text-indigo-500" /> Powered by AI
          </Badge>
        </div>
        <div className="max-w-6xl mx-auto mt-12 text-center text-sm font-medium text-slate-400">
          &copy; {new Date().getFullYear()} School Library System. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
