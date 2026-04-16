'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { logActivity, ACTION_TYPES } from '@/lib/activityLog'
import { notifyUser } from '@/lib/notifyAdmins'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { CheckCircle2, RotateCcw } from 'lucide-react'

// Rank to determine "worst" condition: smaller is worse OR you can use an array index
const CONDITIONS = ['excellent', 'good', 'fair', 'damaged'] as const

type ReturnDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId: string | null
  bookId: string | null
  studentId: string | null
  bookTitle: string
  onSuccess: () => void
}

export function ReturnDialog({ open, onOpenChange, transactionId, bookId, studentId, bookTitle, onSuccess }: ReturnDialogProps) {
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const profile = useAuthStore(s => s.profile)

  const handleReturnConfirm = async () => {
    if (!transactionId || !bookId) return
    setLoading(true)

    try {
      // 1. Fetch current book state (condition + copies)
      const { data: bk, error: bkErr } = await supabase
        .from('books')
        .select('available_copies, total_copies, condition')
        .eq('id', bookId)
        .single()

      if (bkErr) throw bkErr

      // Determine 'worst' condition between current and new
      const currentCondIndex = CONDITIONS.indexOf(bk.condition || 'good')
      const newCondIndex = CONDITIONS.indexOf(condition as any)
      const finalCondition = newCondIndex > currentCondIndex ? condition : bk.condition

      // 2. Wrap the return into multiple coordinated updates
      // A. Update transaction
      const { error: txError } = await supabase.from('transactions')
        .update({ 
          status: 'returned', 
          returned_at: new Date().toISOString(),
          return_condition: condition 
        })
        .eq('id', transactionId)

      if (txError) throw txError

      // B. Update book (copies + condition)
      await supabase.from('books')
        .update({ 
          available_copies: Math.min(bk.available_copies + 1, bk.total_copies),
          condition: finalCondition
        })
        .eq('id', bookId)

      // C. Insert condition history
      await supabase.from('book_condition_history').insert({
        book_id: bookId,
        condition: condition,
        notes: notes || null,
        noted_by: profile?.id
      })

      // D. User Notification
      if (studentId) {
        await notifyUser(
          studentId, 
          'Book Returned ✅',
          `Thank you! "${bookTitle}" has been marked as returned.`,
          'success', 
          '/dashboard/student/requests'
        )
      }

      // E. Activity Log
      await logActivity(supabase, {
        performed_by: profile?.id ?? '',
        role: profile?.role ?? 'staff',
        action_type: ACTION_TYPES.RETURN_PROCESSED,
        entity_type: 'transaction',
        entity_id: transactionId,
        description: `${profile?.full_name ?? 'Staff'} processed return of '${bookTitle}'. Condition: ${condition}.`,
        metadata: { condition, notes }
      })

      toast.success('Transaction marked as returned.')
      onSuccess()
      setCondition('good')
      setNotes('')
      onOpenChange(false)

    } catch (err: any) {
      toast.error(err.message || 'Failed to process return')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setCondition('good'); setNotes('') } }}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-emerald-500" />
            Process Return
          </DialogTitle>
          <DialogDescription>
            You are accepting the return of <b>{bookTitle}</b>. Please assess its current condition.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-2">
          <div className="space-y-2">
            <Label>Book Condition <span className="text-red-500">*</span></Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-full rounded-xl h-10">
                <SelectValue placeholder="Select condition..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="excellent"><span className="text-emerald-700 font-medium">Excellent</span> (Like new)</SelectItem>
                <SelectItem value="good"><span className="text-blue-700 font-medium">Good</span> (Normal wear)</SelectItem>
                <SelectItem value="fair"><span className="text-amber-700 font-medium">Fair</span> (Worn, but intact)</SelectItem>
                <SelectItem value="damaged"><span className="text-red-700 font-medium">Damaged</span> (Needs repair/replacement)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea 
              placeholder="E.g. water damage on back cover, missing page 34..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              className="resize-none rounded-xl"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleReturnConfirm} disabled={loading} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="size-4" />
            {loading ? 'Processing...' : 'Confirm Return'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
