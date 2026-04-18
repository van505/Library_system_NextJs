import { differenceInDays, startOfDay } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function checkAndSendReminders(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  let sent = 0
  const today = startOfDay(new Date())

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, due_date, reminder_3day_sent, reminder_1day_sent, reminder_due_sent, books(title)')
    .eq('borrower_id', userId)
    .eq('status', 'borrowed')
    .eq('is_archived', false)

  if (!transactions || transactions.length === 0) return 0

  for (const t of transactions) {
    if (!t.due_date) continue
    const book = (t.books as any)
    const bookTitle = book?.title ?? 'A book'
    const dueDate = startOfDay(new Date(t.due_date))
    const daysLeft = differenceInDays(dueDate, today)
    const dueDateStr = dueDate.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    // 3-day reminder
    if (daysLeft === 3 && !t.reminder_3day_sent) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Book Due in 3 Days',
        message: `📚 Reminder: "${bookTitle}" is due in 3 days (${dueDateStr}). Please prepare to return it.`,
        type: 'warning',
        link: '/dashboard/student/borrowed',
      })
      await supabase
        .from('transactions')
        .update({ reminder_3day_sent: true })
        .eq('id', t.id)
      sent++
    }

    // 1-day reminder
    if (daysLeft === 1 && !t.reminder_1day_sent) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Book Due Tomorrow',
        message: `⚠️ Reminder: "${bookTitle}" is due TOMORROW (${dueDateStr}). Please return it on time.`,
        type: 'warning',
        link: '/dashboard/student/borrowed',
      })
      await supabase
        .from('transactions')
        .update({ reminder_1day_sent: true })
        .eq('id', t.id)
      sent++
    }

    // Due today / overdue
    if (daysLeft <= 0 && !t.reminder_due_sent) {
      const isOverdue = daysLeft < 0
      await supabase.from('notifications').insert({
        user_id: userId,
        title: isOverdue ? 'Book Overdue!' : 'Book Due Today — Final Reminder',
        message: isOverdue
          ? `🚨 OVERDUE: "${bookTitle}" was due on ${dueDateStr}. Please return it immediately to avoid penalties.`
          : `🚨 "${bookTitle}" is due TODAY (${dueDateStr}). Please return it to the library immediately.`,
        type: 'danger',
        link: '/dashboard/student/borrowed',
      })
      await supabase
        .from('transactions')
        .update({ reminder_due_sent: true })
        .eq('id', t.id)
      sent++
    }
  }

  return sent
}
