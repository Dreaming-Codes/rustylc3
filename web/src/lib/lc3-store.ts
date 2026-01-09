import { Store } from '@tanstack/store'

// Types for WASM module
export interface StepResult {
  type: 'None' | 'Output' | 'OutputString' | 'Halt' | 'ReadChar' | 'Error'
  data?: number | number[] | string
}

export interface Diagnostic {
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface LC3State {
  // Editor state
  sourceCode: string
  diagnostics: Diagnostic[]

  // VM state
  isRunning: boolean
  isHalted: boolean
  isPaused: boolean
  waitingForInput: boolean

  // Registers (R0-R7)
  registers: number[]
  prevRegisters: number[] // For flash animation
  changedRegisters: Set<number>

  // Special registers
  pc: number
  prevPc: number
  conditionCode: string // 'N', 'Z', or 'P'

  // Console output
  consoleOutput: string

  // Execution settings
  stepSpeed: number // ms between steps (for auto-run)
  breakpoints: Set<number> // line numbers

  // Origin address
  origin: number

  // Line mapping (PC address -> source line)
  pcToLine: Map<number, number>
  lineToPC: Map<number, number>

  // WASM initialization state
  wasmReady: boolean
}

const DEFAULT_CODE = `; LC-3 Hello World Example
; This program prints "Hello, World!" to the console

        .ORIG x3000

        LEA R0, HELLO       ; Load address of string
        PUTS                ; Print the string
        HALT                ; Stop execution

HELLO   .STRINGZ "Hello, World!"

        .END
`

export const lc3Store = new Store<LC3State>({
  sourceCode: DEFAULT_CODE,
  diagnostics: [],
  isRunning: false,
  isHalted: false,
  isPaused: false,
  waitingForInput: false,
  registers: [0, 0, 0, 0, 0, 0, 0, 0],
  prevRegisters: [0, 0, 0, 0, 0, 0, 0, 0],
  changedRegisters: new Set(),
  pc: 0x3000,
  prevPc: 0x3000,
  conditionCode: 'Z',
  consoleOutput: '',
  stepSpeed: 100,
  breakpoints: new Set(),
  origin: 0x3000,
  pcToLine: new Map(),
  lineToPC: new Map(),
  wasmReady: false,
})

// WASM module references (initialized lazily)
let wasmModule: typeof import('@/wasm/lc3_wasm') | null = null
let vm: InstanceType<typeof import('@/wasm/lc3_wasm').WasmLC3> | null = null
let language: InstanceType<typeof import('@/wasm/lc3_wasm').LC3Language> | null =
  null

// Auto-run interval
let autoRunInterval: ReturnType<typeof setInterval> | null = null

export async function initWasm() {
  if (wasmModule) return

  const wasm = await import('@/wasm/lc3_wasm')
  await wasm.default()

  wasmModule = wasm
  vm = new wasm.WasmLC3()
  language = new wasm.LC3Language()

  lc3Store.setState((s) => ({ ...s, wasmReady: true }))

  // Initial analysis
  updateSourceCode(lc3Store.state.sourceCode)
}

export function updateSourceCode(code: string) {
  if (!language) return

  language.update(code)
  const diagnostics = language.get_diagnostics() as Diagnostic[]

  lc3Store.setState((s) => ({
    ...s,
    sourceCode: code,
    diagnostics,
  }))
}

export function assemble(): boolean {
  if (!wasmModule || !vm) return false

  const state = lc3Store.state
  const result = wasmModule.assemble(state.sourceCode)

  if (!result.success) {
    lc3Store.setState((s) => ({
      ...s,
      consoleOutput: s.consoleOutput + `Assembly error: ${result.error}\n`,
    }))
    return false
  }

  // Build line mapping
  const lines = state.sourceCode.split('\n')
  const pcToLine = new Map<number, number>()
  const lineToPC = new Map<number, number>()

  let origin = 0x3000
  let currentAddr = origin

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith(';')) continue

    // Check for .ORIG directive
    const origMatch = line.match(/\.ORIG\s+x([0-9A-Fa-f]+)/i)
    if (origMatch) {
      origin = parseInt(origMatch[1], 16)
      currentAddr = origin
      continue
    }

    // Skip .END and other directives that don't generate code
    if (line.match(/^\.(END|EXTERNAL|GLOBAL)/i)) continue

    // Map this line to current address
    const lineNum = i + 1 // 1-based
    pcToLine.set(currentAddr, lineNum)
    lineToPC.set(lineNum, currentAddr)
    currentAddr++
  }

  // Reset VM and load program
  vm.reset()
  const program = new Uint16Array(result.code)
  vm.load(origin, program)

  lc3Store.setState((s) => ({
    ...s,
    origin,
    pc: origin,
    prevPc: origin,
    isHalted: false,
    isPaused: false,
    waitingForInput: false,
    registers: Array.from(vm!.regs()),
    prevRegisters: [0, 0, 0, 0, 0, 0, 0, 0],
    changedRegisters: new Set(),
    conditionCode: vm!.cond_str(),
    consoleOutput: '',
    pcToLine,
    lineToPC,
  }))

  return true
}

function updateVMState() {
  if (!vm) return

  const newRegs = Array.from(vm.regs())
  const state = lc3Store.state
  const changed = new Set<number>()

  for (let i = 0; i < 8; i++) {
    if (newRegs[i] !== state.registers[i]) {
      changed.add(i)
    }
  }

  const newPc = vm.pc()
  if (newPc !== state.pc) {
    changed.add(8) // Special marker for PC
  }

  lc3Store.setState((s) => ({
    ...s,
    registers: newRegs,
    prevRegisters: s.registers,
    changedRegisters: changed,
    pc: newPc,
    prevPc: s.pc,
    conditionCode: vm!.cond_str(),
  }))

  // Clear changed indicators after animation
  setTimeout(() => {
    lc3Store.setState((s) => ({
      ...s,
      changedRegisters: new Set(),
    }))
  }, 300)
}

