import { Store } from '@tanstack/store'
import { getOSBytes, markOSLoaded, markOSUnloaded } from './os-store'

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
  isAssembled: boolean // Whether a program is loaded
  needsOsBoot: boolean // Whether OS boot is needed before running

  // Registers (R0-R7)
  registers: number[]
  prevRegisters: number[] // For flash animation
  changedRegisters: Set<number>

  // Special registers
  pc: number
  prevPc: number
  psr: number // Processor Status Register
  mcr: number // Machine Control Register
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

  // Symbol table (address -> label name)
  symbolTable: Map<number, string>

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
  isAssembled: false,
  needsOsBoot: false,
  registers: [0, 0, 0, 0, 0, 0, 0, 0],
  prevRegisters: [0, 0, 0, 0, 0, 0, 0, 0],
  changedRegisters: new Set(),
  pc: 0x3000,
  prevPc: 0x3000,
  psr: 0x0002, // Default: supervisor mode, Z flag set
  mcr: 0x0000,
  conditionCode: 'Z',
  consoleOutput: '',
  stepSpeed: 100,
  breakpoints: new Set(),
  origin: 0x3000,
  pcToLine: new Map(),
  lineToPC: new Map(),
  symbolTable: new Map(),
  wasmReady: false,
})

// WASM module references (initialized lazily)
let wasmModule: typeof import('@/wasm/lc3_wasm') | null = null
let vm: InstanceType<typeof import('@/wasm/lc3_wasm').WasmLC3> | null = null

// Auto-run interval/animation frame
let autoRunInterval: ReturnType<typeof setInterval> | null = null
let autoRunRAF: number | null = null
let wasInstantMode = false

// Promise to track ongoing initialization
let initPromise: Promise<void> | null = null

/**
 * Load the configured OS into the VM.
 * This should be called after vm.reset() and before loading user programs.
 * Returns true if OS was successfully loaded.
 */
async function loadOSIntoVM(): Promise<boolean> {
  if (!vm) return false

  const osBytes = await getOSBytes()
  if (osBytes) {
    try {
      vm.load_os_bytes(osBytes)
      vm.set_os_mode(true)
      vm.init_mcr()
      markOSLoaded()
      return true
    } catch (e) {
      console.error('Failed to load OS:', e)
      vm.set_os_mode(false)
      return false
    }
  } else {
    vm.set_os_mode(false)
    return false
  }
}

export async function initWasm() {
  // Return existing promise if initialization is in progress
  if (initPromise) return initPromise
  // Return immediately if already initialized
  if (wasmModule) return

  initPromise = (async () => {
    const wasm = await import('@/wasm/lc3_wasm')
    await wasm.default()

    wasmModule = wasm
    vm = new wasm.WasmLC3()

    lc3Store.setState((s) => ({ ...s, wasmReady: true }))

    // Initial analysis
    updateSourceCode(lc3Store.state.sourceCode)
  })()

  return initPromise
}

// Callback for when source code changes (used by file manager)
let onSourceCodeChangeCallback: (() => void) | null = null

export function setOnSourceCodeChange(callback: (() => void) | null) {
  onSourceCodeChangeCallback = callback
}

export function updateSourceCode(code: string, markAsChanged = true) {
  if (!wasmModule) return

  // Use stateless analysis function - no stored state, no borrow conflicts
  const diagnostics = wasmModule.analyze_diagnostics(code) as Diagnostic[]

  lc3Store.setState((s) => ({
    ...s,
    sourceCode: code,
    diagnostics,
  }))

  // Notify file manager of changes
  if (markAsChanged && onSourceCodeChangeCallback) {
    onSourceCodeChangeCallback()
  }
}

