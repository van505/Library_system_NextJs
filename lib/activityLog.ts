export const ACTION_TYPES = {
  BOOK_ADDED: 'BOOK_ADDED',
  BOOK_EDITED: 'BOOK_EDITED',
  BOOK_DELETED: 'BOOK_DELETED',
  BOOK_ARCHIVED: 'BOOK_ARCHIVED',
  SHELF_ADDED: 'SHELF_ADDED',
  SHELF_EDITED: 'SHELF_EDITED',
  SHELF_DELETED: 'SHELF_DELETED',
  BORROW_ISSUED: 'BORROW_ISSUED',
  RETURN_PROCESSED: 'RETURN_PROCESSED',
  RESERVATION_APPROVED: 'RESERVATION_APPROVED',
  RESERVATION_DECLINED: 'RESERVATION_DECLINED',
  STAFF_CREATED: 'STAFF_CREATED',
  ANNOUNCEMENT_POSTED: 'ANNOUNCEMENT_POSTED',
  CATEGORY_ADDED: 'CATEGORY_ADDED',
  CSV_IMPORT: 'CSV_IMPORT',
  CONDITION_NOTED: 'CONDITION_NOTED',
}

export async function logActivity(
  supabase: any,
  params: {
    performed_by: string
    role: string
    action_type: string  
    entity_type?: string
    entity_id?: string
    entity_name?: string
    description: string
    metadata?: object
  }
) {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      ...params,
      metadata: params.metadata || {}
    })
    
    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (err) {
    console.error('Activity log error:', err)
  }
}
