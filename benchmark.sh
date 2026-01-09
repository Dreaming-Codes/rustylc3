#!/bin/bash

# LC-3 Simulator Benchmark Script
# Compares rustylc3 (lc3) vs lc3sim using hyperfine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${YELLOW}Warning: lc3sim is not installed - will only benchmark rustylc3${NC}"
    HAS_LC3SIM=false
else
    HAS_LC3SIM=true
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
        if [ "$HAS_LC3SIM" = true ] && command -v lc3as &> /dev/null; then
            cp "$ASM_FILE" "$TEMP_DIR/${bench}.asm"
            (cd "$TEMP_DIR" && lc3as "${bench}.asm" 2>/dev/null) || {
                echo -e "${YELLOW}Warning: Failed to assemble $bench with lc3as${NC}"
            }
        fi
        echo -e "  ${GREEN}✓${NC} $bench"
    fi
done

echo -e "${GREEN}Assembly complete${NC}"
echo ""

# Run benchmarks
echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}  Running Benchmarks with Hyperfine  ${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""

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
    if [ "$HAS_LC3SIM" = true ] && [ -f "$OBJ_FILE" ]; then
        hyperfine \
            --warmup 10 \
            --min-runs 50 \
            --prepare 'sync' \
            -N \
            --export-json "$RESULTS_DIR/${bench}.json" \
            --export-markdown "$RESULTS_DIR/${bench}.md" \
            --command-name "rustylc3" "$LC3_BIN run $BIN_FILE" \
            --command-name "lc3sim" "bash -c \"printf 'file $OBJ_FILE\nc\nquit\n' | lc3sim\""
    else
        hyperfine \
            --warmup 10 \
            --min-runs 50 \
            --prepare 'sync' \
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
