'use client'

import * as React from 'react'
import { Bell, Check, Trash2, CheckCircle2, ShieldAlert, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

export function NotificationsPanel() {
  const supabase = createClient()
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isOpen, setIsOpen] = React.useState(false)

  const fetchNotifications = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Auto-check overdue as part of fetching by calling the overdue function lightly?
    // Wait, let's just fetch existing notifications. The trigger or cron should do notify_overdue. Our spec says:
    // "Book overdue -> notify student (check on dashboard load)"
    // The easiest way is to let the dashboard check, or do it securely server-side. For now, since user said "check on dashboard load" I'll just rely on the API or local DB.
    
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }, [supabase])

  React.useEffect(() => {
    fetchNotifications() // initial fetch

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    fetchNotifications()
  }

  async function handleNotificationClick(n: any) {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    }
    setIsOpen(false)
    if (n.link) {
      router.push(n.link)
    }
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'warning': return <AlertTriangle className="size-4 text-amber-500" />
      case 'danger': return <ShieldAlert className="size-4 text-red-500" />
      default: return <Info className="size-4 text-indigo-500" />
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0 rounded-2xl shadow-xl overflow-hidden border-slate-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-1 px-2 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
              <Check className="size-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <Bell className="size-8 mx-auto mb-2 text-slate-300" />
              You're all caught up!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-indigo-50/30' : 'bg-white'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && <div className="size-2 rounded-full bg-indigo-600 mt-1 shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
