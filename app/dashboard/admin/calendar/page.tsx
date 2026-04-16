import { CalendarView } from '@/components/dashboard/calendar-view'

export const metadata = { title: 'Reservation Calendar | Admin' }

export default function AdminCalendarPage() {
  return <CalendarView role="admin" />
}
