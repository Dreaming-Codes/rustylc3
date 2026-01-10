use clap::{Parser, Subcommand};
use lc3_assembler::Assembler;
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
        /// Output binary file (defaults to input with .bin extension)
        output: Option<String>,
    },
    /// Run an LC-3 binary program
    Run {
        /// Binary file to execute
        program: String,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Command::Assemble { input, output } => assemble(&input, output),
        Command::Run { program } => run(&program),
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
    let code = match asm.assemble_with_errors(&source) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{}", asm.format_error(input, &source, &e));
            process::exit(1);
        }
    };

    let origin = asm.origin();
    let mut binary: Vec<u8> = Vec::with_capacity(2 + code.len() * 2);
    // Add origin header
    binary.push((origin >> 8) as u8);
    binary.push(origin as u8);
    // Add code words
    for w in &code {
        binary.push((w >> 8) as u8);
        binary.push(*w as u8);
    }

    fs::write(&output, binary).unwrap_or_else(|e| {
        eprintln!("Error writing '{output}': {e}");
        process::exit(1);
    });

    println!(
        "Assembled {} words to {output} (origin: x{:04X})",
        code.len(),
        origin
    );
}

fn run(path: &str) {
    let data = fs::read(path).unwrap_or_else(|e| {
        eprintln!("Error reading '{path}': {e}");
        process::exit(1);
    });

    if data.len() < 2 || !data.len().is_multiple_of(2) {
        eprintln!(
            "Error: invalid binary file (must have even byte count with at least 2 bytes for origin)"
        );
        process::exit(1);
    }

    // First word is the origin address
    let origin = (data[0] as u16) << 8 | data[1] as u16;

    let mut vm = LC3::default();

    // Load code starting after the origin header
    for (i, chunk) in data[2..].chunks(2).enumerate() {
        vm.memory[origin as usize + i] = (chunk[0] as u16) << 8 | chunk[1] as u16;
    }

    // Set PC to the origin
    vm.pc = origin;

    println!("Starting at x{:04X}...\n", vm.pc);

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