export async function assemble(): Promise<boolean> {
  if (!wasmModule || !vm) return false

  const state = lc3Store.state
  const result = wasmModule.assemble(state.sourceCode) as {
    success: boolean
    code?: number[]
    origin?: number
    error?: string
  }

  if (!result.success || !result.code) {
    lc3Store.setState((s) => ({
      ...s,
      consoleOutput: s.consoleOutput + `Assembly error: ${result.error}\n`,
    }))
    return false
  }

  const origin = result.origin ?? 0x3000

  // Build line mapping
  const lines = state.sourceCode.split('\n')
  const pcToLine = new Map<number, number>()
  const lineToPC = new Map<number, number>()

  let currentAddr = origin

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith(';')) continue

    // Check for .ORIG directive - just skip it, origin is already known
    if (line.match(/\.ORIG\s+/i)) {
      continue
    }

    // Skip .END and other directives that don't generate code
    if (line.match(/^\.(END|EXTERNAL|GLOBAL)/i)) continue

    // Skip if it's just a label on its own line
    if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*$/)) continue

    // Map this line to current address
    const lineNum = i + 1 // 1-based
    pcToLine.set(currentAddr, lineNum)
    lineToPC.set(lineNum, currentAddr)
    currentAddr++
  }

  // Reset VM and load OS if configured
  vm.reset()
  const osLoaded = await loadOSIntoVM()
  
  // Load user program
  const program = new Uint16Array(result.code)
  vm.load(origin, program)

  // If OS is loaded, set up for OS boot (user must press Boot OS button)
  if (osLoaded) {
    // Patch the OS to jump to our program's origin instead of x3000
    // USER_PC is at x020A (OS_START at x0200 + 10 words: 8 instructions + OS_SP + USER_PSR)
    vm.set_mem(0x020A, origin)
    
    // Set supervisor mode (PSR bit 15 = 0) so OS startup code can execute RTI
    // PSR: 0x0002 = supervisor mode, Z flag set
    vm.set_psr(0x0002)
    
    // Initialize R6 (stack pointer) to x3000, matching lc3tools initial state
    vm.set_reg(6, 0x3000)
    
    // Start at OS entry point - user must press Boot OS to run
    vm.set_pc(0x0200)
  }

  // Build symbol table from analyze_symbols
  const symbolTable = new Map<number, string>()
  const symbols = wasmModule.analyze_symbols(state.sourceCode) as Array<{
    name: string
    kind: string
    address?: string
  }>
  for (const sym of symbols) {
    if (sym.address) {
      // address is like "x3000", parse it
      const addr = parseInt(sym.address.slice(1), 16)
      symbolTable.set(addr, sym.name)
    }
  }

  lc3Store.setState((s) => ({
    ...s,
    origin,
    pc: vm!.pc(),
    prevPc: vm!.pc(),
    psr: vm!.psr(),
    mcr: vm!.mcr(),
    isHalted: false,
    isPaused: false,
    isAssembled: true,
    needsOsBoot: osLoaded,
    waitingForInput: false,
    registers: Array.from(vm!.regs()),
    prevRegisters: [0, 0, 0, 0, 0, 0, 0, 0],
    changedRegisters: new Set(),
    conditionCode: vm!.cond_str(),
    consoleOutput: s.consoleOutput + `Assembled successfully. Origin: x${origin.toString(16).toUpperCase()}${osLoaded ? ' (Boot OS to run)' : ''}\n`,
    pcToLine,
    lineToPC,
    symbolTable,
  }))

  return true
}

/**
 * Boot the OS - runs the OS startup code which initializes R6 and transitions to user mode.
 * This should be called after assemble() when OS mode is enabled.
 */
