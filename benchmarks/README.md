# Benchmarks

This directory contains LC-3 assembly programs used for benchmarking rustylc3 against lc3sim.

**Note:** These benchmark examples were written by AI.

## Programs

| File | Description |
|------|-------------|
| `fibonacci.asm` | Iterative Fibonacci sequence (1000 iterations) |
| `bubble_sort.asm` | Bubble sort on a 20-element array |
| `multiply.asm` | Repeated multiplication using subroutines |
| `prime_sieve.asm` | Prime number checking using trial division |
| `memory_stress.asm` | Memory read/write stress test |
| `nested_loops.asm` | Three-level nested loop stress test |
| `subroutine_calls.asm` | Deep subroutine call chain test |

## Prerequisites

- [hyperfine](https://github.com/sharkdp/hyperfine) - Command-line benchmarking tool
- lc3sim - Reference LC-3 simulator (optional, for comparison)

Install hyperfine:
```bash
cargo install hyperfine
# or
sudo apt install hyperfine  # Debian/Ubuntu
brew install hyperfine      # macOS
```

## Running Benchmarks

Use the `benchmark.sh` script in the project root:

```bash
./benchmark.sh
```

This will:
1. Build rustylc3 in release mode
2. Assemble all benchmark programs
3. Run hyperfine comparisons between rustylc3 and lc3sim
