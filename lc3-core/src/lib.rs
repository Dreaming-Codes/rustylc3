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
//! - Processor Status Register (PSR) with privilege mode and condition codes
//! - Memory-mapped I/O for keyboard, display, and machine control
//! - Default program origin at 0x3000
//!
//! # Memory-Mapped I/O Addresses
//!
//! - `0xFE00` - KBSR (Keyboard Status Register)
//! - `0xFE02` - KBDR (Keyboard Data Register)
//! - `0xFE04` - DSR (Display Status Register)
//! - `0xFE06` - DDR (Display Data Register)
//! - `0xFFFE` - MCR (Machine Control Register)

/// Memory-mapped I/O addresses
pub mod mmio {
    /// Keyboard Status Register - bit 15 set when key available
    pub const KBSR: u16 = 0xFE00;
    /// Keyboard Data Register - contains the key pressed
    pub const KBDR: u16 = 0xFE02;
    /// Display Status Register - bit 15 set when ready to display
    pub const DSR: u16 = 0xFE04;
    /// Display Data Register - write character here to display
    pub const DDR: u16 = 0xFE06;
    /// Machine Control Register - bit 15 is clock enable (0 = halt)
    pub const MCR: u16 = 0xFFFE;
}

/// Events emitted by the VM during execution.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VMEvent {
    /// Normal instruction execution, no I/O needed.
    None,
    /// Output a single character (from DDR write in OS mode, or TRAP x21 in shortcut mode)
    Output(u8),
    /// TRAP x22 (PUTS) - output a null-terminated string starting at address in R0 (shortcut mode only).
    OutputString(Vec<u8>),
    /// VM halted (MCR bit 15 cleared in OS mode, or TRAP x25 in shortcut mode).
    Halt,
    /// VM requests character input. Call `set_keyboard_input` before continuing.
    ReadChar,
    /// An error occurred during execution.
    Error(VMError),
}

/// Errors that can occur during VM execution.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VMError {
    /// Reserved/invalid opcode encountered.
    ReservedOpcode(u8),
    /// Unimplemented TRAP vector (only in shortcut mode).
    UnimplementedTrap(u8),
    /// Privilege mode violation (RTI in user mode).
    PrivilegeViolation,
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
    /// Processor Status Register.
    /// Bits 15: privilege mode (0 = supervisor, 1 = user)
    /// Bits 10-8: priority level (0-7)
    /// Bits 2-0: condition codes (N=4, Z=2, P=1)
    psr: u16,
    /// Saved Supervisor Stack Pointer (when in user mode).
    saved_ssp: u16,
    /// Saved User Stack Pointer (when in supervisor mode).
    saved_usp: u16,
    /// Whether OS mode is enabled (true = full trap execution, false = shortcut behavior).
    os_mode: bool,
    /// Keyboard input buffer (set when key is available).
    keyboard_data: Option<u8>,
    /// Pending output character (for DDR writes).
    pending_output: Option<u8>,
}

impl Default for LC3 {
    fn default() -> Self {
        Self {
            memory: [0; 65536],
            regs: [0; 8],
            pc: 0x3000,
            // Default: user mode (bit 15=1), priority 0, Z flag set
            psr: 0x8002,
            saved_ssp: 0x3000,
            saved_usp: 0x0000,
            os_mode: false,
            keyboard_data: None,
            pending_output: None,
        }
    }
}

impl LC3 {
    /// Reset the VM to its initial state, clearing memory in place.
    /// This is more efficient than creating a new VM as it reuses the existing memory allocation.
    pub fn clear(&mut self) {
        self.memory.fill(0);
        self.regs.fill(0);
        self.pc = 0x3000;
        self.psr = 0x8002; // User mode, Z flag
        self.saved_ssp = 0x3000;
        self.saved_usp = 0x0000;
        self.keyboard_data = None;
        self.pending_output = None;
        // Note: os_mode is preserved across reset
    }

    /// Enable or disable OS mode.
    /// When enabled, TRAPs jump to actual trap vectors and RTI works properly.
    /// When disabled, TRAPs are handled with shortcut behavior.
    pub fn set_os_mode(&mut self, enabled: bool) {
        self.os_mode = enabled;
    }

    /// Check if OS mode is enabled.
    pub fn os_mode(&self) -> bool {
        self.os_mode
    }

    /// Set keyboard input (for GETC/IN). The next KBSR read will show ready.
    pub fn set_keyboard_input(&mut self, c: u8) {
        self.keyboard_data = Some(c);
    }

