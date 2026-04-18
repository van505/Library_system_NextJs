import type { SupabaseClient } from '@supabase/supabase-js'

export interface BorrowLimitResult {
  allowed: boolean
  current: number
  limit: number
}

export async function checkBorrowingLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<BorrowLimitResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('borrow_limit')
    .eq('id', userId)
    .single()

  const { data: setting } = await supabase
    .from('library_settings')
    .select('setting_value')
    .eq('setting_key', 'default_borrow_limit')
    .single()

  const limit: number =
    profile?.borrow_limit ?? parseInt(setting?.setting_value ?? '3')

  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('borrower_id', userId)
    .eq('status', 'borrowed')
    .eq('is_archived', false)

  const current = count ?? 0
  return { allowed: current < limit, current, limit }
}
