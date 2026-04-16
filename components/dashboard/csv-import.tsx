'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { logActivity, ACTION_TYPES } from '@/lib/activityLog'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Upload, FileDown, CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import Papa from 'papaparse'

type CsvRow = {
  title: string
  author: string
  isbn: string
  description: string
  total_copies: string
  shelf_name: string
  category_names: string
  cover_url: string
  published_year: string
  condition: string
}

type ParsedRow = {
  row: CsvRow
  isValid: boolean
  error?: string
  shelfId?: string
  categoryIds?: string[]
}

export function CSVImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [dbData, setDbData] = useState<{ shelves: any[], categories: any[] } | null>(null)
  
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const profile = useAuthStore(s => s.profile)

  const downloadTemplate = () => {
    const csvContent = [
      'title,author,isbn,description,total_copies,shelf_name,category_names,cover_url,published_year,condition',
      '"Clean Code","Robert C. Martin","9780132350884","A handbook of agile software craftsmanship",3,"IT-C-01","Programming,Computer Science","https://example.com/cover.jpg",2008,"good"'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'books_import_template.csv'
    link.click()
  }

  const loadLiveDbData = async () => {
    const [shelves, cats] = await Promise.all([
      supabase.from('shelves').select('id, name'),
      supabase.from('categories').select('id, name')
    ])
    return {
      shelves: shelves.data || [],
      categories: cats.data || []
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const liveData = await loadLiveDbData()
    setDbData(liveData)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as CsvRow[]
        const validated: ParsedRow[] = rows.map((row, index) => {
          let isValid = true
          let error = ''
          let shelfId = ''
          let categoryIds: string[] = []

          if (!row.title) { isValid = false; error = 'Missing title' }
          else if (!row.author) { isValid = false; error = 'Missing author' }
          else if (!row.shelf_name) { isValid = false; error = 'Missing shelf_name' }
          else if (!row.category_names) { isValid = false; error = 'Missing category_names' }
          else {
            const copies = parseInt(row.total_copies)
            if (isNaN(copies) || copies <= 0) {
              isValid = false
              error = 'Invalid total_copies'
            } else {
              // Validate shelf
              const shelf = liveData.shelves.find((s: any) => s.name.toUpperCase() === row.shelf_name?.toUpperCase())
              if (!shelf) {
                isValid = false
                error = `Shelf '${row.shelf_name}' not found`
              } else {
                shelfId = shelf.id
              }

              // Validate categories
              if (isValid) {
                const catNames = row.category_names.split(',').map(c => c.trim().toUpperCase())
                for (const catName of catNames) {
                  const cat = liveData.categories.find((c: any) => c.name.toUpperCase() === catName)
                  if (!cat) {
                    isValid = false
                    error = `Category '${catName}' not found`
                    break
                  }
                  categoryIds.push(cat.id)
                }
              }

              // Validate condition
              if (isValid) {
                const cond = (row.condition || 'good').toLowerCase()
                if (!['excellent', 'good', 'fair', 'damaged'].includes(cond)) {
                  isValid = false
                  error = `Invalid condition '${cond}'`
                }
              }
            }
          }

          return { row, isValid, error, shelfId, categoryIds }
        })

        setParsedRows(validated)
        setStep(1)
        setLoading(false)
      },
      error: (error) => {
        toast.error(`CSV Parsing error: ${error.message}`)
        setLoading(false)
      }
    })
  }

  const validCount = parsedRows.filter(r => r.isValid).length
  const errorCount = parsedRows.length - validCount

  const handleImport = async () => {
    if (validCount === 0) return
    setLoading(true)

    const validRows = parsedRows.filter(r => r.isValid)
    let successfullyImported = 0
    let failedToImport = 0

    // Import books sequentially (or in batches) to avoid massive fail
    for (const item of validRows) {
      const conditionStr = (item.row.condition || 'good').toLowerCase()
      const copiesNum = parseInt(item.row.total_copies)

      const { data: bookData, error: bookErr } = await supabase.from('books').insert({
        title: item.row.title,
        author: item.row.author,
        isbn: item.row.isbn || null,
        description: item.row.description || null,
        shelf_id: item.shelfId,
        published_year: item.row.published_year || null,
        total_copies: copiesNum,
        available_copies: copiesNum,
        available: true,
        cover_url: item.row.cover_url || null,
        condition: conditionStr
      }).select('id').single()

      if (bookErr || !bookData) {
        failedToImport++
        continue
      }

      // Insert categories
      if (item.categoryIds && item.categoryIds.length > 0) {
        const catPivotRows = item.categoryIds.map(cid => ({
          book_id: bookData.id,
          category_id: cid
        }))
        await supabase.from('book_categories').insert(catPivotRows)
      }

      successfullyImported++
    }

    if (successfullyImported > 0) {
      await logActivity(supabase, {
        performed_by: profile?.id || '',
        role: 'admin',
        action_type: ACTION_TYPES.CSV_IMPORT,
        description: `Admin bulk imported ${successfullyImported} books via CSV.`,
        metadata: { count: successfullyImported, failed: failedToImport }
      })
      toast.success(`Successfully imported ${successfullyImported} books. ${failedToImport} failed.`)
    } else {
      toast.error('Import completely failed.')
    }

    setLoading(false)
    setOpen(false)
    onSuccess()
  }

  const reset = () => {
    setParsedRows([])
    setStep(1)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2 shadow-sm">
          <FileSpreadsheet className="size-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-[700px] max-h-[85vh] overflow-y-auto flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Bulk Import Books</DialogTitle>
          <DialogDescription className="sr-only">Upload and import multiple books via CSV file</DialogDescription>
        </DialogHeader>

        {step === 1 && parsedRows.length === 0 && (
          <div className="space-y-6 mt-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Step 1: Download Template</h3>
              <p className="text-xs text-slate-500 mb-4">Ensure your data matches the strictly required format. Shelves and Categories must match exactly with live database entries.</p>
              <Button size="sm" onClick={downloadTemplate} variant="secondary" className="gap-2">
                <FileDown className="size-4" /> Download Example Template
              </Button>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-200 text-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              <Upload className="size-8 mx-auto text-slate-400 mb-3" />
              <h3 className="font-semibold text-slate-900">Upload CSV File</h3>
              <p className="text-xs text-slate-500 mt-1">.csv formats only</p>
            </div>
            {loading && <p className="text-sm text-center text-primary mt-2 animate-pulse">Processing file against database...</p>}
          </div>
        )}

        {step === 1 && parsedRows.length > 0 && (
          <div className="space-y-4 mt-2 flex-col flex h-full min-h-0">
            <div className="flex gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="size-4" /> {validCount} valid rows
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                <AlertTriangle className="size-4" /> {errorCount} errors
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-y-auto max-h-[300px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2">Title</th>
                    <th className="p-2">Author</th>
                    <th className="p-2">Shelf</th>
                    <th className="p-2 hidden sm:table-cell">Categories</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, i) => (
                    <tr key={i} className={r.isValid ? '' : 'bg-red-50/50'}>
                      <td className="p-2 text-center" title={r.error}>
                        {r.isValid ? <CheckCircle2 className="size-4 text-emerald-500 mx-auto" /> : <AlertCircle className="size-4 text-red-500 mx-auto" />}
                      </td>
                      <td className="p-2 font-medium max-w-[150px] truncate">{r.row.title || '-'}</td>
                      <td className="p-2 truncate max-w-[100px]">{r.row.author || '-'}</td>
                      <td className="p-2 truncate max-w-[80px]">{r.row.shelf_name || '-'}</td>
                      <td className="p-2 truncate hidden sm:table-cell max-w-[150px]">{r.row.category_names || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2 shrink-0">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={reset}>Discard & Re-Upload</Button>
              <Button onClick={() => setStep(2)} disabled={validCount === 0} className="flex-1 bg-primary hover:bg-primary/90 rounded-xl">Next Step →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 mt-4 py-8 text-center">
            <Upload className="size-12 text-primary mx-auto mb-4" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Ready to Import</h2>
              <p className="text-slate-500 text-sm max-w-[300px] mx-auto">
                You are about to securely import <span className="font-bold text-slate-900">{validCount} valid books</span> into the live database catalog.
              </p>
              {errorCount > 0 && (
                <p className="text-red-500 text-xs mt-2">({errorCount} invalid rows will be skipped)</p>
              )}
            </div>
            
            <div className="flex justify-center gap-3 pt-6">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="rounded-xl">Back to Validation</Button>
              <Button onClick={handleImport} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[160px] rounded-xl relative overflow-hidden group">
                {loading ? 'Importing securely...' : 'Initiate Import'}
                {!loading && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"/>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
