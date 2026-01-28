import { useStore } from '@tanstack/react-store'
import { useRef, useEffect, useCallback, useState } from 'react'
import { Terminal, Trash2 } from 'lucide-react'
import { lc3Store, provideInput } from '@/lib/lc3-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export function ConsolePanel() {
  const consoleOutput = useStore(lc3Store, (s) => s.consoleOutput)
  const waitingForInput = useStore(lc3Store, (s) => s.waitingForInput)
  const [inputBuffer, setInputBuffer] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [consoleOutput])

  // Focus input when waiting
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [waitingForInput])

  const handleClear = useCallback(() => {
    lc3Store.setState((s) => ({ ...s, consoleOutput: '' }))
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (waitingForInput && e.key.length === 1) {
        provideInput(e.key)
        setInputBuffer('')
        e.preventDefault()
      } else if (e.key === 'Enter' && waitingForInput) {
        if (inputBuffer.length > 0) {
          provideInput(inputBuffer[0])
        } else {
          provideInput('\n')
        }
        setInputBuffer('')
        e.preventDefault()
      }
    },
    [waitingForInput, inputBuffer]
  )

  return (
    <Card className="flex h-full flex-col border-zinc-800 bg-zinc-950/50 backdrop-blur">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-sm font-medium text-zinc-300">
              Console
            </CardTitle>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden pt-0">
        <ScrollArea className="flex-1 rounded-md bg-black/50 p-3" ref={scrollRef}>
          <pre className="min-h-full font-mono text-sm text-green-400 whitespace-pre-wrap break-all">
            {consoleOutput || (
              <span className="text-zinc-600 italic">
                Console output will appear here...
              </span>
            )}
            {waitingForInput && (
              <span className="inline-block h-4 w-2 animate-pulse bg-green-400" />
            )}
          </pre>
        </ScrollArea>

        {/* Input field */}
        <div
          className={cn(
            'mt-2 flex items-center gap-2 rounded-md border px-3 py-2 transition-colors',
            waitingForInput
              ? 'border-yellow-500/50 bg-yellow-500/10'
              : 'border-zinc-800 bg-zinc-900/50'
          )}
        >
          <span className="text-xs text-zinc-500">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={inputBuffer}
            onChange={(e) => setInputBuffer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              waitingForInput ? 'Press any key for input...' : 'Waiting for program...'
            }
            disabled={!waitingForInput}
            className={cn(
              'flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-zinc-600',
              waitingForInput ? 'text-yellow-400' : 'text-zinc-500'
            )}
          />
          {waitingForInput && (
            <span className="animate-pulse text-xs text-yellow-500">
              INPUT
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
