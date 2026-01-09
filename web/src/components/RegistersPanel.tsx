import { useStore } from '@tanstack/react-store'
import { lc3Store } from '@/lib/lc3-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function formatHex(value: number): string {
  return `x${value.toString(16).toUpperCase().padStart(4, '0')}`
}

function formatDecimal(value: number): string {
  // Convert to signed 16-bit
  const signed = value > 0x7fff ? value - 0x10000 : value
  return signed.toString()
}

interface RegisterRowProps {
  name: string
  value: number
  changed: boolean
  isPC?: boolean
}

function RegisterRow({ name, value, changed, isPC }: RegisterRowProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[3rem_1fr_1fr] items-center gap-2 rounded-md px-2 py-1.5 font-mono text-sm transition-all duration-300',
        changed && 'animate-pulse bg-yellow-500/20 ring-1 ring-yellow-500/50',
        isPC && 'bg-blue-500/10'
      )}
    >
      <span
        className={cn(
          'font-bold',
          isPC ? 'text-blue-400' : 'text-zinc-400',
          changed && 'text-yellow-400'
        )}
      >
        {name}
      </span>
      <span className={cn('text-zinc-200', changed && 'text-yellow-300')}>
        {formatHex(value)}
      </span>
      <span className={cn('text-zinc-500 text-xs', changed && 'text-yellow-400/70')}>
        {formatDecimal(value)}
      </span>
    </div>
  )
}

export function RegistersPanel() {
  const registers = useStore(lc3Store, (s) => s.registers)
  const changedRegisters = useStore(lc3Store, (s) => s.changedRegisters)
  const pc = useStore(lc3Store, (s) => s.pc)
  const conditionCode = useStore(lc3Store, (s) => s.conditionCode)

  return (
    <Card className="h-full border-zinc-800 bg-zinc-950/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300">
            Registers
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              'font-mono text-xs',
              conditionCode === 'N' && 'border-red-500/50 text-red-400',
              conditionCode === 'Z' && 'border-zinc-500/50 text-zinc-400',
              conditionCode === 'P' && 'border-green-500/50 text-green-400'
            )}
          >
            CC: {conditionCode}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {/* General purpose registers */}
        {registers.map((value, i) => (
          <RegisterRow
            key={i}
            name={`R${i}`}
            value={value}
            changed={changedRegisters.has(i)}
          />
        ))}

        {/* Separator */}
        <div className="my-2 border-t border-zinc-800" />

        {/* Program Counter */}
        <RegisterRow
          name="PC"
          value={pc}
          changed={changedRegisters.has(8)}
          isPC
        />
      </CardContent>
    </Card>
  )
}