    /// Check if keyboard input is available.
    pub fn has_keyboard_input(&self) -> bool {
        self.keyboard_data.is_some()
    }

    /// Get the PSR value.
    pub fn psr(&self) -> u16 {
        self.psr
    }

    /// Set the PSR value.
    pub fn set_psr(&mut self, psr: u16) {
        self.psr = psr;
    }

    /// Check if in supervisor mode.
    pub fn is_supervisor(&self) -> bool {
        self.psr & 0x8000 == 0
    }
}

impl LC3 {
    /// Returns true if negative flag is set.
    #[inline]
    pub fn n(&self) -> bool {
        self.psr & 0b100 != 0
    }

    /// Returns true if zero flag is set.
    #[inline]
    pub fn z(&self) -> bool {
        self.psr & 0b010 != 0
    }

    /// Returns true if positive flag is set.
    #[inline]
    pub fn p(&self) -> bool {
        self.psr & 0b001 != 0
    }

    /// Get condition codes as bits (for internal use).
    #[inline]
    fn cond(&self) -> u8 {
        (self.psr & 0x7) as u8
    }

    /// Read from memory, handling memory-mapped I/O.
    fn mem_read(&mut self, addr: u16) -> u16 {
        match addr {
            mmio::KBSR => {
                if self.keyboard_data.is_some() {
                    0x8000 // Ready bit set
                } else {
                    0x0000
                }
            }
            mmio::KBDR => {
                let data = self.keyboard_data.take().unwrap_or(0) as u16;
                data
            }
            mmio::DSR => {
                // Display is always ready
                0x8000
            }
            mmio::DDR => {
                // Reading DDR returns 0
                0
            }
            mmio::MCR => {
                // Return MCR with clock running (bit 15 = 1)
                self.memory[addr as usize] | 0x8000
            }
            _ => self.memory[addr as usize],
        }
    }

    /// Write to memory, handling memory-mapped I/O.
    /// Returns true if an output event occurred.
    fn mem_write(&mut self, addr: u16, val: u16) -> bool {
        match addr {
            mmio::KBSR | mmio::KBDR => {
                // Keyboard registers are read-only
            }
            mmio::DSR => {
                // DSR is read-only
            }
            mmio::DDR => {
                // Writing to DDR outputs a character
                self.pending_output = Some(val as u8);
                return true;
            }
            mmio::MCR => {
                // Writing to MCR - store it
                self.memory[addr as usize] = val;
            }
            _ => {
                self.memory[addr as usize] = val;
            }
        }
        false
    }

    /// Execute a single instruction and return any resulting event.
    ///
    /// The PC is incremented before the instruction executes (as per LC-3 spec),
    /// so PC-relative addressing is calculated from PC+1.
    pub fn step(&mut self) -> VMEvent {
        // Check if MCR clock bit is cleared (halt condition in OS mode)
        if self.os_mode && self.memory[mmio::MCR as usize] & 0x8000 == 0 {
            return VMEvent::Halt;
        }

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
            0b0111 => self.str_instr(instr),
            0b1111 => return self.trap(instr),
            0b1000 => return self.rti(),
            op => return VMEvent::Error(VMError::ReservedOpcode(op as u8)),
        }

        // Check for pending output
        if let Some(c) = self.pending_output.take() {
            return VMEvent::Output(c);
        }

