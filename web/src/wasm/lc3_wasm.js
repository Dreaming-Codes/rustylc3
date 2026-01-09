let wasm;

function getArrayU16FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
    if (cachedUint16ArrayMemory0 === null || cachedUint16ArrayMemory0.byteLength === 0) {
        cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachedUint16ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray16ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 2, 2) >>> 0;
    getUint16ArrayMemory0().set(arg, ptr / 2);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

const WasmLC3Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmlc3_free(ptr >>> 0, 1));

/**
 * LC-3 Virtual Machine WASM wrapper.
 */
export class WasmLC3 {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmLC3Finalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmlc3_free(ptr, 0);
    }
    /**
     * Load a program from raw bytes (big-endian, as produced by the assembler).
     *
     * Format: first 2 bytes are the origin, followed by 2-byte words.
     * @param {Uint8Array} bytes
     */
    load_bytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmlc3_load_bytes(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Check if negative flag is set.
     * @returns {boolean}
     */
    n() {
        const ret = wasm.wasmlc3_n(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if positive flag is set.
     * @returns {boolean}
     */
    p() {
        const ret = wasm.wasmlc3_p(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if zero flag is set.
     * @returns {boolean}
     */
    z() {
        const ret = wasm.wasmlc3_z(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get the current program counter.
     * @returns {number}
     */
    pc() {
        const ret = wasm.wasmlc3_pc(this.__wbg_ptr);
        return ret;
    }
    /**
     * Read a memory location.
     * @param {number} addr
     * @returns {number}
     */
    mem(addr) {
        const ret = wasm.wasmlc3_mem(this.__wbg_ptr, addr);
        return ret;
    }
    /**
     * Create a new LC-3 VM instance.
     */
    constructor() {
        const ret = wasm.wasmlc3_new();
        this.__wbg_ptr = ret >>> 0;
        WasmLC3Finalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get a register value (0-7).
     * @param {number} r
     * @returns {number}
     */
    reg(r) {
        const ret = wasm.wasmlc3_reg(this.__wbg_ptr, r);
        return ret;
    }
    /**
     * Run until an I/O event or halt occurs.
     *
     * Returns a JavaScript object describing the result.
     * @returns {any}
     */
    run() {
        const ret = wasm.wasmlc3_run(this.__wbg_ptr);
        return ret;
    }
    /**
     * Load a program into memory at the specified origin.
     *
     * The `program` should be an array of 16-bit words (machine code).
     * @param {number} origin
     * @param {Uint16Array} program
     */
    load(origin, program) {
        const ptr0 = passArray16ToWasm0(program, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmlc3_load(this.__wbg_ptr, origin, ptr0, len0);
    }
    /**
     * Get all register values as an array.
     * @returns {Uint16Array}
     */
    regs() {
        const ret = wasm.wasmlc3_regs(this.__wbg_ptr);
        var v1 = getArrayU16FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 2, 2);
        return v1;
    }
    /**
     * Execute a single instruction.
     *
     * Returns a JavaScript object describing the result.
     * @returns {any}
     */
    step() {
        const ret = wasm.wasmlc3_step(this.__wbg_ptr);
        return ret;
    }
    /**
     * Reset the VM to its initial state.
     */
    reset() {
        wasm.wasmlc3_reset(this.__wbg_ptr);
    }
    /**
     * Set the program counter.
     * @param {number} pc
     */
    set_pc(pc) {
        wasm.wasmlc3_set_pc(this.__wbg_ptr, pc);
    }
    /**
     * Write to a memory location.
     * @param {number} addr
     * @param {number} val
     */
    set_mem(addr, val) {
        wasm.wasmlc3_set_mem(this.__wbg_ptr, addr, val);
    }
    /**
     * Set a register value (0-7).
     * @param {number} r
     * @param {number} val
     */
    set_reg(r, val) {
        wasm.wasmlc3_set_reg(this.__wbg_ptr, r, val);
    }
    /**
     * Get condition codes as a string (e.g., "N", "Z", "P").
     * @returns {string}
     */
    cond_str() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmlc3_cond_str(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get memory slice as bytes (for debugging/display).
     * @param {number} start
     * @param {number} len
     * @returns {Uint16Array}
     */
    mem_slice(start, len) {
        const ret = wasm.wasmlc3_mem_slice(this.__wbg_ptr, start, len);
        var v1 = getArrayU16FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 2, 2);
        return v1;
    }
    /**
     * Set the input character (for GETC/IN traps).
     *
     * Call this after receiving a `ReadChar` event, then continue execution.
     * @param {number} c
     */
    set_input(c) {
        wasm.wasmlc3_set_input(this.__wbg_ptr, c);
    }
}
if (Symbol.dispose) WasmLC3.prototype[Symbol.dispose] = WasmLC3.prototype.free;

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
 * @param {string} source
 * @param {number} line
 * @param {number} column
 * @returns {any}
 */
export function analyze_completions(source, line, column) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_completions(ptr0, len0, line, column);
    return ret;
}

/**
 * Get definition location for a position in the source code.
 * This is a stateless function.
 *
 * Returns null if no definition found, or an object with:
 * - startLineNumber, startColumn, endLineNumber, endColumn
 * @param {string} source
 * @param {number} line
 * @param {number} column
 * @returns {any}
 */
export function analyze_definition(source, line, column) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_definition(ptr0, len0, line, column);
    return ret;
}

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
 * @param {string} source
 * @returns {any}
 */
export function analyze_diagnostics(source) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_diagnostics(ptr0, len0);
    return ret;
}

/**
 * Get hover information for a position.
 * This is a stateless function.
 *
 * Returns null if no hover info, or an object with:
 * - contents: markdown string
 * @param {string} source
 * @param {number} line
 * @param {number} column
 * @returns {any}
 */
export function analyze_hover(source, line, column) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_hover(ptr0, len0, line, column);
    return ret;
}

/**
 * Get all references to the symbol at position.
 * This is a stateless function.
 *
 * Returns an array of range objects.
 * @param {string} source
 * @param {number} line
 * @param {number} column
 * @returns {any}
 */
export function analyze_references(source, line, column) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_references(ptr0, len0, line, column);
    return ret;
}

/**
 * Get all symbols (labels) in the document.
 * This is a stateless function.
 *
 * Returns an array of symbol objects with:
 * - name: string
 * - kind: "label" | "subroutine" | "data"
 * - address: hex string (e.g., "x3000")
 * - range: { startLineNumber, startColumn, endLineNumber, endColumn }
 * @param {string} source
 * @returns {any}
 */
export function analyze_symbols(source) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_symbols(ptr0, len0);
    return ret;
}

/**
 * Get semantic tokens for syntax highlighting.
 * This is a stateless function.
 *
 * Returns an array of token objects with:
 * - line: number (1-based)
 * - startColumn: number (1-based)
 * - length: number
 * - tokenType: "keyword" | "label" | "labelRef" | "register" | "number" | "string" | "comment" | "directive" | "operator"
 * @param {string} source
 * @returns {any}
 */
export function analyze_tokens(source) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_tokens(ptr0, len0);
    return ret;
}

/**
 * Assemble LC-3 source code into machine code.
 *
 * Returns an object with:
 * - `success`: boolean indicating success
 * - `code`: array of 16-bit words (if successful)
 * - `origin`: the origin address from .ORIG directive (if successful)
 * - `error`: error message (if failed)
 * @param {string} source
 * @returns {any}
 */
export function assemble(source) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.assemble(ptr0, len0);
    return ret;
}

/**
 * Assemble LC-3 source code and return raw bytes suitable for loading.
 *
 * Returns bytes in big-endian format with origin prefix, or throws on error.
 * @param {string} source
 * @param {number} origin
 * @returns {Uint8Array}
 */
export function assemble_to_bytes(source, origin) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.assemble_to_bytes(ptr0, len0, origin);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Initialize the WASM module.
 */
export function init() {
    wasm.init();
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Error_52673b7de5a0ca89 = function(arg0, arg1) {
        const ret = Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_new_1ba21ce319a06297 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_25f239778d6112b9 = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_7df433eea03a5c14 = function(arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
        // Cast intrinsic for `F64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint16ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('lc3_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
