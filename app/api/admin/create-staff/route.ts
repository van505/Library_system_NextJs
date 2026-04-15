import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 1. Verify caller is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admins only.' }, { status: 403 })
    }

    // 2. Parse request
    const body = await req.json()
    const { email, password, fullName, role } = body

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (role !== 'staff' && role !== 'admin') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // 3. Use Service Role to create Auth User (bypasses restrictions/emails)
    const adminAuthClient = createServiceSupabaseClient()
    
    const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role }
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 4. Note: The database trigger `on_auth_user_created` we created will automatically
    // intercept this and create the profile row! But we can also specifically update/assert it
    // just in case using the service role.
    
    if (newUser.user) {
      const { error: profileError } = await adminAuthClient.from('profiles').upsert({
        id: newUser.user.id,
        full_name: fullName,
        role: role,
        is_active: true
      })
      if (profileError) {
         console.error('Manual profile upset error:', profileError)
      }
    }

    return NextResponse.json({ success: true, user: newUser.user })

  } catch (error: any) {
    console.error('Create staff error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
