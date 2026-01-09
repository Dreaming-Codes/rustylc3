//! LC-3 semantic analysis for editor integration.
//!
//! This crate provides semantic analysis for LC-3 assembly, designed for
//! integration with Monaco editor and similar code editors.

use lc3_parser::{Directive, Instruction, Line, Program, Span, Spanned, parse};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Diagnostic severity levels (matching Monaco's MarkerSeverity).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Info,
    Hint,
}

/// A diagnostic message with location.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagnostic {
    pub message: String,
    pub severity: Severity,
    pub start_line: u32,
    pub start_col: u32,
    pub end_line: u32,
    pub end_col: u32,
}

/// A location in the source code.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub start_line: u32,
    pub start_col: u32,
    pub end_line: u32,
    pub end_col: u32,
}

/// Information about a symbol (label).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolInfo {
    pub name: String,
    pub kind: SymbolKind,
    pub location: Location,
    pub address: Option<u16>,
    pub documentation: Option<String>,
}

/// Kind of symbol.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SymbolKind {
    Label,
    Subroutine,
    Data,
}

/// A completion item.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionItem {
    pub label: String,
    pub kind: CompletionKind,
    pub detail: Option<String>,
    pub documentation: Option<String>,
    pub insert_text: Option<String>,
}

/// Kind of completion.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CompletionKind {
    Label,
    Keyword,
    Snippet,
}

/// Hover information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HoverInfo {
    pub contents: String,
    pub range: Option<Location>,
}

/// Token type for semantic highlighting.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TokenType {
    Keyword,
    Label,
    LabelRef,
    Register,
    Number,
    String,
    Comment,
    Directive,
    Operator,
}

/// A semantic token for highlighting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticToken {
    pub line: u32,
    pub start_col: u32,
    pub length: u32,
    pub token_type: TokenType,
}

/// Internal symbol table entry.
#[derive(Debug, Clone)]
struct Symbol {
    name: String,
    span: Span,
    address: u16,
    kind: SymbolKind,
    /// Line number (1-based) for quick lookup
    #[allow(dead_code)]
    line: u32,
}

/// A label reference in the code.
#[derive(Debug, Clone)]
struct LabelRef {
    name: String,
    span: Span,
    #[allow(dead_code)]
    line: u32,
}

/// Analyzed document state.
pub struct AnalyzedDocument {
    source: String,
    program: Option<Program>,
    parse_errors: Vec<Diagnostic>,
    symbols: HashMap<String, Symbol>,
    label_refs: Vec<LabelRef>,
    line_starts: Vec<usize>,
}

impl AnalyzedDocument {
    /// Analyze source code and create a new document.
    pub fn new(source: &str) -> Self {
        let line_starts = compute_line_starts(source);

        let (program, parse_errors) = match parse(source) {
            Ok(prog) => (Some(prog), Vec::new()),
            Err(errors) => {
                let diagnostics = errors
                    .into_iter()
                    .map(|e| {
                        let (start_line, start_col) =
                            offset_to_position(&line_starts, e.span.start);
                        let (end_line, end_col) = offset_to_position(&line_starts, e.span.end);
                        Diagnostic {
                            message: e.message,
                            severity: Severity::Error,
                            start_line,
                            start_col,
                            end_line,
                            end_col,
                        }
                    })
                    .collect();
                (None, diagnostics)
            }
        };

        let mut doc = Self {
            source: source.to_string(),
            program,
            parse_errors,
            symbols: HashMap::new(),
            label_refs: Vec::new(),
            line_starts,
        };

        if doc.program.is_some() {
            let prog = doc.program.as_ref().unwrap();
            doc.analyze_symbols_from(prog.lines.clone());
        }

        doc
    }

