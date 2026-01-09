//! LC-3 Virtual Machine implementation.
//!
//! This crate provides a complete LC-3 (Little Computer 3) virtual machine,
//! a simplified educational computer architecture commonly used in computer
//! science courses.
//!
//! # Architecture
//!
//! - 16-bit word size with 65,536 addressable memory locations
//! - 8 general-purpose registers (R0-R7)
//! - Program Counter (PC) and condition flags (N, Z, P)
//! - Default program origin at 0x3000

/// Events emitted by the VM during execution.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VMEvent {
    /// Normal instruction execution, no I/O needed.
    None,
    /// TRAP x21 (OUT) - output a single character from R0
    Output(u8),
    /// TRAP x22 (PUTS) - output a null-terminated string starting at address in R0.
    OutputString(Vec<u8>),
    /// TRAP x25 (HALT) - stop execution.
    Halt,
    /// TRAP x20 (GETC) - read a character into R0. Caller must set R0 before next step.
    ReadChar,
    /// An error occurred during execution.
    Error(VMError),
}

/// Errors that can occur during VM execution.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VMError {
    /// Reserved/invalid opcode encountered.
    ReservedOpcode(u8),
    /// Unimplemented TRAP vector.
    UnimplementedTrap(u8),
}

/// LC-3 Virtual Machine state.
#[derive(Clone)]
pub struct LC3 {
    /// 64K words of memory (128KB total).
    pub memory: [u16; 65536],
    /// General-purpose registers R0-R7.
    pub regs: [u16; 8],
    /// Program Counter.
    pub pc: u16,
    /// Condition codes packed: bit 2 = N, bit 1 = Z, bit 0 = P
    cond: u8,
}

impl Default for LC3 {
    fn default() -> Self {
        Self {
            memory: [0; 65536],
            regs: [0; 8],
            pc: 0x3000,
            cond: 0b010, // Z flag set initially
        }
    }
}

impl LC3 {
    /// Returns true if negative flag is set.
    #[inline]
    pub fn n(&self) -> bool {
        self.cond & 0b100 != 0
    }

    /// Returns true if zero flag is set.
    #[inline]
    pub fn z(&self) -> bool {
        self.cond & 0b010 != 0
    }

    /// Returns true if positive flag is set.
    #[inline]
    pub fn p(&self) -> bool {
        self.cond & 0b001 != 0
    }
    /// Execute a single instruction and return any resulting event.
    ///
    /// The PC is incremented before the instruction executes (as per LC-3 spec),
    /// so PC-relative addressing is calculated from PC+1.
    pub fn step(&mut self) -> VMEvent {
        let instr = self.memory[self.pc as usize];
        self.pc = self.pc.wrapping_add(1);

        match instr >> 12 {
            0b0001 => self.add(instr),
            0b0101 => self.and(instr),
            0b1001 => self.not(instr),
            0b0000 => self.br(instr),
            0b1100 => self.jmp(instr),
            0b0100 => self.jsr(instr),
            0b0010 => self.ld(instr),
            0b1010 => self.ldi(instr),
            0b0110 => self.ldr(instr),
            0b1110 => self.lea(instr),
            0b0011 => self.st(instr),
            0b1011 => self.sti(instr),
            0b0111 => self.str(instr),
            0b1111 => return self.trap(instr),
            0b1000 => {} // RTI - no-op in user mode
            op => return VMEvent::Error(VMError::ReservedOpcode(op as u8)),
        }
        VMEvent::None
    }

    /// Execute instructions until a trap event (I/O or HALT) or error occurs.
    pub fn run(&mut self) -> VMEvent {
        loop {
            let instr = self.memory[self.pc as usize];
            self.pc = self.pc.wrapping_add(1);

            match instr >> 12 {
                0b0001 => self.add(instr),
                0b0101 => self.and(instr),
                0b1001 => self.not(instr),
                0b0000 => self.br(instr),
                0b1100 => self.jmp(instr),
                0b0100 => self.jsr(instr),
                0b0010 => self.ld(instr),
                0b1010 => self.ldi(instr),
                0b0110 => self.ldr(instr),
                0b1110 => self.lea(instr),
                0b0011 => self.st(instr),
                0b1011 => self.sti(instr),
                0b0111 => self.str(instr),
                0b1111 => return self.trap(instr),
                0b1000 => {} // RTI - no-op in user mode
                op => return VMEvent::Error(VMError::ReservedOpcode(op as u8)),
            }
        }
    }

    fn add(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        let sr1 = self.regs[((instr >> 6) & 0x7) as usize];
        let val = if instr & 0x20 != 0 {
            sign_extend(instr & 0x1F, 5)
        } else {
            self.regs[(instr & 0x7) as usize]
        };
        self.regs[dr] = sr1.wrapping_add(val);
        self.update_flags(dr);
    }

