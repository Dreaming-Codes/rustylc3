import { useStore } from '@tanstack/react-store'
import { useCallback } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  AlertTriangle,
  Power,
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
  bootOs,
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
  const needsOsBoot = useStore(lc3Store, (s) => s.needsOsBoot)
  const stepSpeed = useStore(lc3Store, (s) => s.stepSpeed)
  const wasmReady = useStore(lc3Store, (s) => s.wasmReady)
  const breakpoints = useStore(lc3Store, (s) => s.breakpoints)
  const currentLine = getCurrentLine()
  
  const hasBreakpoints = breakpoints.size > 0
  const isInstantMode = stepSpeed === 0

  const handleAssemble = useCallback(async () => {
    await assemble()
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

  const handleBootOs = useCallback(() => {
    bootOs()
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
    if (needsOsBoot) return { text: 'Boot OS', variant: 'outline' as const }
    return { text: 'Ready', variant: 'outline' as const }
  }

  const status = getStatus()

  // Speed display
  const getSpeedLabel = () => {
    if (stepSpeed === 0) return 'Instant'
    if (stepSpeed <= 10) return 'Max Speed'
    if (stepSpeed <= 50) return 'Fast'
    if (stepSpeed <= 100) return 'Normal'
    if (stepSpeed <= 500) return 'Slow'
    return 'Very Slow'
  }

  return (
    <TooltipProvider>
      <Card className="flex h-full flex-col border-zinc-800 bg-zinc-950/50 backdrop-blur">
        <CardHeader className="flex-shrink-0 pb-3">
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
        <CardContent className="flex flex-1 flex-col pb-4">
          {/* Main controls */}
          <div className="flex flex-wrap gap-2 mb-4">
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

            {needsOsBoot && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleBootOs}
                    disabled={!wasmReady || isRunning}
                    className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                  >
                    <Power className="h-4 w-4" />
                    Boot OS
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run OS startup code to initialize the machine</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isRunning ? 'destructive' : 'default'}
                  onClick={handleRun}
                  disabled={!wasmReady || !isAssembled || isHalted || needsOsBoot}
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
                  disabled={!wasmReady || !isAssembled || isRunning || isHalted || needsOsBoot}
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

          {/* Current line indicator */}
          {currentLine && (
            <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
              <span>Current Line:</span>
              <Badge variant="outline" className="font-mono">
                {currentLine}
              </Badge>
            </div>
          )}

          {/* Spacer to push speed control to bottom */}
          <div className="flex-1" />

          {/* Speed control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Step Speed</span>
              <span className="text-xs font-mono text-zinc-500">
                {getSpeedLabel()}{stepSpeed > 0 && ` (${stepSpeed}ms)`}
              </span>
            </div>
            <Slider
              value={[stepSpeed]}
              onValueChange={handleSpeedChange}
              min={0}
              max={1000}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>Instant</span>
              <span>Slow</span>
            </div>
            {/* Warning for instant mode with breakpoints */}
            {isInstantMode && hasBreakpoints && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-yellow-500/10 px-2 py-1.5 text-xs text-yellow-500">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Breakpoints ignored in instant mode</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