    /// Analyze symbols and references from the parsed program.
    fn analyze_symbols_from(&mut self, lines: Vec<lc3_parser::SpannedLine>) {
        let mut pc = 0x3000u16;

        for spanned_line in &lines {
            let line_num = self.offset_to_line(spanned_line.span.start);

            match &spanned_line.line {
                Line::Label(label) => {
                    self.add_symbol(label, pc, SymbolKind::Label, line_num);
                }
                Line::LabeledDirective(label, dir) => {
                    let kind = match dir {
                        Directive::Stringz(_) | Directive::Fill(_) | Directive::Blkw(_) => {
                            SymbolKind::Data
                        }
                        _ => SymbolKind::Label,
                    };
                    self.add_symbol(label, pc, kind, line_num);
                    pc = self.advance_pc(dir, pc);
                }
                Line::LabeledInstruction(label, instr) => {
                    // If instruction is JSR-type, mark as subroutine
                    let kind = if self.is_subroutine_target(label) {
                        SymbolKind::Subroutine
                    } else {
                        SymbolKind::Label
                    };
                    self.add_symbol(label, pc, kind, line_num);
                    self.collect_label_refs(instr, line_num);
                    pc += 1;
                }
                Line::Directive(dir) => {
                    pc = self.advance_pc(dir, pc);
                }
                Line::Instruction(instr) => {
                    self.collect_label_refs(instr, line_num);
                    pc += 1;
                }
                Line::Empty | Line::Error => {}
            }
        }
    }

    fn add_symbol(&mut self, label: &Spanned<String>, address: u16, kind: SymbolKind, line: u32) {
        self.symbols.insert(
            label.value.clone(),
            Symbol {
                name: label.value.clone(),
                span: label.span.clone(),
                address,
                kind,
                line,
            },
        );
    }

    fn advance_pc(&self, dir: &Directive, pc: u16) -> u16 {
        match dir {
            Directive::Orig(addr) => *addr,
            Directive::Fill(_) => pc + 1,
            Directive::Blkw(n) => pc + n,
            Directive::Stringz(s) => pc + s.len() as u16 + 1,
            Directive::End => pc,
        }
    }

    fn collect_label_refs(&mut self, instr: &Instruction, line: u32) {
        let label = match instr {
            Instruction::Br { label, .. } => Some(label),
            Instruction::Jsr { label } => Some(label),
            Instruction::Ld { label, .. } => Some(label),
            Instruction::Ldi { label, .. } => Some(label),
            Instruction::Lea { label, .. } => Some(label),
            Instruction::St { label, .. } => Some(label),
            Instruction::Sti { label, .. } => Some(label),
            _ => None,
        };

        if let Some(lbl) = label {
            self.label_refs.push(LabelRef {
                name: lbl.value.clone(),
                span: lbl.span.clone(),
                line,
            });
        }
    }

    fn is_subroutine_target(&self, _label: &Spanned<String>) -> bool {
        // Could check if any JSR refers to this label
        // For now, just return false - we could refine later
        false
    }

    fn offset_to_line(&self, offset: usize) -> u32 {
        offset_to_position(&self.line_starts, offset).0
    }

    /// Get all diagnostics (parse errors + semantic errors).
    pub fn diagnostics(&self) -> Vec<Diagnostic> {
        let mut diagnostics = self.parse_errors.clone();

        // Check for undefined labels
        for label_ref in &self.label_refs {
            if !self.symbols.contains_key(&label_ref.name) {
                let (start_line, start_col) =
                    offset_to_position(&self.line_starts, label_ref.span.start);
                let (end_line, end_col) = offset_to_position(&self.line_starts, label_ref.span.end);
                diagnostics.push(Diagnostic {
                    message: format!("undefined label: {}", label_ref.name),
                    severity: Severity::Error,
                    start_line,
                    start_col,
                    end_line,
                    end_col,
                });
            }
        }

        diagnostics
    }

    /// Get definition location for a position.
    pub fn definition(&self, line: u32, col: u32) -> Option<Location> {
        let label_name = self.find_label_at_position(line, col)?;
        let symbol = self.symbols.get(&label_name)?;

        let (start_line, start_col) = offset_to_position(&self.line_starts, symbol.span.start);
        let (end_line, end_col) = offset_to_position(&self.line_starts, symbol.span.end);

        Some(Location {
            start_line,
            start_col,
            end_line,
            end_col,
        })
    }

