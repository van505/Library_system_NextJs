import { CalendarView } from '@/components/dashboard/calendar-view'

export const metadata = { title: 'Reservation Calendar | Staff' }

export default function StaffCalendarPage() {
  return <CalendarView role="staff" />
}
