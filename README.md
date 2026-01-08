# rustylc3

A fast LC-3 virtual machine, assembler, and CLI written in Rust.

## Features

- LC-3 assembler with two-pass assembly
- LC-3 virtual machine for program execution
- Command-line interface for assembling and running programs

## Benchmarks

Performance comparison between rustylc3 and lc3sim across various workloads:

```
                        Execution Time (lower is better)
                        
fibonacci         ████████████████████████████████████  2.1 ms  lc3sim
                  ██████████                            0.6 ms  rustylc3  (3.5x faster)

bubble_sort       █████████████████████████             1.4 ms  lc3sim
                  ██████████████                        0.8 ms  rustylc3  (1.8x faster)

multiply          █████████████████████████             1.4 ms  lc3sim
                  ██████████████                        0.8 ms  rustylc3  (1.75x faster)

prime_sieve       █████████████████████████             1.4 ms  lc3sim
                  ████████████████                      0.9 ms  rustylc3  (1.6x faster)

memory_stress     █████████████████████████             1.4 ms  lc3sim
                  ███████████████████                   1.1 ms  rustylc3  (1.3x faster)

subroutine_calls  █████████████████████████             1.4 ms  lc3sim
                  ██████████████████                    1.0 ms  rustylc3  (1.4x faster)

nested_loops      ████████████████████████████████████  2.4 ms  rustylc3
                  █████████████████████                 1.4 ms  lc3sim    (1.7x faster)
```

| Benchmark | rustylc3 | lc3sim | Winner |
|-----------|----------|--------|--------|
| fibonacci | 0.6 ms | 2.1 ms | rustylc3 (3.5x) |
| bubble_sort | 0.8 ms | 1.4 ms | rustylc3 (1.8x) |
| multiply | 0.8 ms | 1.4 ms | rustylc3 (1.75x) |
| prime_sieve | 0.9 ms | 1.4 ms | rustylc3 (1.6x) |
| memory_stress | 1.1 ms | 1.4 ms | rustylc3 (1.3x) |
| subroutine_calls | 1.0 ms | 1.4 ms | rustylc3 (1.4x) |
| nested_loops | 2.4 ms | 1.4 ms | lc3sim (1.7x) |

rustylc3 wins **6 out of 7** benchmarks.

> Run your own benchmarks with `./benchmark.sh` - see [benchmarks/README.md](benchmarks/README.md) for details.

## Project Structure

```
rustylc3/
├── lc3-core/       # LC-3 Virtual Machine implementation
├── lc3-parser/     # LC-3 assembly language parser
├── lc3-assembler/  # Two-pass LC-3 assembler
├── lc3-cli/        # Command-line interface
└── benchmarks/     # Benchmark programs
```

## License

See [LICENSE](LICENSE) for details.