    /// Get all references to a symbol at position.
    pub fn references(&self, line: u32, col: u32) -> Vec<Location> {
        let label_name = match self.find_label_at_position(line, col) {
            Some(name) => name,
            None => return Vec::new(),
        };

        let mut locations = Vec::new();

        // Add definition
        if let Some(symbol) = self.symbols.get(&label_name) {
            let (start_line, start_col) = offset_to_position(&self.line_starts, symbol.span.start);
            let (end_line, end_col) = offset_to_position(&self.line_starts, symbol.span.end);
            locations.push(Location {
                start_line,
                start_col,
                end_line,
                end_col,
            });
        }

        // Add all references
        for label_ref in &self.label_refs {
            if label_ref.name == label_name {
                let (start_line, start_col) =
                    offset_to_position(&self.line_starts, label_ref.span.start);
                let (end_line, end_col) = offset_to_position(&self.line_starts, label_ref.span.end);
                locations.push(Location {
                    start_line,
                    start_col,
                    end_line,
                    end_col,
                });
            }
        }

        locations
    }

    /// Get hover information for a position.
    pub fn hover(&self, line: u32, col: u32) -> Option<HoverInfo> {
        // Check if hovering over a label reference or definition
        if let Some(label_name) = self.find_label_at_position(line, col) {
            if let Some(symbol) = self.symbols.get(&label_name) {
                let kind_str = match symbol.kind {
                    SymbolKind::Label => "label",
                    SymbolKind::Subroutine => "subroutine",
                    SymbolKind::Data => "data",
                };
                let contents = format!(
                    "**{}** ({})\n\nAddress: `x{:04X}`",
                    symbol.name, kind_str, symbol.address
                );
                return Some(HoverInfo {
                    contents,
                    range: None,
                });
            } else {
                return Some(HoverInfo {
                    contents: format!("**{}** (undefined)", label_name),
                    range: None,
                });
            }
        }

        // TODO: Check if hovering over an instruction (provide instruction docs)
        None
    }

    /// Get completions at a position.
    pub fn completions(&self, _line: u32, _col: u32) -> Vec<CompletionItem> {
        let mut items = Vec::new();

        // Add all defined labels
        for symbol in self.symbols.values() {
            let kind_str = match symbol.kind {
                SymbolKind::Label => "label",
                SymbolKind::Subroutine => "subroutine",
                SymbolKind::Data => "data",
            };
            items.push(CompletionItem {
                label: symbol.name.clone(),
                kind: CompletionKind::Label,
                detail: Some(format!("{} at x{:04X}", kind_str, symbol.address)),
                documentation: None,
                insert_text: None,
            });
        }

        // Add instructions
        for instr in INSTRUCTIONS {
            items.push(CompletionItem {
                label: instr.name.to_string(),
                kind: CompletionKind::Keyword,
                detail: Some(instr.signature.to_string()),
                documentation: Some(instr.description.to_string()),
                insert_text: Some(instr.snippet.to_string()),
            });
        }

        // Add directives
        for dir in DIRECTIVES {
            items.push(CompletionItem {
                label: dir.name.to_string(),
                kind: CompletionKind::Keyword,
                detail: Some(dir.signature.to_string()),
                documentation: Some(dir.description.to_string()),
                insert_text: Some(dir.snippet.to_string()),
            });
        }

        items
    }

    /// Get all symbols in the document.
    pub fn symbols(&self) -> Vec<SymbolInfo> {
        self.symbols
            .values()
            .map(|s| {
                let (start_line, start_col) = offset_to_position(&self.line_starts, s.span.start);
                let (end_line, end_col) = offset_to_position(&self.line_starts, s.span.end);
                SymbolInfo {
                    name: s.name.clone(),
                    kind: s.kind,
                    location: Location {
                        start_line,
                        start_col,
                        end_line,
                        end_col,
                    },
                    address: Some(s.address),
                    documentation: None,
                }
            })
            .collect()
    }

