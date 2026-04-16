'use client'

import React, { useRef } from 'react'
import { QRCode } from 'react-qrcode-logo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { QrCode, Download, Printer } from 'lucide-react'

export function QRDialog({ bookId, bookTitle, isbn, shelfName, baseUrl }: { bookId: string, bookTitle: string, isbn?: string, shelfName?: string, baseUrl: string }) {
  const [open, setOpen] = React.useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  
  // E.g. baseUrl = window.location.origin
  // If we want it to point perfectly to the intended listener: 
  // Admin: /dashboard/admin/books?book=bookId
  const url = typeof window !== 'undefined' ? `${window.location.origin}${baseUrl}?book=${bookId}` : ''

  const handleDownload = () => {
    const canvas = document.getElementById(`qr-${bookId}`) as HTMLCanvasElement
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `${bookTitle.replace(/\s+/g, '-').toLowerCase()}-qr.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }
  }

  const handlePrint = () => {
    // Basic printer logic: pop out a window, or use CSS print media to hide everything else
    // Since prompt requested: "Print QR Code button → opens browser print dialog showing only the QR code + book title + shelf location"
    // CSS for @media print should be global, but we can also handle it by printing a dynamically generated window
    const canvas = document.getElementById(`qr-${bookId}`) as HTMLCanvasElement
    if (canvas) {
      const dataUrl = canvas.toDataURL()
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print QR - ${bookTitle}</title>
              <style>
                body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .container { text-align: center; padding: 2rem; border: 2px dashed #ccc; border-radius: 12px; }
                img { width: 250px; height: 250px; margin-bottom: 1rem; }
                h1 { margin: 0; font-size: 1.5rem; color: #111; }
                p { margin: 0.25rem 0 0 0; color: #666; font-size: 1rem; }
                @media print { body { padding: 0; height: auto; } .container { border: none; } }
              </style>
            </head>
            <body>
              <div class="container">
                <img src="${dataUrl}" />
                <h1>${bookTitle}</h1>
                ${isbn ? `<p>ISBN: ${isbn}</p>` : ''}
                ${shelfName ? `<p>Shelf: ${shelfName}</p>` : ''}
              </div>
              <script>
                window.onload = () => { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8 text-slate-400 hover:text-primary" title="Generate QR">
          <QrCode className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Book QR Code</DialogTitle>
          <DialogDescription>Scan to instantly view this book's details.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl" ref={qrRef}>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
             <QRCode
                id={`qr-${bookId}`}
                value={url}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
                qrStyle="dots"
                eyeRadius={8}
             />
             <div className="mt-4 text-center">
               <p className="font-bold text-slate-900 max-w-[200px] truncate" title={bookTitle}>{bookTitle}</p>
               {isbn && <p className="text-xs text-slate-500 mt-1 font-mono">{isbn}</p>}
             </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={handleDownload}>
            <Download className="size-4" /> Download PNG
          </Button>
          <Button onClick={handlePrint} className="flex-1 rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Printer className="size-4" /> Print QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
