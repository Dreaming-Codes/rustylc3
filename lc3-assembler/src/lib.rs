//! LC-3 Assembler.
//!
//! This crate provides a two-pass assembler for LC-3 assembly language.
//!
//! # Example
//!
//! ```
//! use lc3_assembler::Assembler;
//!
//! let source = r#"
//! .ORIG x3000
//! ADD R0, R1, R2
//! HALT
//! .END
//! "#;
//!
//! let mut asm = Assembler::new();
//! let code = asm.assemble(source).unwrap();
//! assert_eq!(code[0], 0x1042); // ADD R0, R1, R2
//! assert_eq!(code[1], 0xF025); // HALT
//! ```

pub use lc3_parser::{
    AddSrc2, AndSrc2, Directive, Instruction, Line, Operand, ParseError, Program, Register, Span,
    Spanned, SpannedLine, format_errors, parse,
};

use std::collections::HashMap;

/// Assembly error with location information.
#[derive(Debug)]
pub enum AssemblyError {
    /// Syntax errors from the parser.
    ParseErrors(Vec<ParseError>),
    /// Semantic errors (undefined labels, range violations).
    SemanticError {
        message: String,
        line: Option<usize>,
    },
}

impl std::fmt::Display for AssemblyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ParseErrors(errors) => {
                for e in errors {
                    writeln!(f, "{e}")?;
                }
                Ok(())
            }
            Self::SemanticError { message, line } => match line {
                Some(n) => write!(f, "line {n}: {message}"),
                None => write!(f, "{message}"),
            },
        }
    }
}

impl std::error::Error for AssemblyError {}

/// Two-pass LC-3 assembler.
#[derive(Debug, Default)]
pub struct Assembler {
    symbols: HashMap<String, u16>,
    origin: u16,
}

impl Assembler {
    pub fn new() -> Self {
        Self::default()
    }

    /// Get the origin address (set by .ORIG directive during assembly).
    pub fn origin(&self) -> u16 {
        self.origin
    }

    /// Assemble source code into machine code words.
    pub fn assemble(&mut self, source: &str) -> Result<Vec<u16>, String> {
        self.assemble_with_errors(source).map_err(|e| e.to_string())
    }

    /// Assemble with detailed error information.
    pub fn assemble_with_errors(&mut self, source: &str) -> Result<Vec<u16>, AssemblyError> {
        self.symbols.clear();
        self.origin = 0x3000;

        let program = parse(source).map_err(AssemblyError::ParseErrors)?;
        self.first_pass(&program)?;
        self.second_pass(&program)
    }

    /// Format an error with source context for display.
    pub fn format_error(&self, filename: &str, source: &str, error: &AssemblyError) -> String {
        match error {
            AssemblyError::ParseErrors(errors) => format_errors(filename, source, errors),
            AssemblyError::SemanticError { message, line } => match line {
                Some(n) => format!("Error at line {n}: {message}"),
                None => format!("Error: {message}"),
            },
        }
    }

    fn first_pass(&mut self, program: &Program) -> Result<(), AssemblyError> {
        let mut pc = self.origin;

        for spanned_line in &program.lines {
            match &spanned_line.line {
                Line::Label(label) => {
                    self.symbols.insert(label.value.clone(), pc);
                }
                Line::LabeledDirective(label, dir) => {
                    self.symbols.insert(label.value.clone(), pc);
                    pc = self.advance_pc_directive(dir, pc)?;
                }
                Line::LabeledInstruction(label, _) => {
                    self.symbols.insert(label.value.clone(), pc);
                    pc += 1;
                }
                Line::Directive(dir) => {
                    pc = self.advance_pc_directive(dir, pc)?;
                }
                Line::Instruction(_) => pc += 1,
                Line::Empty | Line::Error => {}
            }
        }
        Ok(())
    }

    fn advance_pc_directive(&mut self, dir: &Directive, pc: u16) -> Result<u16, AssemblyError> {
        Ok(match dir {
            Directive::Orig(addr) => {
                self.origin = *addr;
                *addr
            }
            Directive::Fill(_) => pc + 1,
            Directive::Blkw(n) => pc + n,
            Directive::Stringz(s) => pc + s.len() as u16 + 1,
            Directive::End => pc,
        })
    }