    /// Get semantic tokens for syntax highlighting.
    ///
    /// Returns tokens sorted by position for efficient rendering.
    pub fn tokens(&self) -> Vec<SemanticToken> {
        let mut tokens = Vec::new();

        // Tokenize the source line by line
        for (line_idx, line_content) in self.source.lines().enumerate() {
            let line_num = (line_idx + 1) as u32;
            self.tokenize_line(line_content, line_num, &mut tokens);
        }

        tokens
    }

    fn tokenize_line(&self, line: &str, line_num: u32, tokens: &mut Vec<SemanticToken>) {
        let mut chars = line.char_indices().peekable();

        while let Some((i, c)) = chars.next() {
            let col = (i + 1) as u32;

            // Skip whitespace
            if c.is_whitespace() {
                continue;
            }

            // Comment
            if c == ';' {
                let len = (line.len() - i) as u32;
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: len,
                    token_type: TokenType::Comment,
                });
                break;
            }

            // String literal
            if c == '"' {
                let start = i;
                let mut end = i + 1;
                while let Some((j, ch)) = chars.next() {
                    end = j + 1;
                    if ch == '"' {
                        break;
                    }
                }
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: (end - start) as u32,
                    token_type: TokenType::String,
                });
                continue;
            }

            // Directive (starts with .)
            if c == '.' {
                let start = i;
                let mut end = i + 1;
                while let Some(&(j, ch)) = chars.peek() {
                    if ch.is_ascii_alphabetic() {
                        end = j + 1;
                        chars.next();
                    } else {
                        break;
                    }
                }
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: (end - start) as u32,
                    token_type: TokenType::Directive,
                });
                continue;
            }

            // Hex number (x or X followed by hex digits)
            if (c == 'x' || c == 'X')
                && chars
                    .peek()
                    .map_or(false, |&(_, ch)| ch.is_ascii_hexdigit())
            {
                let start = i;
                let mut end = i + 1;
                while let Some(&(j, ch)) = chars.peek() {
                    if ch.is_ascii_hexdigit() {
                        end = j + 1;
                        chars.next();
                    } else {
                        break;
                    }
                }
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: (end - start) as u32,
                    token_type: TokenType::Number,
                });
                continue;
            }

            // Decimal number (starts with # or digit or -)
            if c == '#'
                || c.is_ascii_digit()
                || (c == '-' && chars.peek().map_or(false, |&(_, ch)| ch.is_ascii_digit()))
            {
                let start = i;
                let mut end = i + 1;
                while let Some(&(j, ch)) = chars.peek() {
                    if ch.is_ascii_digit() {
                        end = j + 1;
                        chars.next();
                    } else {
                        break;
                    }
                }
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: (end - start) as u32,
                    token_type: TokenType::Number,
                });
                continue;
            }

            // Register (R0-R7)
            if (c == 'R' || c == 'r') && chars.peek().map_or(false, |&(_, ch)| ch.is_ascii_digit())
            {
                chars.next(); // consume the digit
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: 2,
                    token_type: TokenType::Register,
                });
                continue;
            }

            // Identifier (instruction, label, or label reference)
            if c.is_ascii_alphabetic() || c == '_' {
                let start = i;
                let mut end = i + 1;
                while let Some(&(j, ch)) = chars.peek() {
                    if ch.is_ascii_alphanumeric() || ch == '_' {
                        end = j + 1;
                        chars.next();
                    } else {
                        break;
                    }
                }
                let word = &line[start..end];
                let word_upper = word.to_ascii_uppercase();

                // Determine token type
                let token_type = if is_instruction(&word_upper) {
                    TokenType::Keyword
                } else if self.symbols.contains_key(&word_upper) {
                    // Check if this is a definition or reference
                    let offset = self.line_starts.get(line_num as usize - 1).unwrap_or(&0) + start;
                    let is_definition = self
                        .symbols
                        .get(&word_upper)
                        .map_or(false, |s| s.span.contains(&offset));
                    if is_definition {
                        TokenType::Label
                    } else {
                        TokenType::LabelRef
                    }
                } else {
                    // Unknown identifier - could be undefined label
                    TokenType::LabelRef
                };

                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: (end - start) as u32,
                    token_type,
                });
                continue;
            }

            // Comma and other operators
            if c == ',' {
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: 1,
                    token_type: TokenType::Operator,
                });
                continue;
            }

            // Colon (label separator)
            if c == ':' {
                tokens.push(SemanticToken {
                    line: line_num,
                    start_col: col,
                    length: 1,
                    token_type: TokenType::Operator,
                });
                continue;
            }
        }
    }

    fn find_label_at_position(&self, line: u32, col: u32) -> Option<String> {
        let offset = position_to_offset(&self.line_starts, line, col)?;

        // Check label definitions
        for symbol in self.symbols.values() {
            if symbol.span.contains(&offset) {
                return Some(symbol.name.clone());
            }
        }

        // Check label references
        for label_ref in &self.label_refs {
            if label_ref.span.contains(&offset) {
                return Some(label_ref.name.clone());
            }
        }

        None
    }
}

