'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CalendarIcon, Clock, AlertTriangle, BookOpen, ArrowRight } from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, parseISO, isPast, startOfDay
} from 'date-fns'

type EventType = 'borrowed' | 'due' | 'overdue' | 'reservation'

type CalendarEvent = {
  id: string
  type: EventType
  date: Date
  studentName: string
  bookTitle: string
  raw: any
}

export function CalendarView({ role }: { role: 'admin' | 'staff' }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | EventType | 'reservations'>('all')

  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function fetchCalendarData() {
      setLoading(true)
      try {
        const [txRes, reqRes] = await Promise.all([
          supabase.from('transactions')
            .select('*, books(title), profiles!borrower_id(full_name)')
            .order('borrowed_at', { ascending: false }),
          supabase.from('book_requests')
            .select('*, books(title)')
            .eq('status', 'pending')
        ])

        const newEvents: CalendarEvent[] = []

        txRes.data?.forEach((tx: any) => {
          const student = (tx.profiles as any)?.full_name || 'Unknown'
          const book = (tx.books as any)?.title || 'Unknown Book'

          if (tx.borrowed_at) {
            newEvents.push({
              id: 'tx-b-' + tx.id,
              type: 'borrowed',
              date: parseISO(tx.borrowed_at),
              studentName: student,
              bookTitle: book,
              raw: tx
            })
          }

          if (tx.status === 'borrowed' && tx.due_date) {
            const dueDate = parseISO(tx.due_date)
            const isOverdue = isPast(startOfDay(dueDate)) && !isSameDay(new Date(), dueDate)
            newEvents.push({
              id: 'tx-d-' + tx.id,
              type: isOverdue ? 'overdue' : 'due',
              date: dueDate,
              studentName: student,
              bookTitle: book,
              raw: tx
            })
          }
        })

        if (reqRes.data && reqRes.data.length > 0) {
          const userIds = [...new Set(reqRes.data.map((r: any) => r.user_id).filter(Boolean))]
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
          const pm: Record<string, any> = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

          reqRes.data.forEach((req: any) => {
            const student = pm[req.user_id]?.full_name || 'Unknown'
            const book = (req.books as any)?.title || req.book_title
            newEvents.push({
              id: 'req-' + req.id,
              type: 'reservation',
              date: parseISO(req.created_at),
              studentName: student,
              bookTitle: book,
              raw: req
            })
          })
        }

        setEvents(newEvents)
      } catch (err: any) {
        toast.error('Failed to load calendar data')
      } finally {
        setLoading(false)
      }
    }

    fetchCalendarData()
  }, [currentDate])

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const visibleEvents = events.filter(e => {
    if (filter === 'all') return true
    if (filter === 'reservations') return e.type === 'reservation'
    return e.type === filter
  })

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    setSheetOpen(true)
  }

  const selectedDayEvents = selectedDay
    ? visibleEvents.filter(e => isSameDay(e.date, selectedDay))
    : []

  const FILTER_OPTIONS: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'borrowed', label: 'Issued' },
    { key: 'due', label: 'Due Today' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'reservations', label: 'Reservations' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reservation Calendar</h1>
          <p className="text-slate-500 text-sm mt-1">Track issues, due dates, and pending reservations by day.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.key as any)}
              className={filter === f.key ? 'rounded-xl bg-primary' : 'rounded-xl bg-white text-slate-600'}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
        {/* Calendar Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <ChevronLeft className="size-5" />
          </Button>
          <h2 className="text-xl font-bold text-slate-800">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <ChevronRight className="size-5" />
          </Button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-100 last:border-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-slate-100 gap-px">
          {days.map((day, idx) => {
            const dayEvents = visibleEvents.filter(e => isSameDay(e.date, day))
            const isCurrMonth = isSameMonth(day, currentDate)
            const isTdy = isToday(day)

            const borrowed = dayEvents.filter(e => e.type === 'borrowed').length
            const overdue = dayEvents.filter(e => e.type === 'overdue').length
            const due = dayEvents.filter(e => e.type === 'due').length
            const reservation = dayEvents.filter(e => e.type === 'reservation').length

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                className={'min-h-[110px] bg-white p-2 transition-colors cursor-pointer hover:bg-slate-50 flex flex-col' + (!isCurrMonth ? ' opacity-40' : '')}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={'flex items-center justify-center size-7 rounded-full text-sm font-semibold' + (isTdy ? ' bg-primary text-primary-foreground' : ' text-slate-700')}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && <span className="text-[10px] font-bold text-slate-400">{dayEvents.length}</span>}
                </div>

                <div className="flex-1 space-y-0.5">
                  {overdue > 0 && (
                    <div className="w-full px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 truncate">
                      {overdue} Overdue
                    </div>
                  )}
                  {due > 0 && (
                    <div className="w-full px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 truncate">
                      {due} Due
                    </div>
                  )}
                  {borrowed > 0 && (
                    <div className="w-full px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 truncate">
                      {borrowed} Issued
                    </div>
                  )}
                  {reservation > 0 && (
                    <div className="w-full px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 truncate">
                      {reservation} Pending
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {loading && (
          <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
            Loading calendar data...
          </div>
        )}
      </Card>

      {/* Slide-out Panel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col bg-slate-50 border-l border-slate-200">
          <SheetHeader className="p-6 bg-white border-b border-slate-100">
            <SheetTitle className="text-xl">
              {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : ''}
            </SheetTitle>
            <SheetDescription>
              {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} on this day.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                <CalendarIcon className="size-12 mb-3 text-slate-200" />
                <p>No transactions or reservations on this day.</p>
              </div>
            ) : (
              selectedDayEvents.map((evt, i) => {
                let badgeClass = 'bg-slate-100 text-slate-600'
                let badgeLabel = 'Event'
                let Icon = BookOpen

                if (evt.type === 'overdue') {
                  badgeClass = 'bg-red-100 text-red-700'
                  badgeLabel = 'Overdue'
                  Icon = AlertTriangle
                } else if (evt.type === 'due') {
                  badgeClass = 'bg-amber-100 text-amber-700'
                  badgeLabel = 'Due Today'
                  Icon = Clock
                } else if (evt.type === 'borrowed') {
                  badgeClass = 'bg-emerald-100 text-emerald-700'
                  badgeLabel = 'Newly Issued'
                  Icon = ArrowRight
                } else if (evt.type === 'reservation') {
                  badgeClass = 'bg-blue-100 text-blue-700'
                  badgeLabel = 'New Reservation'
                  Icon = CalendarIcon
                }

                return (
                  <Card key={i} className="border-0 shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-slate-500" />
                          <span className="font-bold text-slate-900">{evt.studentName}</span>
                        </div>
                        <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + badgeClass}>{badgeLabel}</span>
                      </div>
                      <p className="text-sm text-slate-600 ml-6 italic">
                        &ldquo;{evt.bookTitle}&rdquo;
                      </p>
                      {(evt.type === 'reservation' || evt.type === 'overdue' || evt.type === 'due') && (
                        <div className="mt-3 ml-6 pt-3 border-t border-slate-100">
                          <a
                            href={'/dashboard/' + role + '/borrow-return'}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            {evt.type === 'reservation' ? 'Review Reservation \u2192' : 'Process Return \u2192'}
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
