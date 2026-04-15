import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Call inside 'use client' components */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type Profile = {
  id: string
  full_name: string | null
  role: 'admin' | 'staff' | 'student'
  student_id: string | null
  created_at: string
  contact_number?: string | null
  grade_level?: string | null
  avatar_url?: string | null
  is_active?: boolean
}

export type Shelf = {
  id: string
  name: string
  description: string | null
  location: string
  created_at: string
}

export type Category = {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  created_at: string
}

export type Book = {
  id: string
  title: string
  author: string
  isbn: string | null
  genre: string | null
  shelf_id: string | null
  category_id?: string | null
  available: boolean
  total_copies: number
  available_copies: number
  description?: string | null
  cover_url?: string | null
  published_year?: string | null
  publisher?: string | null
  created_at: string
  shelves?: { name: string; location: string } | null
  categories?: { name: string; color: string; icon: string } | null
}

export type Transaction = {
  id: string
  book_id: string
  borrower_id: string | null
  borrowed_at: string | null
  due_date: string | null
  returned_at: string | null
  status: 'pending' | 'borrowed' | 'returned' | 'overdue'
  books?: { title: string; author: string } | null
  profiles?: { full_name: string | null; student_id: string | null; contact_number: string | null } | null
}

export type Notification = {
  id: string
  user_id: string | null
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'danger'
  is_read: boolean
  link: string | null
  created_at: string
}
