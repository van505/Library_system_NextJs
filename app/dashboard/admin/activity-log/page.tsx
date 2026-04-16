'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { Search, History, ChevronLeft, ChevronRight, FileDown, Shield, ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  const [staffList, setStaffList] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const pageSize = 25

  const supabase = createClient()

  useEffect(() => {
    async function loadInitial() {
      // Load all staff for the dropdown
      const { data: staff } = await supabase.from('profiles').select('id, full_name, email').in('role', ['admin', 'staff'])
      if (staff) setStaffList(staff)
    }
    loadInitial()
  }, [])

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles (full_name, email)
        `, { count: 'exact' })
        
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter)
      }
      if (staffFilter !== 'all') {
        query = query.eq('performed_by', staffFilter)
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        let endDate = new Date(dateTo)
        endDate.setDate(endDate.getDate() + 1) // include the end date fully
        query = query.lte('created_at', endDate.toISOString())
      }
      if (search) {
        query = query.or(`description.ilike.%${search}%,entity_name.ilike.%${search}%`)
      }

      query = query.order('created_at', { ascending: false })
      query = query.range(page * pageSize, (page + 1) * pageSize - 1)

      const { data, error } = await query
      if (data) setLogs(data)
      setLoading(false)
    }

    fetchLogs()
  }, [search, actionFilter, staffFilter, dateFrom, dateTo, page])

  const actionTypes = [
    'BOOK_ADDED', 'BOOK_EDITED', 'BOOK_DELETED', 'BOOK_ARCHIVED',
    'SHELF_ADDED', 'SHELF_EDITED', 'SHELF_DELETED',
    'BORROW_ISSUED', 'RETURN_PROCESSED', 'RESERVATION_APPROVED',
    'RESERVATION_DECLINED', 'STAFF_CREATED', 'ANNOUNCEMENT_POSTED',
    'CATEGORY_ADDED', 'CSV_IMPORT', 'CONDITION_NOTED'
  ]

  const handleExportCSV = () => {
    const headers = ['Date', 'Staff Name', 'Role', 'Action', 'Entity', 'Description']
    const csvContent = logs.map(l => {
      const staffName = l.profiles?.full_name || l.profiles?.email || 'Unknown'
      const date = format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss')
      return `"${date}","${staffName}","${l.role}","${l.action_type}","${l.entity_name || ''}","${l.description}"`
    })
    
    csvContent.unshift(headers.join(','))
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1">Audit trail of all administrative and staff actions.</p>
        </div>
        <Button onClick={handleExportCSV} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 transition-transform hover:-translate-y-0.5">
          <FileDown className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="Search description..." 
            className="pl-9 rounded-xl bg-white border-none shadow-sm h-9"
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} 
          />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0) }}>
          <SelectTrigger className="w-full rounded-xl bg-white border-none shadow-sm h-9 text-sm">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={staffFilter} onValueChange={v => { setStaffFilter(v); setPage(0) }}>
          <SelectTrigger className="w-full rounded-xl bg-white border-none shadow-sm h-9 text-sm">
            <SelectValue placeholder="Staff Member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="rounded-xl bg-white border-none shadow-sm h-9 text-sm" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }} title="Date From" />
        <Input type="date" className="rounded-xl bg-white border-none shadow-sm h-9 text-sm" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }} title="Date To" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="p-4 font-semibold">Date / Time</th>
              <th className="p-4 font-semibold">Staff Member</th>
              <th className="p-4 font-semibold">Action</th>
              <th className="p-4 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center"><Skeleton className="h-4 w-40 mx-auto" /></td></tr>
            ) : logs.length === 0 ? (
               <tr>
                 <td colSpan={4} className="p-12 text-center text-slate-500">
                   <History className="size-10 text-slate-300 mx-auto mb-3" />
                   No activity logs found.
                 </td>
               </tr>
            ) : logs.map(l => {
               const staffName = l.profiles?.full_name || l.profiles?.email || 'Unknown'
               const isSystemMsg = l.role === 'admin'
               return (
                 <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="p-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                     {format(new Date(l.created_at), 'MMM d, yyyy')}<br/>
                     <span className="text-slate-400">{format(new Date(l.created_at), 'h:mm a')}</span>
                   </td>
                   <td className="p-4">
                     <span className="font-semibold text-slate-900 block">{staffName}</span>
                     <Badge variant="outline" className={`mt-1 border-transparent ${l.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-700'}`}>
                       {l.role === 'admin' ? <ShieldAlert className="size-3 mr-1" /> : <Shield className="size-3 mr-1" />}
                       <span className="capitalize">{l.role}</span>
                     </Badge>
                   </td>
                   <td className="p-4">
                     <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-mono text-[10px]">
                       {l.action_type}
                     </Badge>
                     {l.entity_name && (
                       <p className="text-xs text-slate-500 mt-1 truncate max-w-[150px]" title={l.entity_name}>
                         Entity: {l.entity_name}
                       </p>
                     )}
                   </td>
                   <td className="p-4 text-slate-600 max-w-md">
                     {l.description}
                   </td>
                 </tr>
               )
            })}
          </tbody>
        </table>
        
        {/* Pagination logic */}
        {!loading && logs.length > 0 && (
          <div className="p-3 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <span className="text-xs text-slate-500 pl-2">Page {page + 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="bg-white rounded-lg">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={logs.length < pageSize} className="bg-white rounded-lg">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
