import { type NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
let genAI: GoogleGenerativeAI | null = null
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

export async function POST(request: NextRequest) {
  const { message } = await request.json() as { message: string }
  if (!message?.trim()) return Response.json({ error: 'Message is required' }, { status: 400 })

  // ── Get user session & role ─────────────────────────────────────────────
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userRole: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    userRole = profile?.role ?? 'student'
  }

  const isPrivileged = userRole === 'admin' || userRole === 'staff'

  // ── Keyword search on books ─────────────────────────────────────────────
  // Strip punctuation and filter tiny words to build search queries
  const keywords = message.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2).slice(0, 5)
  let booksData: Array<Record<string, unknown>> = []

  // Service role used here safely purely for reading catalog data for AI context 
  // (so Libby can answer without being blocked by student-only RLS for some edge cases, 
  // although books are mostly public anyway)
  const serviceClient = createServiceSupabaseClient()

  if (keywords.length > 0) {
    const searchFilter = keywords.map(k => `title.ilike.%${k}%,author.ilike.%${k}%,genre.ilike.%${k}%`).join(',')
    
    // Admin/Staff get full transaction tracking context, students only get availability
    const query = isPrivileged
      ? serviceClient.from('books').select('title, author, genre, total_copies, available_copies, shelves(name, location), transactions(status, due_date, profiles(full_name))').or(searchFilter).limit(8)
      : serviceClient.from('books').select('title, author, genre, total_copies, available_copies, shelves(name, location)').or(searchFilter).limit(8)

    const { data } = await query
    booksData = (data ?? []) as Array<Record<string, unknown>>
  }

  // ── Build catalog context ───────────────────────────────────────────────
  let catalogSection: string

  if (booksData.length === 0) {
    catalogSection = 'No matching books found in the catalog for this query. Inform the user they can request the book on their dashboard.'
  } else {
    catalogSection = booksData.map((b: any, i) => {
      const shelf = b.shelves ? `Shelf: "${b.shelves.name}" | Location: ${b.shelves.location}` : 'Shelf: Not assigned'
      const status = b.available_copies > 0 ? `Available (${b.available_copies} of ${b.total_copies} copies)` : 'Currently all copies are borrowed'

      let borrowerInfo = ''
      if (isPrivileged && b.available_copies === 0 && b.transactions) {
        const activeTxs = (b.transactions as any[]).filter(t => t.status === 'borrowed')
        if (activeTxs.length > 0) {
           const tx = activeTxs[0]
           borrowerInfo = `\n   Borrower: ${tx.profiles?.full_name ?? 'Unknown'}`
           if (tx.due_date) borrowerInfo += ` | Due: ${new Date(tx.due_date).toLocaleDateString()}`
        }
      }

      return `${i + 1}. "${b.title}" by ${b.author}${b.genre ? ` [${b.genre}]` : ''}\n   ${shelf}\n   Status: ${status}${borrowerInfo}`
    }).join('\n\n')
  }

  // ── System prompt ───────────────────────────────────────────────────────
  const roleContext = isPrivileged
    ? 'You are speaking with a school library staff member or administrator. You are allowed to see and state borrower information and deadlines.'
    : 'You are speaking with a student. Only show them shelf location and availability. Never invent availability.'

  const prompt = `You are Libby, a friendly, concise, and helpful school library assistant.
${roleContext}

Library catalog data relevant to the user query:

${catalogSection}

Rules:
- Answer ONLY based on the exact data provided above.
- Always state the shelf name, location, and true availability status.
- If the book is not found or has 0 copies, tell them they can easily submit a "Book Request" from their dashboard.
- Do not make up book titles, shelves, or locations. Keep your tone cheerful and very concise.

User message to answer: "${message}"`

  // ── Call Gemini Flash 2.0 ───────────────────────────────────────────────
  if (!genAI) return Response.json({ error: 'Gemini API not configured.' }, { status: 503 })

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    const reply = result.response.text()

    return Response.json({ reply, booksFound: booksData.length })
  } catch (error) {
    console.error('Gemini error:', error)
    return Response.json({ error: 'AI service unavailable. Please try again.' }, { status: 502 })
  }
}
