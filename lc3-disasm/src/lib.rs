//! LC-3 Disassembler
//!
//! Converts 16-bit LC-3 machine code instructions to human-readable assembly format.

use std::collections::HashMap;

/// Symbol table type - maps address to label name
pub type SymbolTable = HashMap<u16, String>;

/// Sign-extend a value from `bits` width to a signed 16-bit value.
#[inline]
fn sign_extend(val: u16, bits: u8) -> i16 {
    let mask = 1 << (bits - 1);
    if val & mask != 0 {
        (val | (!0u16 << bits)) as i16
    } else {
        val as i16
    }
}

/// Format a PC-relative offset, using a label if available.
fn format_pc_offset(pc: u16, offset: u16, bits: u8, symbols: Option<&SymbolTable>) -> String {
    let signed = sign_extend(offset, bits);
    let target_addr = pc.wrapping_add_signed(signed);

    if let Some(syms) = symbols {
        if let Some(label) = syms.get(&target_addr) {
            return label.clone();
        }
    }

    format!("x{:04X}", target_addr)
}

/// Format an immediate value with sign.
fn format_immediate(val: u16, bits: u8) -> String {
    let signed = sign_extend(val, bits);
    format!("#{}", signed)
}

/// Format a trap vector, using known trap names.
fn format_trap_vector(vec: u16) -> String {
    match vec {
        0x20 => "GETC".to_string(),
        0x21 => "OUT".to_string(),
        0x22 => "PUTS".to_string(),
        0x23 => "IN".to_string(),
        0x24 => "PUTSP".to_string(),
        0x25 => "HALT".to_string(),
        _ => format!("TRAP x{:02X}", vec),
    }
}