export function bootOs(): boolean {
  if (!vm) return false

  const state = lc3Store.state
  if (!state.needsOsBoot || state.isRunning) return false

  // Run OS startup until we reach user mode (RTI completes)
  // The OS startup code is short: LD, LD, ADD, STR, LD, ADD, STR, RTI (8 instructions)
  let maxSteps = 20 // Safety limit
  while (maxSteps-- > 0) {
    const psr = vm.psr()
    const isUserMode = (psr & 0x8000) !== 0
    if (isUserMode) break // RTI completed, now in user mode

    const stepResult = vm.step() as StepResult
    if (stepResult.type === 'Halt' || stepResult.type === 'Error') {
      lc3Store.setState((s) => ({
        ...s,
        consoleOutput: s.consoleOutput + `OS boot error\n`,
      }))
      return false
    }
  }

  // Update state after boot
  lc3Store.setState((s) => ({
    ...s,
    needsOsBoot: false,
    pc: vm!.pc(),
    prevPc: vm!.pc(),
    psr: vm!.psr(),
    mcr: vm!.mcr(),
    registers: Array.from(vm!.regs()),
    prevRegisters: s.registers,
    changedRegisters: new Set([6]), // R6 changes during boot
    conditionCode: vm!.cond_str(),
    consoleOutput: s.consoleOutput + `OS booted. Ready to run.\n`,
  }))

  // Clear changed indicators after animation
  setTimeout(() => {
    lc3Store.setState((s) => ({
      ...s,
      changedRegisters: new Set(),
    }))
  }, 300)

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
    psr: vm!.psr(),
    mcr: vm!.mcr(),
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

/**
 * Check if the VM is currently in supervisor mode (executing OS code).
 * PSR bit 15: 0 = supervisor mode, 1 = user mode
 */
function isInSupervisorMode(): boolean {
  if (!vm) return false
  const psr = vm.psr()
  return (psr & 0x8000) === 0
}

export function step(): boolean {
  if (!vm) return false

  const state = lc3Store.state
  if (!state.isAssembled || state.isHalted || state.waitingForInput) return false

  // Execute the first step
  let result = vm.step() as StepResult
  updateVMState()
  if (!handleStepResult(result)) return false

  // If we entered supervisor mode (OS interrupt/trap), keep stepping until we return to user mode
  // This allows stepping through user code only, skipping OS interrupt handlers
  while (isInSupervisorMode()) {
    const currentState = lc3Store.state
    if (currentState.isHalted || currentState.waitingForInput) break

    result = vm.step() as StepResult
    updateVMState()
    if (!handleStepResult(result)) return false
  }

  return true
}

export function run() {
  if (!vm) return

  const state = lc3Store.state
  if (!state.isAssembled || state.isHalted || state.waitingForInput) return

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
  markOSUnloaded() // OS needs to be reloaded on next assemble
  lc3Store.setState((s) => ({
    ...s,
    isRunning: false,
    isHalted: false,
    isPaused: false,
    isAssembled: false,
    needsOsBoot: false,
    waitingForInput: false,
    registers: [0, 0, 0, 0, 0, 0, 0, 0],
    prevRegisters: [0, 0, 0, 0, 0, 0, 0, 0],
    changedRegisters: new Set(),
    pc: s.origin,
    prevPc: s.origin,
    psr: 0x0002, // Default: supervisor mode, Z flag set
    mcr: 0x0000,
    conditionCode: 'Z',
    consoleOutput: '',
  }))
}

export function provideInput(char: string) {
  if (!vm || !lc3Store.state.waitingForInput) return

  vm.set_input(char.charCodeAt(0))
  lc3Store.setState((s) => ({
    ...s,
    waitingForInput: false,
    consoleOutput: s.consoleOutput + char,
  }))

  // Resume if was running (including instant mode)
  if (lc3Store.state.isRunning || wasInstantMode) {
    lc3Store.setState((s) => ({ ...s, isRunning: true }))
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
  if (autoRunInterval || autoRunRAF) return

  // Track the starting PC to skip the breakpoint we're currently on
  const startingPC = lc3Store.state.pc
  let isFirstTick = true

  const checkBreakpoint = (): boolean => {
    const state = lc3Store.state
    const currentLine = state.pcToLine.get(state.pc)
    if (currentLine && state.breakpoints.has(currentLine)) {
      // Only pause if we've moved past the starting point
      if (!isFirstTick || state.pc !== startingPC) {
        pause()
        return true
      }
    }
    return false
  }

  const stepSpeed = lc3Store.state.stepSpeed

  if (stepSpeed === 0) {
    // Instant mode: use VM's native run() function for maximum speed
    // This runs until halt, I/O request, or error in native WASM
    if (!vm) return

    wasInstantMode = true
    
    // Loop until we need to stop (halt, input request, or error)
    while (true) {
      const result = vm.run() as StepResult
      updateVMState()
      
      // Handle the result
      switch (result.type) {
        case 'None':
          // Should not happen since run() only returns on events
          continue

        case 'Output':
          lc3Store.setState((s) => ({
            ...s,
            consoleOutput: s.consoleOutput + String.fromCharCode(result.data as number),
          }))
          continue // Keep running after output

        case 'OutputString':
          const chars = (result.data as number[]).map((c) => String.fromCharCode(c)).join('')
          lc3Store.setState((s) => ({
            ...s,
            consoleOutput: s.consoleOutput + chars,
          }))
          continue // Keep running after output

        case 'Halt':
          lc3Store.setState((s) => ({
            ...s,
            isHalted: true,
            isRunning: false,
          }))
          wasInstantMode = false
          return // Stop the loop

        case 'ReadChar':
          lc3Store.setState((s) => ({
            ...s,
            waitingForInput: true,
            isRunning: false,
          }))
          // Don't clear wasInstantMode so we can resume after input
          return // Stop the loop, will resume after input

        case 'Error':
          lc3Store.setState((s) => ({
            ...s,
            consoleOutput: s.consoleOutput + `Error: ${result.data}\n`,
            isHalted: true,
            isRunning: false,
          }))
          wasInstantMode = false
          return // Stop the loop

        default:
          continue
      }
    }
  } else {
    // Normal mode: use setInterval with specified delay
    const runTick = () => {
      const state = lc3Store.state
      if (!state.isRunning || state.isHalted || state.waitingForInput) {
        stopAutoRun()
        return
      }

      if (checkBreakpoint()) return
      isFirstTick = false
      step()
    }

    autoRunInterval = setInterval(runTick, stepSpeed)
  }
}

function stopAutoRun() {
  if (autoRunInterval) {
    clearInterval(autoRunInterval)
    autoRunInterval = null
  }
  if (autoRunRAF) {
    cancelAnimationFrame(autoRunRAF)
    autoRunRAF = null
  }
  wasInstantMode = false
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

// Disassemble memory range
export function disassembleMemory(start: number, length: number): string[] {
  if (!wasmModule || !vm) return []
  
  const memory = vm.mem_slice(start, length)
  const symbolTable = lc3Store.state.symbolTable
  
  // Convert Map<number, string> to object for WASM
  const symbolObj: Record<number, string> = {}
  for (const [addr, name] of symbolTable) {
    symbolObj[addr] = name
  }
  
  return Array.from(wasmModule.disassemble_range_with_symbols(memory, start, symbolObj))
}

// Get current line from PC
export function getCurrentLine(): number | undefined {
  return lc3Store.state.pcToLine.get(lc3Store.state.pc)
}
