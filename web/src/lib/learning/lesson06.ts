import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-06',
  lessonNumber: 6,
  title: 'Memory Load & Store',
  description: 'Learn how to read from and write to memory using LD and ST instructions.',
  objectives: [
    'Understand the difference between registers and memory',
    'Load values from memory with LD',
    'Store values to memory with ST',
    'Use labels to reference memory locations',
  ],
  newInstructions: ['LD', 'ST'],
  category: 'memory',
  code: `; ============================================================
; LESSON 6: Memory Load & Store
; ============================================================
; Registers are fast but limited (only 8 of them).
; Memory is slower but HUGE (65,536 locations in LC-3).
;
; We need instructions to move data between registers and memory:
;   LD DR, LABEL  - Load: DR = mem[LABEL]
;   ST SR, LABEL  - Store: mem[LABEL] = SR
;
; In this lesson, you'll learn:
; - How to load data from memory into registers
; - How to store register values into memory
; - How labels work as memory addresses
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; PART 1: Loading from Memory
; ------------------------------------------------------------
; LD loads a value FROM memory INTO a register.
; The label refers to a memory location we've defined with .FILL

        LD R0, VALUE_A      ; R0 = contents of VALUE_A = 100
        LD R1, VALUE_B      ; R1 = contents of VALUE_B = 25

; Now R0 = 100 and R1 = 25
; We loaded these from the DATA SECTION at the bottom.

; ------------------------------------------------------------
; PART 2: Doing Some Calculation
; ------------------------------------------------------------
; Let's add these two values and store the result.

        ADD R2, R0, R1      ; R2 = 100 + 25 = 125

; R2 now holds 125, but it's only in a register.
; What if we want to save it for later?

; ------------------------------------------------------------
; PART 3: Storing to Memory
; ------------------------------------------------------------
; ST stores a value FROM a register INTO memory.
; This "saves" the value - it persists even if we use R2 for
; something else later.

        ST R2, RESULT       ; mem[RESULT] = R2 = 125

; Now the value 125 is saved in memory at location RESULT.

; ------------------------------------------------------------
; PART 4: Verifying Our Work
; ------------------------------------------------------------
; Let's verify by loading the result back into a different register.

        LD R3, RESULT       ; R3 = contents of RESULT = 125

; R3 should now also be 125, proving our store worked!

; ------------------------------------------------------------
; PART 5: Understanding Memory Layout
; ------------------------------------------------------------
; After this program runs, memory looks like:
;
; Address  | Label     | Value
; ---------|-----------|-------
; x3000    |           | (our code starts here)
; ...      |           | (more code)
; x300?    | VALUE_A   | 100
; x300?    | VALUE_B   | 25
; x300?    | RESULT    | 125 (after ST executes)
;
; Check the Memory panel to see these values!

        HALT

; ------------------------------------------------------------
; DATA SECTION
; ------------------------------------------------------------
; These labels mark memory locations.
; The assembler automatically assigns addresses to them.
; .FILL initializes each location with a value.

VALUE_A     .FILL #100      ; First number: 100
VALUE_B     .FILL #25       ; Second number: 25
RESULT      .FILL #0        ; Will store our result (starts as 0)

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. LD DR, LABEL - Load from memory
;    Reads the VALUE at memory location LABEL into DR.
;    DR = mem[LABEL]
;
; 2. ST SR, LABEL - Store to memory  
;    Writes the value in SR to memory location LABEL.
;    mem[LABEL] = SR
;
; 3. LABELS are symbolic names for memory addresses.
;    The assembler converts them to actual addresses.
;
; 4. MEMORY vs REGISTERS:
;    - Registers: Fast, only 8, temporary
;    - Memory: Slower, 65536 locations, persistent
;
; 5. PC-RELATIVE ADDRESSING:
;    LD and ST use "PC-relative" addressing. The label must be
;    within -256 to +255 words of the instruction.
;    (We'll learn other addressing modes later!)
;
; PRACTICE:
; - Store different values and verify with the Memory panel
; - Try swapping two values in memory (hint: you need a temp register!)
; - What happens if you LD from a location that has code, not data?
; ============================================================
`,
};

export default lesson;