    fn second_pass(&self, program: &Program) -> Result<Vec<u16>, AssemblyError> {
        let mut result = Vec::new();
        let mut pc = self.origin;

        for spanned_line in &program.lines {
            match &spanned_line.line {
                Line::Label(_) => {}
                Line::LabeledDirective(_, dir) | Line::Directive(dir) => {
                    let (words, new_pc) = self.emit_directive(dir, pc)?;
                    result.extend(words);
                    pc = new_pc;
                }
                Line::LabeledInstruction(_, instr) | Line::Instruction(instr) => {
                    result.push(self.emit_instruction(instr, pc)?);
                    pc += 1;
                }
                Line::Empty | Line::Error => {}
            }
        }
        Ok(result)
    }

    fn emit_directive(&self, dir: &Directive, pc: u16) -> Result<(Vec<u16>, u16), AssemblyError> {
        Ok(match dir {
            Directive::Orig(addr) => (vec![], *addr),
            Directive::Fill(op) => (vec![self.resolve_operand(op)?], pc + 1),
            Directive::Blkw(n) => (vec![0; *n as usize], pc + n),
            Directive::Stringz(s) => {
                let mut words: Vec<u16> = s.chars().map(|c| c as u16).collect();
                words.push(0);
                let len = words.len() as u16;
                (words, pc + len)
            }
            Directive::End => (vec![], pc),
        })
    }

    fn resolve_operand(&self, op: &Operand) -> Result<u16, AssemblyError> {
        match op {
            Operand::Immediate(v) => Ok(*v as u16),
            Operand::Label(label) => self.symbols.get(&label.value).copied().ok_or_else(|| {
                AssemblyError::SemanticError {
                    message: format!("undefined symbol: {}", label.value),
                    line: None,
                }
            }),
            Operand::Register(_) => Err(AssemblyError::SemanticError {
                message: "cannot use register as value".into(),
                line: None,
            }),
            Operand::String(_) => Err(AssemblyError::SemanticError {
                message: "cannot use string as value".into(),
                line: None,
            }),
        }
    }

    fn resolve_label(&self, label: &str, pc: u16) -> Result<i16, AssemblyError> {
        self.symbols
            .get(label)
            .map(|&addr| addr.wrapping_sub(pc + 1) as i16)
            .ok_or_else(|| AssemblyError::SemanticError {
                message: format!("undefined symbol: {label}"),
                line: None,
            })
    }

    fn emit_instruction(&self, instr: &Instruction, pc: u16) -> Result<u16, AssemblyError> {
        use Instruction::*;
        Ok(match instr {
            Add { dr, sr1, src2 } => self.emit_alu(0b0001, *dr, *sr1, src2)?,
            And { dr, sr1, src2 } => self.emit_alu(0b0101, *dr, *sr1, src2)?,
            Not { dr, sr } => (0b1001 << 12) | (dr.0 as u16) << 9 | (sr.0 as u16) << 6 | 0x3F,
            Br { n, z, p, label } => self.emit_br(*n, *z, *p, label, pc)?,
            Jmp { base } => (0b1100 << 12) | (base.0 as u16) << 6,
            Ret => 0xC1C0,
            Jsr { label } => self.emit_jsr(label, pc)?,
            Jsrr { base } => (0b0100 << 12) | (base.0 as u16) << 6,
            Ld { dr, label } => self.emit_pc_offset(0b0010, dr.0, label, pc, 9)?,
            Ldi { dr, label } => self.emit_pc_offset(0b1010, dr.0, label, pc, 9)?,
            Ldr { dr, base, offset } => self.emit_base_offset(0b0110, dr.0, base.0, *offset)?,
            Lea { dr, label } => self.emit_pc_offset(0b1110, dr.0, label, pc, 9)?,
            St { sr, label } => self.emit_pc_offset(0b0011, sr.0, label, pc, 9)?,
            Sti { sr, label } => self.emit_pc_offset(0b1011, sr.0, label, pc, 9)?,
            Str { sr, base, offset } => self.emit_base_offset(0b0111, sr.0, base.0, *offset)?,
            Trap { trapvect } => 0xF000 | (*trapvect as u16),
            Getc => 0xF020,
            Out => 0xF021,
            Puts => 0xF022,
            In => 0xF023,
            Putsp => 0xF024,
            Halt => 0xF025,
            Rti => 0x8000,
        })
    }

    fn emit_alu<T: AluSrc2>(
        &self,
        op: u16,
        dr: Register,
        sr1: Register,
        src2: &T,
    ) -> Result<u16, AssemblyError> {
        let base = (op << 12) | (dr.0 as u16) << 9 | (sr1.0 as u16) << 6;
        src2.encode(base)
    }

    fn emit_br(
        &self,
        n: bool,
        z: bool,
        p: bool,
        label: &Spanned<String>,
        pc: u16,
    ) -> Result<u16, AssemblyError> {
        let offset = self.resolve_label(&label.value, pc)?;
        check_offset(offset, 9, "BR")?;
        Ok((n as u16) << 11 | (z as u16) << 10 | (p as u16) << 9 | (offset as u16 & 0x1FF))
    }

