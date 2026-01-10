use clap::{Parser, Subcommand};
use lc3_assembler::{Assembler, lc3tools_format};
use lc3_core::{LC3, VMError, VMEvent};
use std::io::{self, Write};
use std::{fs, process};

#[derive(Parser)]
#[command(name = "lc3", about = "LC-3 Assembler and Virtual Machine")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Assemble LC-3 source to binary
    Assemble {
        /// Input assembly file
        input: String,
        /// Output binary file (defaults to input with .obj extension)
        output: Option<String>,
    },
    /// Run an LC-3 binary program
    Run {
        /// Binary file to execute
        program: String,
        /// Path to OS image (optional)
        #[arg(long)]
        os: Option<String>,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Command::Assemble { input, output } => assemble(&input, output),
        Command::Run { program, os } => run(&program, os),
    }
}

fn assemble(input: &str, output: Option<String>) {
    let output = output.unwrap_or_else(|| {
        if input.ends_with(".asm") {
            input.replace(".asm", ".obj")
        } else {
            format!("{input}.obj")
        }
    });

    let source = fs::read_to_string(input).unwrap_or_else(|e| {
        eprintln!("Error reading '{input}': {e}");
        process::exit(1);
    });

    let mut asm = Assembler::new();
    let binary = match asm.assemble_to_lc3tools(&source) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("{}", asm.format_error(input, &source, &e));
            process::exit(1);
        }
    };

    let segments = asm.segments();
    if segments.is_empty() {
        eprintln!("Error: no code generated");
        process::exit(1);
    }

    fs::write(&output, &binary).unwrap_or_else(|e| {
        eprintln!("Error writing '{output}': {e}");
        process::exit(1);
    });

    let total_words: usize = segments.iter().map(|s| s.code.len()).sum();

    if segments.len() == 1 {
        println!(
            "Assembled {} words to {output} (origin: x{:04X}, lc3tools format)",
            total_words, segments[0].origin
        );
    } else {
        println!(
            "Assembled {} words in {} segments to {output} (lc3tools format):",
            total_words,
            segments.len()
        );
        for (i, seg) in segments.iter().enumerate() {
            println!(
                "  Segment {}: {} words at x{:04X}",
                i + 1,
                seg.code.len(),
                seg.origin
            );
        }
    }
}

/// Load an .obj file into the VM.
/// Supports both lc3tools format (with magic header) and legacy format.
/// Returns the first origin (start PC).
fn load_obj_file(vm: &mut LC3, data: &[u8]) -> Result<u16, String> {
    if lc3tools_format::is_lc3tools_format(data) {
        // lc3tools format: explicit is_orig flags
        let entries = lc3tools_format::decode(data)?;
        let segments = lc3tools_format::entries_to_segments(&entries);

        if segments.is_empty() {
            return Err("No segments found in .obj file".into());
        }

        let first_origin = segments[0].origin;

        for seg in &segments {
            for (i, &word) in seg.code.iter().enumerate() {
                vm.memory[seg.origin as usize + i] = word;
            }
        }

        Ok(first_origin)
    } else {
        // Legacy format: [origin:u16][code...] (single segment only for safety)
        if data.len() < 4 || data.len() % 2 != 0 {
            return Err("Invalid .obj file: must have even byte count".into());
        }

        let origin = u16::from_be_bytes([data[0], data[1]]);
        let mut addr = origin as usize;

        for chunk in data[2..].chunks(2) {
            let word = u16::from_be_bytes([chunk[0], chunk[1]]);
            vm.memory[addr] = word;
            addr += 1;
        }

        Ok(origin)
    }
}

fn run(path: &str, os_path: Option<String>) {
    let data = fs::read(path).unwrap_or_else(|e| {
        eprintln!("Error reading '{path}': {e}");
        process::exit(1);
    });

    let mut vm = LC3::default();

    // If OS is provided, load it and enable OS mode
    if let Some(os_p) = os_path {
        let os_data = fs::read(&os_p).unwrap_or_else(|e| {
            eprintln!("Error reading OS image '{os_p}': {e}");
            process::exit(1);
        });
        load_obj_file(&mut vm, &os_data).unwrap_or_else(|e| {
            eprintln!("Error loading OS: {e}");
            process::exit(1);
        });
        vm.set_os_mode(true);
        // Initialize MCR
        vm.memory[0xFFFE] = 0x8000;
        println!("Loaded OS from {os_p}");
    }

    let start_pc = match load_obj_file(&mut vm, &data) {
        Ok(pc) => pc,
        Err(e) => {
            eprintln!("Error: {e}");
            process::exit(1);
        }
    };

    vm.pc = start_pc;

    println!(
        "Starting at x{:04X} (OS mode: {})...\n",
        vm.pc,
        vm.os_mode()
    );

    let stdin = io::stdin();
    let mut stdout = io::stdout();

    loop {
        match vm.run() {
            VMEvent::None => unreachable!(),
            VMEvent::Output(c) => {
                print!("{}", c as char);
                let _ = stdout.flush();
            }
            VMEvent::OutputString(chars) => {
                print!("{}", chars.iter().map(|&c| c as char).collect::<String>());
                let _ = stdout.flush();
            }
            VMEvent::Halt => {
                println!("\nProgram halted.");
                break;
            }
            VMEvent::ReadChar => {
                let _ = stdout.flush();
                let mut buf = String::new();
                if stdin.read_line(&mut buf).is_ok() {
                    vm.regs[0] = buf.chars().next().unwrap_or('\0') as u16;
                }
            }
            VMEvent::Error(e) => {
                let msg = match e {
                    VMError::ReservedOpcode(op) => format!("Reserved opcode: {op:#06b}"),
                    VMError::UnimplementedTrap(vec) => {
                        format!("Unimplemented TRAP vector: {vec:#04x}")
                    }
                    VMError::PrivilegeViolation => {
                        "Privilege violation: RTI in user mode".to_string()
                    }
                };
                eprintln!("\nError at PC x{:04X}: {}", vm.pc.wrapping_sub(1), msg);
                process::exit(1);
            }
        }
    }

    println!("\nRegisters:");
    for (i, &val) in vm.regs.iter().enumerate() {
        println!("  R{i}: x{val:04X} ({})", val as i16);
    }
}
