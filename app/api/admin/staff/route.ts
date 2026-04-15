import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServiceSupabaseClient()

    // Fetch all admin and staff profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at, contact_number, student_id')
      .in('role', ['admin', 'staff'])
      .order('role')
      .order('full_name')

    if (error) throw error

    // Enrich each profile with email from auth.admin
    const enriched = await Promise.all(
      (profiles ?? []).map(async (p) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(p.id)
          return { ...p, email: authUser?.user?.email ?? null }
        } catch {
          return { ...p, email: null }
        }
      })
    )

    return NextResponse.json({ staff: enriched })
  } catch (err: any) {
    console.error('Staff fetch error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