function handleStepResult(result: StepResult): boolean {
  switch (result.type) {
    case 'None':
      return true // Continue

    case 'Output':
      lc3Store.setState((s) => ({
        ...s,
        consoleOutput: s.consoleOutput + String.fromCharCode(result.data as number),
      }))
      return true

    case 'OutputString':
      const chars = (result.data as number[]).map((c) => String.fromCharCode(c)).join('')
      lc3Store.setState((s) => ({
        ...s,
        consoleOutput: s.consoleOutput + chars,
      }))
      return true

    case 'Halt':
      lc3Store.setState((s) => ({
        ...s,
        isHalted: true,
        isRunning: false,
      }))
      stopAutoRun()
      return false

    case 'ReadChar':
      lc3Store.setState((s) => ({
        ...s,
        waitingForInput: true,
        isRunning: false,
      }))
      stopAutoRun()
      return false

    case 'Error':
      lc3Store.setState((s) => ({
        ...s,
        consoleOutput: s.consoleOutput + `Error: ${result.data}\n`,
        isHalted: true,
        isRunning: false,
      }))
      stopAutoRun()
      return false

    default:
      return true
  }
}

export function step(): boolean {
  if (!vm) return false

  const state = lc3Store.state
  if (state.isHalted || state.waitingForInput) return false

  const result = vm.step() as StepResult
  updateVMState()
  return handleStepResult(result)
}

export function run() {
  if (!vm) return

  const state = lc3Store.state
  if (state.isHalted || state.waitingForInput) return

  lc3Store.setState((s) => ({ ...s, isRunning: true, isPaused: false }))
  startAutoRun()
}

export function pause() {
  lc3Store.setState((s) => ({ ...s, isRunning: false, isPaused: true }))
  stopAutoRun()
}

export function stop() {
  stopAutoRun()
  if (!vm) return

  vm.reset()
  lc3Store.setState((s) => ({
    ...s,
    isRunning: false,
    isHalted: false,
    isPaused: false,
    waitingForInput: false,
    registers: [0, 0, 0, 0, 0, 0, 0, 0],
    prevRegisters: [0, 0, 0, 0, 0, 0, 0, 0],
    changedRegisters: new Set(),
    pc: s.origin,
    prevPc: s.origin,
    conditionCode: 'Z',
    consoleOutput: '',
  }))
}

export function runToLine(targetLine: number) {
  if (!vm) return

  const state = lc3Store.state
  const targetPC = state.lineToPC.get(targetLine)

  if (targetPC === undefined) {
    lc3Store.setState((s) => ({
      ...s,
      consoleOutput: s.consoleOutput + `No executable code at line ${targetLine}\n`,
    }))
    return
  }

  lc3Store.setState((s) => ({ ...s, isRunning: true }))

  const runStep = () => {
    if (!vm) return

    const currentPC = vm.pc()
    if (currentPC === targetPC || lc3Store.state.isHalted || !lc3Store.state.isRunning) {
      lc3Store.setState((s) => ({ ...s, isRunning: false }))
      return
    }

    if (step()) {
      setTimeout(runStep, 0)
    }
  }

  runStep()
}

export function provideInput(char: string) {
  if (!vm || !lc3Store.state.waitingForInput) return

  vm.set_input(char.charCodeAt(0))
  lc3Store.setState((s) => ({
    ...s,
    waitingForInput: false,
    consoleOutput: s.consoleOutput + char,
  }))

  // Resume if was running
  if (lc3Store.state.isRunning) {
    startAutoRun()
  }
}

export function setStepSpeed(speed: number) {
  lc3Store.setState((s) => ({ ...s, stepSpeed: speed }))

  // Restart auto-run with new speed if running
  if (lc3Store.state.isRunning) {
    stopAutoRun()
    startAutoRun()
  }
}

export function toggleBreakpoint(line: number) {
  lc3Store.setState((s) => {
    const breakpoints = new Set(s.breakpoints)
    if (breakpoints.has(line)) {
      breakpoints.delete(line)
    } else {
      breakpoints.add(line)
    }
    return { ...s, breakpoints }
  })
}

function startAutoRun() {
  if (autoRunInterval) return

  const runTick = () => {
    const state = lc3Store.state
    if (!state.isRunning || state.isHalted || state.waitingForInput) {
      stopAutoRun()
      return
    }

    // Check for breakpoint
    const currentLine = state.pcToLine.get(state.pc)
    if (currentLine && state.breakpoints.has(currentLine)) {
      pause()
      return
    }

    step()
  }

  autoRunInterval = setInterval(runTick, lc3Store.state.stepSpeed)
}

function stopAutoRun() {
  if (autoRunInterval) {
    clearInterval(autoRunInterval)
    autoRunInterval = null
  }
}

// Memory access
export function getMemory(start: number, length: number): number[] {
  if (!vm) return []
  return Array.from(vm.mem_slice(start, length))
}

export function getMemoryValue(addr: number): number {
  if (!vm) return 0
  return vm.mem(addr)
}

// Get current line from PC
export function getCurrentLine(): number | undefined {
  return lc3Store.state.pcToLine.get(lc3Store.state.pc)
}
