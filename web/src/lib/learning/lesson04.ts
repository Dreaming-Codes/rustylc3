import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-04',
  lessonNumber: 4,
  title: 'Immediate Values',
  description: 'Learn about immediate (constant) values in ADD and AND instructions, and their limitations.',
  objectives: [
    'Understand immediate mode vs register mode',
    'Know the range of immediate values (-16 to 15)',
    'Build larger numbers using multiple additions',
    'Use AND with immediate values for masking',
  ],
  newInstructions: ['ADD (immediate mode)', 'AND (immediate mode)'],
  category: 'arithmetic',
  code: `; ============================================================
; LESSON 4: Immediate Values
; ============================================================
; In Lesson 3, we added two registers: ADD R2, R0, R1
; But ADD can also add a constant (immediate) value directly!
;
; ADD DR, SR, imm5  - Add immediate: DR = SR + imm5
; AND DR, SR, imm5  - AND immediate: DR = SR & imm5
;
; IMPORTANT: The immediate value is only 5 bits!
; This means it can only be: -16 to +15 (decimal)
;
; In this lesson, you'll learn:
; - How to use immediate values in ADD and AND
; - The 5-bit limitation and how to work around it
; - How to build larger numbers with multiple operations
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; PART 1: Basic Immediate Addition
; ------------------------------------------------------------
; Let's add the constant 7 directly to a register.

        AND R0, R0, #0      ; Clear R0
        ADD R0, R0, #7      ; R0 = 0 + 7 = 7

; We can chain additions too:
        ADD R0, R0, #5      ; R0 = 7 + 5 = 12

; ------------------------------------------------------------
; PART 2: Negative Immediate Values
; ------------------------------------------------------------
; Immediate values are SIGNED, so we can use negatives!
; Range: -16 to +15

        AND R1, R1, #0      ; Clear R1
        ADD R1, R1, #10     ; R1 = 10
        ADD R1, R1, #-3     ; R1 = 10 + (-3) = 7

; Subtraction is just adding a negative number:
        ADD R1, R1, #-7     ; R1 = 7 - 7 = 0

; ------------------------------------------------------------
; PART 3: Building Larger Numbers
; ------------------------------------------------------------
; What if we need a number bigger than 15?
; Solution: Add multiple times!
;
; Let's put 50 into R2:
;   50 = 15 + 15 + 15 + 5

        AND R2, R2, #0      ; Clear R2
        ADD R2, R2, #15     ; R2 = 15
        ADD R2, R2, #15     ; R2 = 30
        ADD R2, R2, #15     ; R2 = 45
        ADD R2, R2, #5      ; R2 = 50

; OR: Load from memory (often cleaner for large numbers)
        LD R3, FIFTY        ; R3 = 50 (loaded from memory)

; ------------------------------------------------------------
; PART 4: AND with Immediate Values
; ------------------------------------------------------------
; AND is useful for "masking" - extracting specific bits.
;
; Let's extract just the lower 4 bits of a number.
; Binary: AND with 0000000000001111 (x000F or #15)

        LD R4, TEST_VALUE   ; R4 = x1234
        AND R4, R4, #15     ; Keep only lower 4 bits
                            ; x1234 AND x000F = x0004
                            ; R4 now = 4

; Remember: AND Rx, Rx, #0 clears the register (all bits become 0)

; ------------------------------------------------------------
; PART 5: Copying a Register
; ------------------------------------------------------------
; There's no MOV instruction in LC-3!
; To copy R0 to R5, add 0 to it:

        AND R0, R0, #0
        ADD R0, R0, #8      ; R0 = 8
        ADD R5, R0, #0      ; R5 = R0 + 0 = R0 (copy!)

; Now both R0 and R5 contain 8.

        HALT

; ------------------------------------------------------------
; DATA
; ------------------------------------------------------------
FIFTY       .FILL #50       ; Decimal 50
TEST_VALUE  .FILL x1234     ; Test value for masking

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. IMMEDIATE MODE: ADD DR, SR, #value
;    The # prefix indicates an immediate (constant) value.
;
; 2. 5-BIT LIMITATION: Range is -16 to +15 only!
;    For larger values: chain additions OR load from memory.
;
; 3. SUBTRACTION: Just add a negative immediate.
;    ADD R0, R0, #-5  ; Same as R0 = R0 - 5
;
; 4. COPY REGISTER: ADD Rdest, Rsrc, #0
;    Since there's no MOV instruction, we add 0 instead.
;
; 5. BIT MASKING: AND with an immediate to keep specific bits.
;    AND R0, R0, #15  ; Keeps only the lower 4 bits
;
; TRY IT OUT!
; - Calculate (15 - 8) + 6 using only immediate values
; - Build the number 100 in a register
; - Mask a number to keep only the lower 8 bits (AND with #255... 
;   wait, that won't work! Why? How would you solve this?)
; ============================================================
`,
};

export default lesson;