    fn emit_jsr(&self, label: &Spanned<String>, pc: u16) -> Result<u16, AssemblyError> {
        let offset = self.resolve_label(&label.value, pc)?;
        check_offset(offset, 11, "JSR")?;
        Ok((0b0100 << 12) | (1 << 11) | (offset as u16 & 0x7FF))
    }

    fn emit_pc_offset(
        &self,
        op: u16,
        reg: u8,
        label: &Spanned<String>,
        pc: u16,
        bits: u8,
    ) -> Result<u16, AssemblyError> {
        let offset = self.resolve_label(&label.value, pc)?;
        check_offset(offset, bits, op_name(op))?;
        let mask = (1u16 << bits) - 1;
        Ok((op << 12) | (reg as u16) << 9 | (offset as u16 & mask))
    }

    fn emit_base_offset(
        &self,
        op: u16,
        reg: u8,
        base: u8,
        offset: i8,
    ) -> Result<u16, AssemblyError> {
        if !(-32..=31).contains(&offset) {
            return Err(AssemblyError::SemanticError {
                message: format!("{} offset out of range (-32 to 31)", op_name(op)),
                line: None,
            });
        }
        Ok((op << 12) | (reg as u16) << 9 | (base as u16) << 6 | (offset as u16 & 0x3F))
    }
}

trait AluSrc2 {
    fn encode(&self, base: u16) -> Result<u16, AssemblyError>;
}

impl AluSrc2 for AddSrc2 {
    fn encode(&self, base: u16) -> Result<u16, AssemblyError> {
        match self {
            AddSrc2::Register(r) => Ok(base | r.0 as u16),
            AddSrc2::Immediate(imm) => {
                if *imm < -16 || *imm > 15 {
                    return Err(AssemblyError::SemanticError {
                        message: "immediate value out of range (-16 to 15)".into(),
                        line: None,
                    });
                }
                Ok(base | (1 << 5) | (*imm as u16 & 0x1F))
            }
        }
    }
}

impl AluSrc2 for AndSrc2 {
    fn encode(&self, base: u16) -> Result<u16, AssemblyError> {
        match self {
            AndSrc2::Register(r) => Ok(base | r.0 as u16),
            AndSrc2::Immediate(imm) => {
                if *imm < -16 || *imm > 15 {
                    return Err(AssemblyError::SemanticError {
                        message: "immediate value out of range (-16 to 15)".into(),
                        line: None,
                    });
                }
                Ok(base | (1 << 5) | (*imm as u16 & 0x1F))
            }
        }
    }
}

fn check_offset(offset: i16, bits: u8, op: &str) -> Result<(), AssemblyError> {
    let max = (1 << (bits - 1)) - 1;
    let min = -(1 << (bits - 1));
    if offset < min || offset > max {
        Err(AssemblyError::SemanticError {
            message: format!("{op} offset out of range ({min} to {max})"),
            line: None,
        })
    } else {
        Ok(())
    }
}

const fn op_name(op: u16) -> &'static str {
    match op {
        0b0010 => "LD",
        0b1010 => "LDI",
        0b0110 => "LDR",
        0b1110 => "LEA",
        0b0011 => "ST",
        0b1011 => "STI",
        0b0111 => "STR",
        _ => "instruction",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_program() {
        let source = ".ORIG x3000\nADD R0, R1, R2\nHALT\n.END";
        let mut asm = Assembler::new();
        let code = asm.assemble(source).unwrap();
        assert_eq!(code, vec![0x1042, 0xF025]);
    }

    #[test]
    fn test_add_immediate() {
        let source = ".ORIG x3000\nADD R0, R0, #1\n.END";
        let mut asm = Assembler::new();
        let code = asm.assemble(source).unwrap();
        assert_eq!(code[0], 0x1021);
    }

    #[test]
    fn test_branch() {
        let source = ".ORIG x3000\nLOOP ADD R0, R0, #1\n     BRZ LOOP\n.END";
        let mut asm = Assembler::new();
        assert!(asm.assemble(source).is_ok());
    }

    #[test]
    fn test_stringz() {
        let source = ".ORIG x3000\nLEA R0, MSG\nPUTS\nHALT\nMSG .STRINGZ \"Hello\"\n.END";
        let mut asm = Assembler::new();
        let code = asm.assemble(source).unwrap();
        assert_eq!(code.len(), 3 + 6); // LEA, PUTS, HALT + "Hello\0"
    }
}
