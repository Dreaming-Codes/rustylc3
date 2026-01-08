#!/bin/bash

# LC-3 Simulator Benchmark Script
# Compares rustylc3 (lc3) vs lc3sim using hyperfine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHMARK_DIR="$SCRIPT_DIR/benchmarks"
BUILD_DIR="$SCRIPT_DIR/target/release"
RESULTS_DIR="$SCRIPT_DIR/benchmarks/results"

# Check for hyperfine
if ! command -v hyperfine &> /dev/null; then
    echo -e "${RED}Error: hyperfine is not installed${NC}"
    echo "Install it with: cargo install hyperfine"
    exit 1
fi

# Check for lc3sim
if ! command -v lc3sim &> /dev/null; then
    echo -e "${RED}Error: lc3sim is not installed or not in PATH${NC}"
    echo "Please install lc3sim and ensure it's available in your PATH"
    exit 1
fi

# Build rustylc3 in release mode
echo -e "${YELLOW}Building rustylc3 in release mode...${NC}"
cargo build --release

# Verify binary exists
if [ ! -f "$BUILD_DIR/lc3" ]; then
    echo -e "${RED}Error: Failed to build rustylc3${NC}"
    exit 1
fi

LC3_BIN="$BUILD_DIR/lc3"

echo -e "${GREEN}rustylc3 built successfully${NC}"
echo ""

# Create temp directory for assembled binaries
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Create results directory
mkdir -p "$RESULTS_DIR"

# Benchmark programs
BENCHMARKS=(
    "fibonacci"
    "bubble_sort"
    "multiply"
    "prime_sieve"
    "memory_stress"
    "nested_loops"
    "subroutine_calls"
)

echo -e "${YELLOW}Assembling benchmark programs...${NC}"

# Assemble with rustylc3
for bench in "${BENCHMARKS[@]}"; do
    ASM_FILE="$BENCHMARK_DIR/${bench}.asm"
    if [ -f "$ASM_FILE" ]; then
        "$LC3_BIN" assemble "$ASM_FILE" "$TEMP_DIR/${bench}.bin" 2>/dev/null || {
            echo -e "${RED}Failed to assemble $bench with rustylc3${NC}"
            continue
        }
        # Also create .obj for lc3sim using lc3as if available
        if command -v lc3as &> /dev/null; then
            cp "$ASM_FILE" "$TEMP_DIR/${bench}.asm"
            (cd "$TEMP_DIR" && lc3as "${bench}.asm" 2>/dev/null) || {
                echo -e "${YELLOW}Warning: Failed to assemble $bench with lc3as${NC}"
            }
        fi
    fi
done

echo -e "${GREEN}Assembly complete${NC}"
echo ""

# Run benchmarks
echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}  Running Benchmarks with Hyperfine  ${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""

# Combined results file
COMBINED_JSON="$RESULTS_DIR/all_benchmarks.json"
echo '{"benchmarks": [' > "$COMBINED_JSON"
FIRST=true

for bench in "${BENCHMARKS[@]}"; do
    BIN_FILE="$TEMP_DIR/${bench}.bin"
    OBJ_FILE="$TEMP_DIR/${bench}.obj"
    
    if [ ! -f "$BIN_FILE" ]; then
        echo -e "${RED}Skipping $bench: binary not found${NC}"
        continue
    fi

    echo -e "${GREEN}Benchmarking: $bench${NC}"
    echo "----------------------------------------"
    
    # Check if lc3sim .obj file exists
    if [ -f "$OBJ_FILE" ]; then
        hyperfine \
            --warmup 3 \
            --min-runs 20 \
            -N \
            --export-json "$RESULTS_DIR/${bench}.json" \
            --export-markdown "$RESULTS_DIR/${bench}.md" \
            --command-name "rustylc3" "$LC3_BIN run $BIN_FILE" \
            --command-name "lc3sim" "echo 'c' | lc3sim $OBJ_FILE"
    else
        echo -e "${YELLOW}Note: Only benchmarking rustylc3 (lc3sim .obj not available)${NC}"
        hyperfine \
            --warmup 3 \
            --min-runs 20 \
            -N \
            --export-json "$RESULTS_DIR/${bench}.json" \
            --export-markdown "$RESULTS_DIR/${bench}.md" \
            --command-name "rustylc3" "$LC3_BIN run $BIN_FILE"
    fi
    
    echo ""
done

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Benchmark Complete!                ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR"
