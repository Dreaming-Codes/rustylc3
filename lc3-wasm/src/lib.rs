//! LC-3 WebAssembly bindings.
//!
//! This crate provides WebAssembly bindings for the LC-3 virtual machine
//! and assembler, enabling browser-based LC-3 development environments.

use lc3_assembler::Assembler;
use lc3_core::{LC3, VMError, VMEvent};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Result of a VM execution step.
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum StepResult {
    /// No I/O event, execution continues.
    None,
    /// Output a single character.
    Output(u8),
    /// Output a string (array of bytes).
    OutputString(Vec<u8>),
    /// VM halted.
    Halt,
    /// VM requests character input. Call `set_input` before continuing.
    ReadChar,
    /// An error occurred during execution.
    Error(String),
}

impl From<VMEvent> for StepResult {
    fn from(event: VMEvent) -> Self {
        match event {
            VMEvent::None => StepResult::None,
            VMEvent::Output(c) => StepResult::Output(c),
            VMEvent::OutputString(s) => StepResult::OutputString(s),
            VMEvent::Halt => StepResult::Halt,
            VMEvent::ReadChar => StepResult::ReadChar,
            VMEvent::Error(e) => StepResult::Error(match e {
                VMError::ReservedOpcode(op) => format!("Reserved opcode: {op:#06b}"),
                VMError::UnimplementedTrap(vec) => format!("Unimplemented TRAP vector: {vec:#04x}"),
            }),
        }
    }
}

/// LC-3 Virtual Machine WASM wrapper.
#[wasm_bindgen]
pub struct WasmLC3 {
    vm: LC3,
}

#[wasm_bindgen]
impl WasmLC3 {
    /// Create a new LC-3 VM instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { vm: LC3::default() }
    }

    /// Reset the VM to its initial state.
    pub fn reset(&mut self) {
        self.vm = LC3::default();
    }

    /// Load a program into memory at the specified origin.
    ///
    /// The `program` should be an array of 16-bit words (machine code).
    pub fn load(&mut self, origin: u16, program: &[u16]) {
        for (i, &word) in program.iter().enumerate() {
            self.vm.memory[origin as usize + i] = word;
        }
        self.vm.pc = origin;
    }

    /// Load a program from raw bytes (big-endian, as produced by the assembler).
    ///
    /// Format: first 2 bytes are the origin, followed by 2-byte words.
    pub fn load_bytes(&mut self, bytes: &[u8]) -> Result<(), JsError> {
        if bytes.len() < 2 {
            return Err(JsError::new("Program too short"));
        }
        if bytes.len() % 2 != 0 {
            return Err(JsError::new("Program must have even number of bytes"));
        }

        let origin = u16::from_be_bytes([bytes[0], bytes[1]]);
        self.vm.pc = origin;

        for (i, chunk) in bytes[2..].chunks(2).enumerate() {
            let word = u16::from_be_bytes([chunk[0], chunk[1]]);
            self.vm.memory[origin as usize + i] = word;
        }

        Ok(())
    }

    /// Execute a single instruction.
    ///
    /// Returns a JavaScript object describing the result.
    pub fn step(&mut self) -> JsValue {
        let step_result = StepResult::from(self.vm.step());
        serde_wasm_bindgen::to_value(&step_result).unwrap_or(JsValue::NULL)
    }

    /// Run until an I/O event or halt occurs.
    ///
    /// Returns a JavaScript object describing the result.
    pub fn run(&mut self) -> JsValue {
        let step_result = StepResult::from(self.vm.run());
        serde_wasm_bindgen::to_value(&step_result).unwrap_or(JsValue::NULL)
    }

    /// Set the input character (for GETC/IN traps).
    ///
    /// Call this after receiving a `ReadChar` event, then continue execution.
    pub fn set_input(&mut self, c: u8) {
        self.vm.regs[0] = c as u16;
    }

    /// Get the current program counter.
    pub fn pc(&self) -> u16 {
        self.vm.pc
    }

    /// Set the program counter.
    pub fn set_pc(&mut self, pc: u16) {
        self.vm.pc = pc;
    }

    /// Get a register value (0-7).
    pub fn reg(&self, r: u8) -> u16 {
        self.vm.regs[r as usize & 7]
    }

    /// Set a register value (0-7).
    pub fn set_reg(&mut self, r: u8, val: u16) {
        self.vm.regs[r as usize & 7] = val;
    }

    /// Get all register values as an array.
    pub fn regs(&self) -> Vec<u16> {
        self.vm.regs.to_vec()
    }

    /// Read a memory location.
    pub fn mem(&self, addr: u16) -> u16 {
        self.vm.memory[addr as usize]
    }

    /// Write to a memory location.
    pub fn set_mem(&mut self, addr: u16, val: u16) {
        self.vm.memory[addr as usize] = val;
    }

    /// Get memory slice as bytes (for debugging/display).
    pub fn mem_slice(&self, start: u16, len: u16) -> Vec<u16> {
        let start = start as usize;
        let end = (start + len as usize).min(65536);
        self.vm.memory[start..end].to_vec()
    }

    /// Check if negative flag is set.
    pub fn n(&self) -> bool {
        self.vm.n()
    }

    /// Check if zero flag is set.
    pub fn z(&self) -> bool {
        self.vm.z()
    }

    /// Check if positive flag is set.
    pub fn p(&self) -> bool {
        self.vm.p()
    }

    /// Get condition codes as a string (e.g., "N", "Z", "P").
    pub fn cond_str(&self) -> String {
        if self.vm.n() {
            "N".to_string()
        } else if self.vm.z() {
            "Z".to_string()
        } else {
            "P".to_string()
        }
    }
}

impl Default for WasmLC3 {
    fn default() -> Self {
        Self::new()
    }
}

/// Assembly result returned to JavaScript.
#[derive(Serialize, Deserialize)]
pub struct AssemblyResult {
    pub success: bool,
    pub code: Option<Vec<u16>>,
    pub error: Option<String>,
}

/// Assemble LC-3 source code into machine code.
///
/// Returns an object with:
/// - `success`: boolean indicating success
/// - `code`: array of 16-bit words (if successful)
/// - `error`: error message (if failed)
#[wasm_bindgen]
pub fn assemble(source: &str) -> JsValue {
    let mut asm = Assembler::new();

    let result = match asm.assemble(source) {
        Ok(code) => AssemblyResult {
            success: true,
            code: Some(code),
            error: None,
        },
        Err(e) => AssemblyResult {
            success: false,
            code: None,
            error: Some(e),
        },
    };

    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

/// Assemble LC-3 source code and return raw bytes suitable for loading.
///
/// Returns bytes in big-endian format with origin prefix, or throws on error.
#[wasm_bindgen]
pub fn assemble_to_bytes(source: &str, origin: u16) -> Result<Vec<u8>, JsError> {
    let mut asm = Assembler::new();

    let code = asm.assemble(source).map_err(|e| JsError::new(&e))?;

    let mut bytes = Vec::with_capacity(2 + code.len() * 2);
    bytes.extend_from_slice(&origin.to_be_bytes());
    for word in code {
        bytes.extend_from_slice(&word.to_be_bytes());
    }

    Ok(bytes)
}

/// Initialize the WASM module.
#[wasm_bindgen(start)]
pub fn init() {
    // Placeholder for future initialization if needed
}
