import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkAndSendReminders } from '@/lib/dueDateReminders'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch ALL active borrowed transactions and group by user
    const { data: activeTx } = await supabase
      .from('transactions')
      .select('borrower_id')
      .eq('status', 'borrowed')
      .eq('is_archived', false)

    if (!activeTx || activeTx.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No active borrows found.' })
    }

    const uniqueUsers = [...new Set(activeTx.map(t => t.borrower_id).filter(Boolean))] as string[]

    let totalSent = 0
    for (const userId of uniqueUsers) {
      totalSent += await checkAndSendReminders(supabase, userId)
    }

    return NextResponse.json({ sent: totalSent, users_checked: uniqueUsers.length })
  } catch (err) {
    console.error('Reminder route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