    fn and(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        let sr1 = self.regs[((instr >> 6) & 0x7) as usize];
        let val = if instr & 0x20 != 0 {
            sign_extend(instr & 0x1F, 5)
        } else {
            self.regs[(instr & 0x7) as usize]
        };
        self.regs[dr] = sr1 & val;
        self.update_flags(dr);
    }

    fn not(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        self.regs[dr] = !self.regs[((instr >> 6) & 0x7) as usize];
        self.update_flags(dr);
    }

    fn br(&mut self, instr: u16) {
        let cond = ((instr >> 9) & 0x7) as u8;
        if cond & self.cond != 0 {
            self.pc = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        }
    }

    fn jmp(&mut self, instr: u16) {
        self.pc = self.regs[((instr >> 6) & 0x7) as usize];
    }

    fn jsr(&mut self, instr: u16) {
        self.regs[7] = self.pc;
        self.pc = if instr & 0x800 != 0 {
            self.pc.wrapping_add(sign_extend(instr & 0x7FF, 11))
        } else {
            self.regs[((instr >> 6) & 0x7) as usize]
        };
    }

    fn ld(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        let addr = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        self.regs[dr] = self.memory[addr as usize];
        self.update_flags(dr);
    }

    fn ldi(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        let ptr = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        self.regs[dr] = self.memory[self.memory[ptr as usize] as usize];
        self.update_flags(dr);
    }

    fn ldr(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        let base = self.regs[((instr >> 6) & 0x7) as usize];
        self.regs[dr] = self.memory[base.wrapping_add(sign_extend(instr & 0x3F, 6)) as usize];
        self.update_flags(dr);
    }

    fn lea(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        self.regs[dr] = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        self.update_flags(dr);
    }

    fn st(&mut self, instr: u16) {
        let sr = self.regs[((instr >> 9) & 0x7) as usize];
        let addr = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        self.memory[addr as usize] = sr;
    }

    fn sti(&mut self, instr: u16) {
        let sr = self.regs[((instr >> 9) & 0x7) as usize];
        let ptr = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        self.memory[self.memory[ptr as usize] as usize] = sr;
    }

    fn str(&mut self, instr: u16) {
        let sr = self.regs[((instr >> 9) & 0x7) as usize];
        let base = self.regs[((instr >> 6) & 0x7) as usize];
        self.memory[base.wrapping_add(sign_extend(instr & 0x3F, 6)) as usize] = sr;
    }

    fn trap(&mut self, instr: u16) -> VMEvent {
        self.regs[7] = self.pc;
        match instr & 0xFF {
            0x20 => VMEvent::ReadChar,
            0x21 => VMEvent::Output(self.regs[0] as u8),
            0x22 => {
                let mut addr = self.regs[0] as usize;
                let mut chars = Vec::new();
                while self.memory[addr] != 0 {
                    chars.push(self.memory[addr] as u8);
                    addr += 1;
                }
                VMEvent::OutputString(chars)
            }
            0x25 => VMEvent::Halt,
            vec => VMEvent::Error(VMError::UnimplementedTrap(vec as u8)),
        }
    }

    #[inline]
    fn update_flags(&mut self, r: usize) {
        let val = self.regs[r];
        self.cond = if val == 0 {
            0b010 // Z
        } else if val & 0x8000 != 0 {
            0b100 // N
        } else {
            0b001 // P
        };
    }
}

/// Sign-extend a value from `bits` width to 16 bits.
#[inline]
const fn sign_extend(val: u16, bits: u8) -> u16 {
    if val >> (bits - 1) & 1 != 0 {
        val | (0xFFFF << bits)
    } else {
        val
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sign_extend() {
        assert_eq!(sign_extend(0b11111, 5), 0xFFFF);
        assert_eq!(sign_extend(0b01111, 5), 0x000F);
    }

    #[test]
    fn test_add_register() {
        let mut vm = LC3::default();
        vm.regs[1] = 5;
        vm.regs[2] = 3;
        vm.memory[0x3000] = 0x1042; // ADD R0, R1, R2
        vm.step();
        assert_eq!(vm.regs[0], 8);
        assert!(vm.p());
    }

    #[test]
    fn test_add_immediate() {
        let mut vm = LC3::default();
        vm.regs[1] = 10;
        vm.memory[0x3000] = 0x1065; // ADD R0, R1, #5
        vm.step();
        assert_eq!(vm.regs[0], 15);
    }

    #[test]
    fn test_halt() {
        let mut vm = LC3::default();
        vm.memory[0x3000] = 0xF025;
        assert_eq!(vm.step(), VMEvent::Halt);
    }

    #[test]
    fn test_branch() {
        let mut vm = LC3::default();
        vm.cond = 0b010; // Z flag set
        vm.memory[0x3000] = 0x0402; // BRZ +2
        vm.step();
        assert_eq!(vm.pc, 0x3003);
    }
}