/// Instruction documentation.
struct InstrDoc {
    name: &'static str,
    signature: &'static str,
    description: &'static str,
    snippet: &'static str,
}

const INSTRUCTIONS: &[InstrDoc] = &[
    InstrDoc {
        name: "ADD",
        signature: "ADD DR, SR1, SR2 | ADD DR, SR1, imm5",
        description: "Add: DR = SR1 + SR2 or DR = SR1 + imm5",
        snippet: "ADD R${1:0}, R${2:0}, ${3:R0}",
    },
    InstrDoc {
        name: "AND",
        signature: "AND DR, SR1, SR2 | AND DR, SR1, imm5",
        description: "Bitwise AND: DR = SR1 & SR2 or DR = SR1 & imm5",
        snippet: "AND R${1:0}, R${2:0}, ${3:R0}",
    },
    InstrDoc {
        name: "NOT",
        signature: "NOT DR, SR",
        description: "Bitwise NOT: DR = ~SR",
        snippet: "NOT R${1:0}, R${2:0}",
    },
    InstrDoc {
        name: "BR",
        signature: "BR[n][z][p] LABEL",
        description: "Conditional branch based on condition codes",
        snippet: "BR${1:nzp} ${2:LABEL}",
    },
    InstrDoc {
        name: "JMP",
        signature: "JMP BaseR",
        description: "Jump to address in BaseR",
        snippet: "JMP R${1:7}",
    },
    InstrDoc {
        name: "RET",
        signature: "RET",
        description: "Return from subroutine (JMP R7)",
        snippet: "RET",
    },
    InstrDoc {
        name: "JSR",
        signature: "JSR LABEL",
        description: "Jump to subroutine, save return address in R7",
        snippet: "JSR ${1:LABEL}",
    },
    InstrDoc {
        name: "JSRR",
        signature: "JSRR BaseR",
        description: "Jump to subroutine at address in BaseR",
        snippet: "JSRR R${1:0}",
    },
    InstrDoc {
        name: "LD",
        signature: "LD DR, LABEL",
        description: "Load: DR = mem[LABEL]",
        snippet: "LD R${1:0}, ${2:LABEL}",
    },
    InstrDoc {
        name: "LDI",
        signature: "LDI DR, LABEL",
        description: "Load indirect: DR = mem[mem[LABEL]]",
        snippet: "LDI R${1:0}, ${2:LABEL}",
    },
    InstrDoc {
        name: "LDR",
        signature: "LDR DR, BaseR, offset6",
        description: "Load base+offset: DR = mem[BaseR + offset6]",
        snippet: "LDR R${1:0}, R${2:0}, #${3:0}",
    },
    InstrDoc {
        name: "LEA",
        signature: "LEA DR, LABEL",
        description: "Load effective address: DR = address of LABEL",
        snippet: "LEA R${1:0}, ${2:LABEL}",
    },
    InstrDoc {
        name: "ST",
        signature: "ST SR, LABEL",
        description: "Store: mem[LABEL] = SR",
        snippet: "ST R${1:0}, ${2:LABEL}",
    },
    InstrDoc {
        name: "STI",
        signature: "STI SR, LABEL",
        description: "Store indirect: mem[mem[LABEL]] = SR",
        snippet: "STI R${1:0}, ${2:LABEL}",
    },
    InstrDoc {
        name: "STR",
        signature: "STR SR, BaseR, offset6",
        description: "Store base+offset: mem[BaseR + offset6] = SR",
        snippet: "STR R${1:0}, R${2:0}, #${3:0}",
    },
    InstrDoc {
        name: "TRAP",
        signature: "TRAP trapvect8",
        description: "Execute trap service routine",
        snippet: "TRAP x${1:25}",
    },
    InstrDoc {
        name: "HALT",
        signature: "HALT",
        description: "Halt execution (TRAP x25)",
        snippet: "HALT",
    },
    InstrDoc {
        name: "GETC",
        signature: "GETC",
        description: "Read character into R0 (TRAP x20)",
        snippet: "GETC",
    },
    InstrDoc {
        name: "OUT",
        signature: "OUT",
        description: "Output character in R0 (TRAP x21)",
        snippet: "OUT",
    },
    InstrDoc {
        name: "PUTS",
        signature: "PUTS",
        description: "Output null-terminated string at address in R0 (TRAP x22)",
        snippet: "PUTS",
    },
    InstrDoc {
        name: "IN",
        signature: "IN",
        description: "Prompt and read character into R0 (TRAP x23)",
        snippet: "IN",
    },
    InstrDoc {
        name: "PUTSP",
        signature: "PUTSP",
        description: "Output packed string at address in R0 (TRAP x24)",
        snippet: "PUTSP",
    },
    InstrDoc {
        name: "RTI",
        signature: "RTI",
        description: "Return from interrupt",
        snippet: "RTI",
    },
];