/// Disassemble a single LC-3 instruction.
///
/// # Arguments
/// * `instr` - The 16-bit instruction value
/// * `pc` - The address of the *next* instruction (PC after fetch, i.e., address of this instruction + 1)
/// * `symbols` - Optional symbol table for resolving addresses to labels
///
/// # Returns
/// Human-readable assembly instruction string
pub fn disassemble(instr: u16, pc: u16, symbols: Option<&SymbolTable>) -> String {
    let opcode = (instr >> 12) & 0xF;

    match opcode {
        0b0001 => {
            // ADD
            let dr = (instr >> 9) & 0x7;
            let sr1 = (instr >> 6) & 0x7;
            if instr & 0x20 != 0 {
                let imm5 = instr & 0x1F;
                format!("ADD R{}, R{}, {}", dr, sr1, format_immediate(imm5, 5))
            } else {
                let sr2 = instr & 0x7;
                format!("ADD R{}, R{}, R{}", dr, sr1, sr2)
            }
        }

        0b0101 => {
            // AND
            let dr = (instr >> 9) & 0x7;
            let sr1 = (instr >> 6) & 0x7;
            if instr & 0x20 != 0 {
                let imm5 = instr & 0x1F;
                format!("AND R{}, R{}, {}", dr, sr1, format_immediate(imm5, 5))
            } else {
                let sr2 = instr & 0x7;
                format!("AND R{}, R{}, R{}", dr, sr1, sr2)
            }
        }

        0b1001 => {
            // NOT
            let dr = (instr >> 9) & 0x7;
            let sr = (instr >> 6) & 0x7;
            format!("NOT R{}, R{}", dr, sr)
        }

        0b0000 => {
            // BR
            let n = (instr >> 11) & 0x1;
            let z = (instr >> 10) & 0x1;
            let p = (instr >> 9) & 0x1;
            let offset9 = instr & 0x1FF;

            let mut cond = String::new();
            if n != 0 {
                cond.push('n');
            }
            if z != 0 {
                cond.push('z');
            }
            if p != 0 {
                cond.push('p');
            }

            // BRnzp is unconditional, show as BR
            if cond == "nzp" {
                cond.clear();
            }

            let target = format_pc_offset(pc, offset9, 9, symbols);
            format!("BR{} {}", cond, target)
        }

        0b1100 => {
            // JMP / RET
            let base_r = (instr >> 6) & 0x7;
            if base_r == 7 {
                "RET".to_string()
            } else {
                format!("JMP R{}", base_r)
            }
        }

        0b0100 => {
            // JSR / JSRR
            if instr & 0x800 != 0 {
                // JSR - PC-relative
                let offset11 = instr & 0x7FF;
                let target = format_pc_offset(pc, offset11, 11, symbols);
                format!("JSR {}", target)
            } else {
                // JSRR - register
                let base_r = (instr >> 6) & 0x7;
                format!("JSRR R{}", base_r)
            }
        }

        0b0010 => {
            // LD
            let dr = (instr >> 9) & 0x7;
            let offset9 = instr & 0x1FF;
            let target = format_pc_offset(pc, offset9, 9, symbols);
            format!("LD R{}, {}", dr, target)
        }

        0b1010 => {
            // LDI
            let dr = (instr >> 9) & 0x7;
            let offset9 = instr & 0x1FF;
            let target = format_pc_offset(pc, offset9, 9, symbols);
            format!("LDI R{}, {}", dr, target)
        }

        0b0110 => {
            // LDR
            let dr = (instr >> 9) & 0x7;
            let base_r = (instr >> 6) & 0x7;
            let offset6 = instr & 0x3F;
            format!("LDR R{}, R{}, {}", dr, base_r, format_immediate(offset6, 6))
        }

        0b1110 => {
            // LEA
            let dr = (instr >> 9) & 0x7;
            let offset9 = instr & 0x1FF;
            let target = format_pc_offset(pc, offset9, 9, symbols);
            format!("LEA R{}, {}", dr, target)
        }

        0b0011 => {
            // ST
            let sr = (instr >> 9) & 0x7;
            let offset9 = instr & 0x1FF;
            let target = format_pc_offset(pc, offset9, 9, symbols);
            format!("ST R{}, {}", sr, target)
        }

        0b1011 => {
            // STI
            let sr = (instr >> 9) & 0x7;
            let offset9 = instr & 0x1FF;
            let target = format_pc_offset(pc, offset9, 9, symbols);
            format!("STI R{}, {}", sr, target)
        }

        0b0111 => {
            // STR
            let sr = (instr >> 9) & 0x7;
            let base_r = (instr >> 6) & 0x7;
            let offset6 = instr & 0x3F;
            format!("STR R{}, R{}, {}", sr, base_r, format_immediate(offset6, 6))
        }

        0b1111 => {
            // TRAP
            let trapvec = instr & 0xFF;
            format_trap_vector(trapvec)
        }

        0b1000 => {
            // RTI
            "RTI".to_string()
        }

        _ => {
            // Reserved opcode (0b1101) or unknown - show as .FILL
            format!(".FILL x{:04X}", instr)
        }
    }
}

/// Disassemble a single instruction without symbol table.
///
/// Convenience function that calls `disassemble` with `symbols = None`.
pub fn disassemble_simple(instr: u16, pc: u16) -> String {
    disassemble(instr, pc, None)
}

