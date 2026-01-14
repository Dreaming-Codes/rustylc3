import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-03',
  lessonNumber: 3,
  title: 'Basic Arithmetic',
  description: 'Learn how to use registers for calculations and perform addition with the ADD instruction.',
  objectives: [
    'Understand the 8 general-purpose registers (R0-R7)',
    'Clear a register to zero using AND',
    'Add two registers together with ADD',
    'Store a result in a destination register',
  ],
  newInstructions: ['ADD (register mode)', 'AND (register mode)'],
  category: 'arithmetic',
  code: `; ============================================================
; LESSON 3: Basic Arithmetic
; ============================================================
; Now let's learn about registers and arithmetic!
;
; LC-3 has 8 general-purpose registers: R0, R1, R2, R3, R4, R5, R6, R7
; Think of them as 8 variables that can each hold a 16-bit number.
; All arithmetic happens IN registers - you can't do math directly on memory.
;
; In this lesson, you'll learn:
; - How to clear a register to zero
; - How to add two registers together
; - The basic pattern: load -> compute -> store
;
; NEW INSTRUCTIONS:
;   ADD DR, SR1, SR2 - Add registers: DR = SR1 + SR2
;   AND DR, SR1, SR2 - Bitwise AND: DR = SR1 & SR2
;
; THE CLEAR IDIOM:
;   AND Rx, Rx, #0   - This sets Rx to 0 (anything AND 0 = 0)
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; STEP 1: Clear registers to prepare for calculation
; ------------------------------------------------------------
; When your program starts, registers contain GARBAGE values
; from previous programs. Always initialize them first!
;
; The AND instruction does bitwise AND. When we AND with 0,
; every bit becomes 0 because: any_bit AND 0 = 0
;
;   Before: R0 = ???????????????? (unknown garbage)
;   After:  R0 = 0000000000000000 (all zeros)

        AND R0, R0, #0      ; R0 = 0 (clear R0)
        AND R1, R1, #0      ; R1 = 0 (clear R1)  
        AND R2, R2, #0      ; R2 = 0 (clear R2 - will hold our result)

; ------------------------------------------------------------
; STEP 2: Put values into registers
; ------------------------------------------------------------
; We want to calculate 5 + 3.
; First, let's put 5 into R0 and 3 into R1.
;
; ADD can add a register to a small immediate value (#-16 to #15).
; Since R0 is 0, adding 5 to it gives us 5.

        ADD R0, R0, #5      ; R0 = 0 + 5 = 5
        ADD R1, R1, #3      ; R1 = 0 + 3 = 3

; ------------------------------------------------------------
; STEP 3: Perform the addition
; ------------------------------------------------------------
; ADD DR, SR1, SR2 means: DR = SR1 + SR2
; The result goes into the Destination Register (DR).
; The source registers (SR1, SR2) are NOT modified.

        ADD R2, R0, R1      ; R2 = R0 + R1 = 5 + 3 = 8

; ------------------------------------------------------------
; RESULT: R2 now contains 8!
; ------------------------------------------------------------
; Check the Registers panel after running:
;   R0 = x0005 (5 in hex)
;   R1 = x0003 (3 in hex)
;   R2 = x0008 (8 in hex)

        HALT

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
; 
; 1. REGISTERS are like variables - they hold 16-bit values
;    R0-R7 are general purpose (though R7 is special for subroutines)
;
; 2. CLEAR BEFORE USE - Always initialize registers!
;    Pattern: AND Rx, Rx, #0
;
; 3. ADD syntax: ADD destination, source1, source2
;    The result goes into the destination register.
;    Source registers are unchanged.
;
; TRY IT OUT!
; - Change the numbers being added
; - Try adding three numbers: put result of first add in R2,
;   then ADD R3, R2, R1 (or another value)
; - Watch the Registers panel update as you step through!
; ============================================================
`,
};

export default lesson;
