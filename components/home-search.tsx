'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function HomeSearch() {
  const router = useRouter()
  const [query, setQuery] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/chat?q=${encodeURIComponent(q)}` : '/chat')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          id="homepage-search"
          type="search"
          placeholder='Try "Where is Harry Potter?" …'
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9 h-11 text-base rounded-xl"
          aria-label="Search for a book"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 gap-2 px-5 rounded-xl shrink-0"
      >
        <Sparkles className="size-4" />
        Ask AI
      </Button>
    </form>
  )
}
