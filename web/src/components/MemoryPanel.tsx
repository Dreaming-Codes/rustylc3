import { useStore } from '@tanstack/react-store'
import { useState, useCallback, useEffect } from 'react'
import { Database, ChevronUp, ChevronDown } from 'lucide-react'
import { lc3Store, getMemory, disassembleMemory } from '@/lib/lc3-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

function formatHex4(value: number): string {
  return `x${value.toString(16).toUpperCase().padStart(4, '0')}`
}

const ROWS_TO_SHOW = 16

// Check if a value is a printable ASCII character
function isPrintableChar(value: number): boolean {
  return value >= 32 && value <= 126
}

// Check if the value looks like character data rather than code
// LC-3 instructions typically have opcodes in the high bits
// Printable ASCII is 32-126, which means the high byte is 0x00
// and the value is small - this strongly suggests character data
function isLikelyCharData(value: number): boolean {
  return value >= 0 && value <= 127
}

// Check if the disassembled instruction looks like data (not real code)
function isDataInstruction(instruction: string): boolean {
  // .FILL means the disassembler couldn't decode it as a valid instruction
  return instruction.startsWith('.FILL')
}

export function MemoryPanel() {
  const pc = useStore(lc3Store, (s) => s.pc)
  const origin = useStore(lc3Store, (s) => s.origin)
  const wasmReady = useStore(lc3Store, (s) => s.wasmReady)
  const isAssembled = useStore(lc3Store, (s) => s.isAssembled)

  const [startAddr, setStartAddr] = useState(0x3000)
  const [memory, setMemory] = useState<number[]>([])
  const [instructions, setInstructions] = useState<string[]>([])

  // Update memory when PC changes, after assembly, or manually
  useEffect(() => {
    if (wasmReady) {
      const mem = getMemory(startAddr, ROWS_TO_SHOW)
      setMemory(mem)
      // Disassemble the memory range
      const disasm = disassembleMemory(startAddr, ROWS_TO_SHOW)
      setInstructions(disasm)
    }
  }, [startAddr, pc, wasmReady, isAssembled])

  // Jump to origin
  const handleGoToOrigin = useCallback(() => {
    setStartAddr(origin)
  }, [origin])

  // Jump to PC
  const handleGoToPC = useCallback(() => {
    setStartAddr(pc)
  }, [pc])

  // Navigate
  const handleScrollUp = useCallback(() => {
    setStartAddr((addr) => Math.max(0, addr - ROWS_TO_SHOW))
  }, [])

  const handleScrollDown = useCallback(() => {
    setStartAddr((addr) => Math.min(0xffff - ROWS_TO_SHOW, addr + ROWS_TO_SHOW))
  }, [])

  // Custom address input
  const handleAddressInput = useCallback(() => {
    const input = prompt('Enter memory address (hex, e.g., x3000):')
    if (input) {
      const match = input.match(/^x?([0-9a-fA-F]+)$/i)
      if (match) {
        const addr = parseInt(match[1], 16)
        if (addr >= 0 && addr <= 0xffff) {
          setStartAddr(addr)
        }
      }
    }
  }, [])

  return (
    <Card className="flex h-full flex-col border-zinc-800 bg-zinc-950/50 backdrop-blur">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-sm font-medium text-zinc-300">
              Memory
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGoToOrigin}
              className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Origin
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGoToPC}
              className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              PC
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddressInput}
              className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Go To
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden pt-0">
        {/* Navigation */}
        <div className="mb-2 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleScrollUp}
            disabled={startAddr === 0}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="font-mono text-xs text-zinc-500">
            {formatHex4(startAddr)} - {formatHex4(startAddr + ROWS_TO_SHOW - 1)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleScrollDown}
            disabled={startAddr >= 0xffff - ROWS_TO_SHOW}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Memory table */}
        <ScrollArea className="flex-1 rounded-md bg-black/30">
          <div className="p-2">
            {/* Header */}
            <div className="mb-1 grid grid-cols-[70px_60px_55px_1fr] gap-1 text-xs font-medium text-zinc-500">
              <span>Addr</span>
              <span>Hex</span>
              <span>Dec</span>
              <span>Instruction</span>
            </div>

            {/* Memory rows */}
            {memory.map((value, i) => {
              const addr = startAddr + i
              const isPC = addr === pc
              const instruction = instructions[i] || ''
              
              // Determine what to show in the last column:
              // - For data (.FILL or small values that look like ASCII): show character
              // - For real instructions: show the disassembled instruction
              const isData = isDataInstruction(instruction) || isLikelyCharData(value)
              const displayValue = isData
                ? isPrintableChar(value)
                  ? String.fromCharCode(value)
                  : ''
                : instruction

              return (
                <div
                  key={addr}
                  className={cn(
                    'grid grid-cols-[70px_60px_55px_1fr] gap-1 rounded px-1 py-0.5 font-mono text-xs transition-colors',
                    isPC && 'bg-blue-500/20 ring-1 ring-blue-500/50'
                  )}
                >
                  <span
                    className={cn(
                      'text-zinc-500',
                      isPC && 'font-bold text-blue-400'
                    )}
                  >
                    {formatHex4(addr)}
                  </span>
                  <span className={cn('text-zinc-300', isPC && 'text-blue-200')}>
                    {formatHex4(value)}
                  </span>
                  <span className={cn('text-zinc-400', isPC && 'text-blue-200')}>
                    {value}
                  </span>
                  <span
                    className={cn(
                      'truncate',
                      isData ? 'italic text-zinc-400' : 'text-cyan-400',
                      isPC && (isData ? 'text-blue-200' : 'text-cyan-300')
                    )}
                    title={instruction}
                  >
                    {displayValue}
                  </span>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
