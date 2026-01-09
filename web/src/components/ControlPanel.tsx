import { useStore } from '@tanstack/react-store'
import { useCallback } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
} from 'lucide-react'
import {
  lc3Store,
  assemble,
  run,
  pause,
  stop,
  step,
  setStepSpeed,
  getCurrentLine,
} from '@/lib/lc3-store'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function ControlPanel() {
  const isRunning = useStore(lc3Store, (s) => s.isRunning)
  const isHalted = useStore(lc3Store, (s) => s.isHalted)
  const isPaused = useStore(lc3Store, (s) => s.isPaused)
  const waitingForInput = useStore(lc3Store, (s) => s.waitingForInput)
  const isAssembled = useStore(lc3Store, (s) => s.isAssembled)
  const stepSpeed = useStore(lc3Store, (s) => s.stepSpeed)
  const wasmReady = useStore(lc3Store, (s) => s.wasmReady)
  const currentLine = getCurrentLine()

  const handleAssemble = useCallback(() => {
    assemble()
  }, [])

  const handleRun = useCallback(() => {
    if (isRunning) {
      pause()
    } else {
      run()
    }
  }, [isRunning])

  const handleStep = useCallback(() => {
    step()
  }, [])

  const handleStop = useCallback(() => {
    stop()
  }, [])

  const handleSpeedChange = useCallback((values: number[]) => {
    setStepSpeed(values[0])
  }, [])

  // Status badge
  const getStatus = () => {
    if (!wasmReady) return { text: 'Loading...', variant: 'secondary' as const }
    if (isHalted) return { text: 'Halted', variant: 'destructive' as const }
    if (waitingForInput) return { text: 'Waiting Input', variant: 'outline' as const }
    if (isRunning) return { text: 'Running', variant: 'default' as const }
    if (isPaused) return { text: 'Paused', variant: 'secondary' as const }
    return { text: 'Ready', variant: 'outline' as const }
  }

  const status = getStatus()

  // Speed display
  const getSpeedLabel = () => {
    if (stepSpeed <= 10) return 'Max Speed'
    if (stepSpeed <= 50) return 'Fast'
    if (stepSpeed <= 100) return 'Normal'
    if (stepSpeed <= 500) return 'Slow'
    return 'Very Slow'
  }

  return (
    <TooltipProvider>
      <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-300">
              Controls
            </CardTitle>
            <Badge
              variant={status.variant}
              className={cn(
                'text-xs',
                isRunning && 'animate-pulse bg-green-600'
              )}
            >
              {status.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main controls */}
          <div className="flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAssemble}
                  disabled={!wasmReady || isRunning}
                  className="gap-1.5"
                >
                  <Zap className="h-4 w-4" />
                  Assemble
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assemble and load program</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isRunning ? 'destructive' : 'default'}
                  onClick={handleRun}
                  disabled={!wasmReady || !isAssembled || isHalted}
                  className="gap-1.5"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRunning ? 'Pause execution' : 'Run program'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStep}
                  disabled={!wasmReady || !isAssembled || isRunning || isHalted}
                  className="gap-1.5"
                >
                  <SkipForward className="h-4 w-4" />
                  Step
                </Button>
              </TooltipTrigger>
              <TooltipContent>Execute single instruction</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStop}
                  disabled={!wasmReady}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset VM to initial state</TooltipContent>
            </Tooltip>
          </div>

          {/* Speed control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Step Speed</span>
              <span className="text-xs font-mono text-zinc-500">
                {getSpeedLabel()} ({stepSpeed}ms)
              </span>
            </div>
            <Slider
              value={[stepSpeed]}
              onValueChange={handleSpeedChange}
              min={1}
              max={1000}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>Fast</span>
              <span>Slow</span>
            </div>
          </div>

          {/* Current line indicator */}
          {currentLine && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Current Line:</span>
              <Badge variant="outline" className="font-mono">
                {currentLine}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
