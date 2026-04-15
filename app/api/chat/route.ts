import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages } = body
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 })
    }

    const latestMessage = messages[messages.length - 1]?.content || ''

    // 1. Get user session & role
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let role = 'student'
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p) role = p.role
    }

    // 2. Extract keywords simply
    const words = latestMessage.toLowerCase().split(' ').filter(w => w.length > 3)
    
    // 3. Query DB context
    // We will do a generic search using the keywords
    let contextData = ''
    if (words.length > 0) {
      // Create an advanced OR filter for all keywords against title and author
      const orConditions = words.map(w => `title.ilike.%${w}%,author.ilike.%${w}%`).join(',')
      const { data: bData } = await supabase.from('books')
        .select('*, shelves(name, location), categories(name)')
        .or(orConditions)
        .limit(10)
      
      if (bData && bData.length > 0) {
        contextData = bData.map(b => 
          `Book: "${b.title}" by ${b.author}. ` +
          `Status: ${b.available_copies} of ${b.total_copies} available. ` +
          (b.shelves ? `Location: ${(b.shelves as any).name} (${(b.shelves as any).location}). ` : '') +
          (role !== 'student' ? `[ID: ${b.id}] ` : '')
        ).join('\
')
      }
    }

    // If searching for "all" or generic, get some random overview 
    if (!contextData) {
       const { data: bData } = await supabase.from('books').select('title, author, available_copies').limit(5)
       if (bData) {
         contextData = `Quick sample of catalog: 
` + bData.map(b => `"${b.title}" by ${b.author} (${b.available_copies} available)`).join(', ')
       }
    }

    // 4. Generate Content with Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const prompt = `
    You are Libby, a friendly school library assistant.
    Answer the user based ONLY on this library data context below:
    
    --- DATA CONTEXT ---
    ${contextData || 'No specific matching books found in the immediate search.'}
    --------------------

    User role: ${role}
    ${role !== 'student' ? 'Include borrower info/ID if requested by staff.' : 'Do not expose other student names.'}
    
    If the book is not found in the context, say it might not be in our catalog and suggest they request it. 
    Format your response cleanly. Be warm, concise, and helpful. Do not mention "based on the context". Just answer.

    User says: "${latestMessage}"
    `

    const result = await model.generateContent(prompt)
    const replyText = result.response.text()

    // Send back OpenAI formatted message block (as expected by standard useChat)
    // Actually the requested format from the user was to return { reply }, but if they are using the standard Vercel AI useChat, it expects plain text or specific JSON streams. Let's return JSON as { reply } to match the user's specific spec exactly.
    return NextResponse.json({ reply: replyText })
    
  } catch (error: any) {
    console.error('Chat error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