const DIRECTIVES: &[InstrDoc] = &[
    InstrDoc {
        name: ".ORIG",
        signature: ".ORIG address",
        description: "Set the starting address for the program",
        snippet: ".ORIG x${1:3000}",
    },
    InstrDoc {
        name: ".END",
        signature: ".END",
        description: "Mark the end of the program",
        snippet: ".END",
    },
    InstrDoc {
        name: ".FILL",
        signature: ".FILL value",
        description: "Allocate one word and initialize with value",
        snippet: ".FILL ${1:0}",
    },
    InstrDoc {
        name: ".BLKW",
        signature: ".BLKW count",
        description: "Allocate count words of memory",
        snippet: ".BLKW ${1:1}",
    },
    InstrDoc {
        name: ".STRINGZ",
        signature: ".STRINGZ \"string\"",
        description: "Allocate null-terminated string",
        snippet: ".STRINGZ \"${1:text}\"",
    },
];

/// Check if a word is an LC-3 instruction (case-insensitive).
fn is_instruction(word: &str) -> bool {
    matches!(
        word,
        "ADD"
            | "AND"
            | "NOT"
            | "BR"
            | "BRN"
            | "BRZ"
            | "BRP"
            | "BRNZ"
            | "BRNP"
            | "BRZP"
            | "BRNZP"
            | "JMP"
            | "RET"
            | "JSR"
            | "JSRR"
            | "LD"
            | "LDI"
            | "LDR"
            | "LEA"
            | "ST"
            | "STI"
            | "STR"
            | "TRAP"
            | "HALT"
            | "GETC"
            | "OUT"
            | "PUTS"
            | "IN"
            | "PUTSP"
            | "RTI"
    )
}

/// Compute line start offsets for a source string.
fn compute_line_starts(source: &str) -> Vec<usize> {
    let mut starts = vec![0];
    for (i, c) in source.char_indices() {
        if c == '\n' {
            starts.push(i + 1);
        }
    }
    starts
}

