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
    pub origin: Option<u16>,
    pub error: Option<String>,
}

/// Assemble LC-3 source code into machine code.
///
/// Returns an object with:
/// - `success`: boolean indicating success
/// - `code`: array of 16-bit words (if successful)
/// - `origin`: the origin address from .ORIG directive (if successful)
/// - `error`: error message (if failed)
#[wasm_bindgen]
pub fn assemble(source: &str) -> JsValue {
    let mut asm = Assembler::new();

    let result = match asm.assemble(source) {
        Ok(code) => AssemblyResult {
            success: true,
            code: Some(code),
            origin: Some(asm.origin()),
            error: None,
        },
        Err(e) => AssemblyResult {
            success: false,
            code: None,
            origin: None,
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
    console_error_panic_hook::set_once();
}

// ============================================================================
// Monaco Editor Integration
// ============================================================================

use lc3_analysis::AnalyzedDocument;

/// LC-3 Language Analysis for Monaco Editor integration.
///
/// This class provides IDE-like features for LC-3 assembly:
/// - Diagnostics (error markers)
/// - Go to definition
/// - Find all references  
/// - Hover information
/// - Code completions
#[wasm_bindgen]
pub struct LC3Language {
    doc: Option<AnalyzedDocument>,
}

#[wasm_bindgen]
impl LC3Language {
    /// Create a new language analysis instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { doc: None }
    }

    /// Update the document with new source code.
    /// Call this whenever the editor content changes.
    pub fn update(&mut self, source: &str) {
        self.doc = Some(AnalyzedDocument::new(source));
    }

    /// Get all diagnostics (errors/warnings) for the document.
    ///
    /// Returns an array of diagnostic objects with:
    /// - message: string
    /// - severity: "error" | "warning" | "info" | "hint"
    /// - startLineNumber: number (1-based)
    /// - startColumn: number (1-based)
    /// - endLineNumber: number (1-based)
    /// - endColumn: number (1-based)
    pub fn get_diagnostics(&self) -> JsValue {
        let Some(doc) = &self.doc else {
            return JsValue::from(js_sys::Array::new());
        };

        let diagnostics: Vec<MonacoDiagnostic> = doc
            .diagnostics()
            .into_iter()
            .map(|d| MonacoDiagnostic {
                message: d.message,
                severity: match d.severity {
                    lc3_analysis::Severity::Error => "error",
                    lc3_analysis::Severity::Warning => "warning",
                    lc3_analysis::Severity::Info => "info",
                    lc3_analysis::Severity::Hint => "hint",
                },
                start_line_number: d.start_line,
                start_column: d.start_col,
                end_line_number: d.end_line,
                end_column: d.end_col,
            })
            .collect();

        serde_wasm_bindgen::to_value(&diagnostics).unwrap_or(JsValue::NULL)
    }

    /// Get definition location for a position.
    ///
    /// Returns null if no definition found, or an object with:
    /// - startLineNumber, startColumn, endLineNumber, endColumn
    pub fn get_definition(&self, line: u32, column: u32) -> JsValue {
        let Some(doc) = &self.doc else {
            return JsValue::NULL;
        };

        match doc.definition(line, column) {
            Some(loc) => {
                let range = MonacoRange {
                    start_line_number: loc.start_line,
                    start_column: loc.start_col,
                    end_line_number: loc.end_line,
                    end_column: loc.end_col,
                };
                serde_wasm_bindgen::to_value(&range).unwrap_or(JsValue::NULL)
            }
            None => JsValue::NULL,
        }
    }

    /// Get all references to the symbol at position.
    ///
    /// Returns an array of range objects.
    pub fn get_references(&self, line: u32, column: u32) -> JsValue {
        let Some(doc) = &self.doc else {
            return JsValue::from(js_sys::Array::new());
        };

        let refs: Vec<MonacoRange> = doc
            .references(line, column)
            .into_iter()
            .map(|loc| MonacoRange {
                start_line_number: loc.start_line,
                start_column: loc.start_col,
                end_line_number: loc.end_line,
                end_column: loc.end_col,
            })
            .collect();

        serde_wasm_bindgen::to_value(&refs).unwrap_or(JsValue::NULL)
    }

    /// Get hover information for a position.
    ///
    /// Returns null if no hover info, or an object with:
    /// - contents: markdown string
    pub fn get_hover(&self, line: u32, column: u32) -> JsValue {
        let Some(doc) = &self.doc else {
            return JsValue::NULL;
        };

        match doc.hover(line, column) {
            Some(info) => {
                let hover = MonacoHover {
                    contents: info.contents,
                };
                serde_wasm_bindgen::to_value(&hover).unwrap_or(JsValue::NULL)
            }
            None => JsValue::NULL,
        }
    }

    /// Get completion suggestions for a position.
    ///
    /// Returns an array of completion items with:
    /// - label: string
    /// - kind: "label" | "keyword" | "snippet"
    /// - detail: optional string
    /// - documentation: optional string
    /// - insertText: optional string
    pub fn get_completions(&self, line: u32, column: u32) -> JsValue {
        let Some(doc) = &self.doc else {
            return JsValue::from(js_sys::Array::new());
        };

        let completions: Vec<MonacoCompletion> = doc
            .completions(line, column)
            .into_iter()
            .map(|c| MonacoCompletion {
                label: c.label,
                kind: match c.kind {
                    lc3_analysis::CompletionKind::Label => "label",
                    lc3_analysis::CompletionKind::Keyword => "keyword",
                    lc3_analysis::CompletionKind::Snippet => "snippet",
                },
                detail: c.detail,
                documentation: c.documentation,
                insert_text: c.insert_text,
            })
            .collect();

        serde_wasm_bindgen::to_value(&completions).unwrap_or(JsValue::NULL)
    }

    /// Get all symbols (labels) in the document.
    ///
    /// Returns an array of symbol objects with:
    /// - name: string
    /// - kind: "label" | "subroutine" | "data"
    /// - address: hex string (e.g., "x3000")
    /// - range: { startLineNumber, startColumn, endLineNumber, endColumn }
    pub fn get_symbols(&self) -> JsValue {
        let Some(doc) = &self.doc else {
            return JsValue::from(js_sys::Array::new());
        };

        let symbols: Vec<MonacoSymbol> = doc
            .symbols()
            .into_iter()
            .map(|s| MonacoSymbol {
                name: s.name,
                kind: match s.kind {
                    lc3_analysis::SymbolKind::Label => "label",
                    lc3_analysis::SymbolKind::Subroutine => "subroutine",
                    lc3_analysis::SymbolKind::Data => "data",
                },
                address: s.address.map(|a| format!("x{:04X}", a)),
                range: MonacoRange {
                    start_line_number: s.location.start_line,
                    start_column: s.location.start_col,
                    end_line_number: s.location.end_line,
                    end_column: s.location.end_col,
                },
            })
            .collect();

        serde_wasm_bindgen::to_value(&symbols).unwrap_or(JsValue::NULL)
    }

    /// Get semantic tokens for syntax highlighting.
    ///
    /// Returns an array of token objects with:
    /// - line: number (1-based)
    /// - startColumn: number (1-based)
    /// - length: number
    /// - tokenType: "keyword" | "label" | "labelRef" | "register" | "number" | "string" | "comment" | "directive" | "operator"
    pub fn get_tokens(&self) -> JsValue {
        let Some(doc) = &self.doc else {
            return JsValue::from(js_sys::Array::new());
        };

        let tokens: Vec<MonacoSemanticToken> = doc
            .tokens()
            .into_iter()
            .map(|t| MonacoSemanticToken {
                line: t.line,
                start_column: t.start_col,
                length: t.length,
                token_type: match t.token_type {
                    lc3_analysis::TokenType::Keyword => "keyword",
                    lc3_analysis::TokenType::Label => "label",
                    lc3_analysis::TokenType::LabelRef => "labelRef",
                    lc3_analysis::TokenType::Register => "register",
                    lc3_analysis::TokenType::Number => "number",
                    lc3_analysis::TokenType::String => "string",
                    lc3_analysis::TokenType::Comment => "comment",
                    lc3_analysis::TokenType::Directive => "directive",
                    lc3_analysis::TokenType::Operator => "operator",
                },
            })
            .collect();

        serde_wasm_bindgen::to_value(&tokens).unwrap_or(JsValue::NULL)
    }
}

impl Default for LC3Language {
    fn default() -> Self {
        Self::new()
    }
}

// Monaco-compatible types for serialization

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonacoDiagnostic {
    message: String,
    severity: &'static str,
    start_line_number: u32,
    start_column: u32,
    end_line_number: u32,
    end_column: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonacoRange {
    start_line_number: u32,
    start_column: u32,
    end_line_number: u32,
    end_column: u32,
}

#[derive(Serialize)]
struct MonacoHover {
    contents: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonacoCompletion {
    label: String,
    kind: &'static str,
    detail: Option<String>,
    documentation: Option<String>,
    insert_text: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonacoSymbol {
    name: String,
    kind: &'static str,
    address: Option<String>,
    range: MonacoRange,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonacoSemanticToken {
    line: u32,
    start_column: u32,
    length: u32,
    token_type: &'static str,
}
