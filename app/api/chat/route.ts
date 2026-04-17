import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    // 2. Fetch ALL available books with shelf/location info
    const { data: availableBooks } = await supabase
      .from('books')
      .select('title, author, available_copies, total_copies, shelves(name, location), book_categories(categories(name))')
      .gt('available_copies', 0)

    let contextData = ''
    if (availableBooks && availableBooks.length > 0) {
      contextData = availableBooks.map(b => {
        const cats = ((b.book_categories ?? []) as any[])
          .map((bc: any) => bc.categories?.name)
          .filter(Boolean)
          .join(', ')
        const shelf = (b.shelves as any)
        const location = shelf
          ? 'Located at: Shelf "' + shelf.name + '"' + (shelf.location ? ', ' + shelf.location : '') + '.'
          : 'Shelf location: Not assigned.'
        return '"' + b.title + '" by ' + b.author + '. ' + location + ' Available: ' + b.available_copies + '/' + b.total_copies + ' copies.' + (cats ? ' Categories: ' + cats + '.' : '')
      }).join('\n')
    }

    // 3. Build prompt
    const systemPrompt = `You are Libby, a helpful school library AI assistant.
User role: ${role}
Here is the complete list of AVAILABLE books in our library, along with their shelf locations:
${contextData || 'No books currently available.'}

Guidelines:
1. ONLY recommend books from the list above.
2. When a student asks WHERE a book is located, always tell them the shelf name and location from the data above. This is very important.
3. If a book is not in the list, politely say it is not currently available and suggest an alternative from the list.
4. Be warm, friendly, and concise. Do not say "based on the data" — just act naturally as the school librarian.
5. When listing book locations, format it clearly, e.g.: "You can find it at Shelf 'Science A', located on the second floor."`

    // 4. Call Google Gemini API directly using REST
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    // Prepare Gemini chat history format. System prompt goes into a 'system_instruction' or prefix.
    const promptPayload = {
      system_instruction: {
        parts: { text: systemPrompt }
      },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    }

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promptPayload),
    })

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}))
      throw new Error(errData?.error?.message || 'Gemini API error: ' + geminiRes.status)
    }

    const geminiData = await geminiRes.json()
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply: replyText })

  } catch (error: any) {
    console.error('Chat error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
