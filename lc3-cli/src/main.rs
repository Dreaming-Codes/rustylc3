use clap::{Parser, Subcommand};
use lc3_assembler::Assembler;
use lc3_core::{LC3, VMEvent};
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
            input.replace(".asm", ".bin")
        } else {
            format!("{input}.bin")
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

    let binary: Vec<u8> = code
        .iter()
        .flat_map(|w| [(w >> 8) as u8, *w as u8])
        .collect();

    fs::write(&output, binary).unwrap_or_else(|e| {
        eprintln!("Error writing '{output}': {e}");
        process::exit(1);
    });

    println!("Assembled {} words to {output}", code.len());
}

fn run(path: &str) {
    let data = fs::read(path).unwrap_or_else(|e| {
        eprintln!("Error reading '{path}': {e}");
        process::exit(1);
    });

    if !data.len().is_multiple_of(2) {
        eprintln!("Error: invalid binary file (odd byte count)");
        process::exit(1);
    }

    let mut vm = LC3::default();
    for (i, chunk) in data.chunks(2).enumerate() {
        vm.memory[0x3000 + i] = (chunk[0] as u16) << 8 | chunk[1] as u16;
    }

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
        }
    }

    println!("\nRegisters:");
    for (i, &val) in vm.regs.iter().enumerate() {
        println!("  R{i}: x{val:04X} ({})", val as i16);
    }
}
