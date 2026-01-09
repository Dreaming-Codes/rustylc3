/* tslint:disable */
/* eslint-disable */

export class WasmLC3 {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Load a program from raw bytes (big-endian, as produced by the assembler).
   *
   * Format: first 2 bytes are the origin, followed by 2-byte words.
   */
  load_bytes(bytes: Uint8Array): void;
  /**
   * Check if negative flag is set.
   */
  n(): boolean;
  /**
   * Check if positive flag is set.
   */
  p(): boolean;
  /**
   * Check if zero flag is set.
   */
  z(): boolean;
  /**
   * Get the current program counter.
   */
  pc(): number;
  /**
   * Read a memory location.
   */
  mem(addr: number): number;
  /**
   * Create a new LC-3 VM instance.
   */
  constructor();
  /**
   * Get a register value (0-7).
   */
  reg(r: number): number;
  /**
   * Run until an I/O event or halt occurs.
   *
   * Returns a JavaScript object describing the result.
   */
  run(): any;
  /**
   * Load a program into memory at the specified origin.
   *
   * The `program` should be an array of 16-bit words (machine code).
   */
  load(origin: number, program: Uint16Array): void;
  /**
   * Get all register values as an array.
   */
  regs(): Uint16Array;
  /**
   * Execute a single instruction.
   *
   * Returns a JavaScript object describing the result.
   */
  step(): any;
  /**
   * Reset the VM to its initial state.
   */
  reset(): void;
  /**
   * Set the program counter.
   */
  set_pc(pc: number): void;
  /**
   * Write to a memory location.
   */
  set_mem(addr: number, val: number): void;
  /**
   * Set a register value (0-7).
   */
  set_reg(r: number, val: number): void;
  /**
   * Get condition codes as a string (e.g., "N", "Z", "P").
   */
  cond_str(): string;
  /**
   * Get memory slice as bytes (for debugging/display).
   */
  mem_slice(start: number, len: number): Uint16Array;
  /**
   * Set the input character (for GETC/IN traps).
   *
   * Call this after receiving a `ReadChar` event, then continue execution.
   */
  set_input(c: number): void;
}

/**
 * Get completion suggestions for a position.
 * This is a stateless function.
 *
 * Returns an array of completion items with:
 * - label: string
 * - kind: "label" | "keyword" | "snippet"
 * - detail: optional string
 * - documentation: optional string
 * - insertText: optional string
 */
export function analyze_completions(source: string, line: number, column: number): any;

/**
 * Get definition location for a position in the source code.
 * This is a stateless function.
 *
 * Returns null if no definition found, or an object with:
 * - startLineNumber, startColumn, endLineNumber, endColumn
 */
export function analyze_definition(source: string, line: number, column: number): any;

/**
 * Analyze source code and return diagnostics.
 * This is a stateless function that creates a fresh analysis each time.
 *
 * Returns an array of diagnostic objects with:
 * - message: string
 * - severity: "error" | "warning" | "info" | "hint"
 * - startLineNumber: number (1-based)
 * - startColumn: number (1-based)
 * - endLineNumber: number (1-based)
 * - endColumn: number (1-based)
 */
export function analyze_diagnostics(source: string): any;

/**
 * Get hover information for a position.
 * This is a stateless function.
 *
 * Returns null if no hover info, or an object with:
 * - contents: markdown string
 */
export function analyze_hover(source: string, line: number, column: number): any;

/**
 * Get all references to the symbol at position.
 * This is a stateless function.
 *
 * Returns an array of range objects.
 */
export function analyze_references(source: string, line: number, column: number): any;

/**
 * Get all symbols (labels) in the document.
 * This is a stateless function.
 *
 * Returns an array of symbol objects with:
 * - name: string
 * - kind: "label" | "subroutine" | "data"
 * - address: hex string (e.g., "x3000")
 * - range: { startLineNumber, startColumn, endLineNumber, endColumn }
 */
export function analyze_symbols(source: string): any;

/**
 * Get semantic tokens for syntax highlighting.
 * This is a stateless function.
 *
 * Returns an array of token objects with:
 * - line: number (1-based)
 * - startColumn: number (1-based)
 * - length: number
 * - tokenType: "keyword" | "label" | "labelRef" | "register" | "number" | "string" | "comment" | "directive" | "operator"
 */
export function analyze_tokens(source: string): any;

/**
 * Assemble LC-3 source code into machine code.
 *
 * Returns an object with:
 * - `success`: boolean indicating success
 * - `code`: array of 16-bit words (if successful)
 * - `origin`: the origin address from .ORIG directive (if successful)
 * - `error`: error message (if failed)
 */
export function assemble(source: string): any;

/**
 * Assemble LC-3 source code and return raw bytes suitable for loading.
 *
 * Returns bytes in big-endian format with origin prefix, or throws on error.
 */
export function assemble_to_bytes(source: string, origin: number): Uint8Array;

/**
 * Initialize the WASM module.
 */
export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_wasmlc3_free: (a: number, b: number) => void;
  readonly analyze_completions: (a: number, b: number, c: number, d: number) => any;
  readonly analyze_definition: (a: number, b: number, c: number, d: number) => any;
  readonly analyze_diagnostics: (a: number, b: number) => any;
  readonly analyze_hover: (a: number, b: number, c: number, d: number) => any;
  readonly analyze_references: (a: number, b: number, c: number, d: number) => any;
  readonly analyze_symbols: (a: number, b: number) => any;
  readonly analyze_tokens: (a: number, b: number) => any;
  readonly assemble: (a: number, b: number) => any;
  readonly assemble_to_bytes: (a: number, b: number, c: number) => [number, number, number, number];
  readonly wasmlc3_cond_str: (a: number) => [number, number];
  readonly wasmlc3_load: (a: number, b: number, c: number, d: number) => void;
  readonly wasmlc3_load_bytes: (a: number, b: number, c: number) => [number, number];
  readonly wasmlc3_mem: (a: number, b: number) => number;
  readonly wasmlc3_mem_slice: (a: number, b: number, c: number) => [number, number];
  readonly wasmlc3_n: (a: number) => number;
  readonly wasmlc3_new: () => number;
  readonly wasmlc3_p: (a: number) => number;
  readonly wasmlc3_pc: (a: number) => number;
  readonly wasmlc3_reg: (a: number, b: number) => number;
  readonly wasmlc3_regs: (a: number) => [number, number];
  readonly wasmlc3_reset: (a: number) => void;
  readonly wasmlc3_run: (a: number) => any;
  readonly wasmlc3_set_input: (a: number, b: number) => void;
  readonly wasmlc3_set_mem: (a: number, b: number, c: number) => void;
  readonly wasmlc3_set_pc: (a: number, b: number) => void;
  readonly wasmlc3_set_reg: (a: number, b: number, c: number) => void;
  readonly wasmlc3_step: (a: number) => any;
  readonly wasmlc3_z: (a: number) => number;
  readonly init: () => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