        VMEvent::None
    }

    /// Execute instructions until a trap event (I/O or HALT) or error occurs.
    pub fn run(&mut self) -> VMEvent {
        loop {
            let event = self.step();
            match event {
                VMEvent::None => continue,
                _ => return event,
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
        if cond & self.cond() != 0 {
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
        self.regs[dr] = self.mem_read(addr);
        self.update_flags(dr);
    }

    fn ldi(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        let ptr = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        let addr = self.mem_read(ptr);
        self.regs[dr] = self.mem_read(addr);
        self.update_flags(dr);
    }

    fn ldr(&mut self, instr: u16) {
        let dr = ((instr >> 9) & 0x7) as usize;
        let base = self.regs[((instr >> 6) & 0x7) as usize];
        let addr = base.wrapping_add(sign_extend(instr & 0x3F, 6));
        self.regs[dr] = self.mem_read(addr);
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
        self.mem_write(addr, sr);
    }

    fn sti(&mut self, instr: u16) {
        let sr = self.regs[((instr >> 9) & 0x7) as usize];
        let ptr = self.pc.wrapping_add(sign_extend(instr & 0x1FF, 9));
        let addr = self.mem_read(ptr);
        self.mem_write(addr, sr);
    }

    fn str_instr(&mut self, instr: u16) {
        let sr = self.regs[((instr >> 9) & 0x7) as usize];
        let base = self.regs[((instr >> 6) & 0x7) as usize];
        let addr = base.wrapping_add(sign_extend(instr & 0x3F, 6));
        self.mem_write(addr, sr);
    }

    fn trap(&mut self, instr: u16) -> VMEvent {
        let trap_vec = instr & 0xFF;

        if self.os_mode {
            // Full OS mode: jump to trap vector, switch to supervisor mode
            self.regs[7] = self.pc;

            // If in user mode, switch to supervisor mode
            if !self.is_supervisor() {
                // Save USP, load SSP
                self.saved_usp = self.regs[6];
                self.regs[6] = self.saved_ssp;
            }

            // Save PSR and PC on supervisor stack
            self.regs[6] = self.regs[6].wrapping_sub(1);
            self.memory[self.regs[6] as usize] = self.psr;
            self.regs[6] = self.regs[6].wrapping_sub(1);
            self.memory[self.regs[6] as usize] = self.pc;

            // Enter supervisor mode (clear bit 15)
            self.psr &= 0x7FFF;

            // Jump to trap vector
            self.pc = self.memory[trap_vec as usize];

            // Check if we need keyboard input (for GETC trap)
            if trap_vec == 0x20 && self.keyboard_data.is_none() {
                return VMEvent::ReadChar;
            }

            VMEvent::None
        } else {
            // Shortcut mode: handle traps directly
            self.regs[7] = self.pc;
            match trap_vec {
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
    }

    fn rti(&mut self) -> VMEvent {
        if self.os_mode {
            // Full OS mode: restore from supervisor stack
            if !self.is_supervisor() {
                // RTI in user mode is a privilege violation
                return VMEvent::Error(VMError::PrivilegeViolation);
            }

            // Pop PC from stack
            self.pc = self.memory[self.regs[6] as usize];
            self.regs[6] = self.regs[6].wrapping_add(1);

            // Pop PSR from stack
            self.psr = self.memory[self.regs[6] as usize];
            self.regs[6] = self.regs[6].wrapping_add(1);

            // If returning to user mode, restore USP
            if !self.is_supervisor() {
                self.saved_ssp = self.regs[6];
                self.regs[6] = self.saved_usp;
            }

            VMEvent::None
        } else {
            // Shortcut mode: RTI is a no-op
            VMEvent::None
        }
    }

    #[inline]
    fn update_flags(&mut self, r: usize) {
        let val = self.regs[r];
        // Clear condition code bits and set new ones
        self.psr = (self.psr & 0xFFF8)
            | if val == 0 {
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
    fn test_halt_shortcut_mode() {
        let mut vm = LC3::default();
        vm.memory[0x3000] = 0xF025;
        assert_eq!(vm.step(), VMEvent::Halt);
    }

    #[test]
    fn test_branch() {
        let mut vm = LC3::default();
        vm.psr = (vm.psr & 0xFFF8) | 0b010; // Z flag set
        vm.memory[0x3000] = 0x0402; // BRZ +2
        vm.step();
        assert_eq!(vm.pc, 0x3003);
    }

    #[test]
    fn test_mmio_dsr_always_ready() {
        let mut vm = LC3::default();
        assert_eq!(vm.mem_read(mmio::DSR), 0x8000);
    }

    #[test]
    fn test_mmio_keyboard() {
        let mut vm = LC3::default();
        // Initially no key
        assert_eq!(vm.mem_read(mmio::KBSR), 0x0000);

        // Set input
        vm.set_keyboard_input(b'A');
        assert_eq!(vm.mem_read(mmio::KBSR), 0x8000);

        // Read key
        assert_eq!(vm.mem_read(mmio::KBDR), b'A' as u16);

        // Key consumed
        assert_eq!(vm.mem_read(mmio::KBSR), 0x0000);
    }

    #[test]
    fn test_psr_condition_codes() {
        let mut vm = LC3::default();
        vm.regs[1] = 0;
        vm.memory[0x3000] = 0x1260; // ADD R1, R1, #0 (result is 0)
        vm.step();
        assert!(vm.z());
        assert!(!vm.n());
        assert!(!vm.p());
    }

    #[test]
    fn test_os_mode_toggle() {
        let mut vm = LC3::default();
        assert!(!vm.os_mode());
        vm.set_os_mode(true);
        assert!(vm.os_mode());
        vm.set_os_mode(false);
        assert!(!vm.os_mode());
    }
}