/// Check if an instruction value looks like valid code (vs. data).
///
/// Returns `false` for:
/// - Reserved opcode (0b1101)
/// - All zeros (uninitialized memory)
pub fn is_likely_instruction(instr: u16) -> bool {
    let opcode = (instr >> 12) & 0xF;

    // Reserved opcode
    if opcode == 0b1101 {
        return false;
    }

    // All zeros is likely uninitialized memory
    if instr == 0 {
        return false;
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_register() {
        // ADD R0, R1, R2 (PC at x3001 means instruction was at x3000)
        assert_eq!(disassemble_simple(0x1042, 0x3001), "ADD R0, R1, R2");
    }

    #[test]
    fn test_add_immediate() {
        // ADD R0, R1, #5
        assert_eq!(disassemble_simple(0x1065, 0x3001), "ADD R0, R1, #5");
        // ADD R0, R1, #-1
        assert_eq!(disassemble_simple(0x107F, 0x3001), "ADD R0, R1, #-1");
    }

    #[test]
    fn test_and_register() {
        // AND R0, R1, R2
        assert_eq!(disassemble_simple(0x5042, 0x3001), "AND R0, R1, R2");
    }

    #[test]
    fn test_and_immediate() {
        // AND R0, R1, #0
        assert_eq!(disassemble_simple(0x5060, 0x3001), "AND R0, R1, #0");
    }

    #[test]
    fn test_not() {
        // NOT R0, R1
        assert_eq!(disassemble_simple(0x907F, 0x3001), "NOT R0, R1");
    }

    #[test]
    fn test_br() {
        // BRnzp (unconditional) to x3004 from x3001 (offset +3)
        assert_eq!(disassemble_simple(0x0E03, 0x3001), "BR x3004");
        // BRz to x3002 from x3001 (offset +1)
        assert_eq!(disassemble_simple(0x0401, 0x3001), "BRz x3002");
        // BRnp to x3000 from x3001 (offset -1 = 0x1FF in 9-bit)
        assert_eq!(disassemble_simple(0x0BFF, 0x3001), "BRnp x3000");
    }

    #[test]
    fn test_jmp_ret() {
        // JMP R3
        assert_eq!(disassemble_simple(0xC0C0, 0x3001), "JMP R3");
        // RET (JMP R7)
        assert_eq!(disassemble_simple(0xC1C0, 0x3001), "RET");
    }

    #[test]
    fn test_jsr_jsrr() {
        // JSR to x3100 from x3001
        assert_eq!(disassemble_simple(0x48FF, 0x3001), "JSR x3100");
        // JSRR R2
        assert_eq!(disassemble_simple(0x4080, 0x3001), "JSRR R2");
    }

    #[test]
    fn test_ld_ldi_ldr() {
        // LD R0, x3005 from x3001
        assert_eq!(disassemble_simple(0x2003, 0x3001), "LD R0, x3004");
        // LDI R1, x3010 from x3001
        assert_eq!(disassemble_simple(0xA20E, 0x3001), "LDI R1, x300F");
        // LDR R2, R3, #5
        assert_eq!(disassemble_simple(0x64C5, 0x3001), "LDR R2, R3, #5");
    }

    #[test]
    fn test_lea() {
        // LEA R0, x3005 from x3001
        assert_eq!(disassemble_simple(0xE003, 0x3001), "LEA R0, x3004");
    }

    #[test]
    fn test_st_sti_str() {
        // ST R0, x3005 from x3001
        assert_eq!(disassemble_simple(0x3003, 0x3001), "ST R0, x3004");
        // STI R1, x3010 from x3001
        assert_eq!(disassemble_simple(0xB20E, 0x3001), "STI R1, x300F");
        // STR R2, R3, #-1
        assert_eq!(disassemble_simple(0x74FF, 0x3001), "STR R2, R3, #-1");
    }

    #[test]
    fn test_trap() {
        assert_eq!(disassemble_simple(0xF020, 0x3001), "GETC");
        assert_eq!(disassemble_simple(0xF021, 0x3001), "OUT");
        assert_eq!(disassemble_simple(0xF022, 0x3001), "PUTS");
        assert_eq!(disassemble_simple(0xF023, 0x3001), "IN");
        assert_eq!(disassemble_simple(0xF024, 0x3001), "PUTSP");
        assert_eq!(disassemble_simple(0xF025, 0x3001), "HALT");
        assert_eq!(disassemble_simple(0xF030, 0x3001), "TRAP x30");
    }

    #[test]
    fn test_rti() {
        assert_eq!(disassemble_simple(0x8000, 0x3001), "RTI");
    }

    #[test]
    fn test_reserved_opcode() {
        // Opcode 1101 (reserved)
        assert_eq!(disassemble_simple(0xD000, 0x3001), ".FILL xD000");
    }

    #[test]
    fn test_with_symbols() {
        let mut symbols = SymbolTable::new();
        symbols.insert(0x3004, "LOOP".to_string());

        // BR to LOOP
        assert_eq!(disassemble(0x0E03, 0x3001, Some(&symbols)), "BR LOOP");
    }

    #[test]
    fn test_is_likely_instruction() {
        assert!(is_likely_instruction(0x1042)); // ADD
        assert!(is_likely_instruction(0xF025)); // HALT
        assert!(!is_likely_instruction(0x0000)); // NOP/uninitialized
        assert!(!is_likely_instruction(0xD000)); // Reserved opcode
    }
}