/// Convert byte offset to (line, column), both 1-based.
fn offset_to_position(line_starts: &[usize], offset: usize) -> (u32, u32) {
    let line_idx = line_starts
        .partition_point(|&start| start <= offset)
        .saturating_sub(1);
    let line = (line_idx + 1) as u32;
    let col = (offset - line_starts[line_idx] + 1) as u32;
    (line, col)
}

/// Convert (line, column) to byte offset. Both are 1-based.
fn position_to_offset(line_starts: &[usize], line: u32, col: u32) -> Option<usize> {
    let line_idx = (line as usize).checked_sub(1)?;
    if line_idx >= line_starts.len() {
        return None;
    }
    let offset = line_starts[line_idx] + (col as usize).saturating_sub(1);
    Some(offset)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_analysis() {
        let source = r#".ORIG x3000
LOOP    ADD R0, R0, #1
        BRZ DONE
        BRnzp LOOP
DONE    HALT
.END"#;

        let doc = AnalyzedDocument::new(source);

        assert!(doc.diagnostics().is_empty());
        assert_eq!(doc.symbols().len(), 2); // LOOP and DONE
    }

    #[test]
    fn test_undefined_label() {
        let source = r#".ORIG x3000
        BRZ MISSING
.END"#;

        let doc = AnalyzedDocument::new(source);
        let diags = doc.diagnostics();

        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("undefined label"));
    }

    #[test]
    fn test_goto_definition() {
        let source = r#".ORIG x3000
TARGET  ADD R0, R0, #1
        JSR TARGET
.END"#;

        let doc = AnalyzedDocument::new(source);

        // Find the location of "TARGET" in "JSR TARGET" (line 3)
        let loc = doc.definition(3, 13);
        assert!(loc.is_some());
        let loc = loc.unwrap();
        assert_eq!(loc.start_line, 2); // Definition is on line 2
    }

    #[test]
    fn test_completions() {
        let source = r#".ORIG x3000
MYDATA  .FILL x0000
.END"#;

        let doc = AnalyzedDocument::new(source);
        let completions = doc.completions(2, 1);

        // Should have MYDATA label + all instructions + all directives
        let label_completions: Vec<_> =
            completions.iter().filter(|c| c.label == "MYDATA").collect();
        assert_eq!(label_completions.len(), 1);
    }

    #[test]
    fn test_tokens() {
        let source = r#".ORIG x3000
LOOP    ADD R0, R1, #5  ; increment
        BRZ DONE
DONE    HALT
.END"#;

        let doc = AnalyzedDocument::new(source);
        let tokens = doc.tokens();

        // Should have tokens for each element
        assert!(!tokens.is_empty());

        // Check for specific token types
        let directives: Vec<_> = tokens
            .iter()
            .filter(|t| t.token_type == TokenType::Directive)
            .collect();
        assert_eq!(directives.len(), 2); // .ORIG and .END

        let keywords: Vec<_> = tokens
            .iter()
            .filter(|t| t.token_type == TokenType::Keyword)
            .collect();
        assert_eq!(keywords.len(), 3); // ADD, BRZ, HALT

        let registers: Vec<_> = tokens
            .iter()
            .filter(|t| t.token_type == TokenType::Register)
            .collect();
        assert_eq!(registers.len(), 2); // R0, R1

        let numbers: Vec<_> = tokens
            .iter()
            .filter(|t| t.token_type == TokenType::Number)
            .collect();
        assert_eq!(numbers.len(), 2); // x3000, #5

        let comments: Vec<_> = tokens
            .iter()
            .filter(|t| t.token_type == TokenType::Comment)
            .collect();
        assert_eq!(comments.len(), 1); // ; increment

        let labels: Vec<_> = tokens
            .iter()
            .filter(|t| t.token_type == TokenType::Label)
            .collect();
        assert_eq!(labels.len(), 2); // LOOP, DONE (definitions)

        let label_refs: Vec<_> = tokens
            .iter()
            .filter(|t| t.token_type == TokenType::LabelRef)
            .collect();
        assert_eq!(label_refs.len(), 1); // DONE (in BRZ DONE)
    }
}
