import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-13',
  lessonNumber: 13,
  title: 'Passing Parameters',
  description: 'Learn conventions for passing data to and from subroutines using registers.',
  objectives: [
    'Pass input parameters to subroutines via registers',
    'Return values from subroutines via registers',
    'Understand register calling conventions',
    'Create more flexible, reusable subroutines',
  ],
  newInstructions: ['Parameter passing conventions'],
  category: 'subroutines',
  code: `; ============================================================
; LESSON 13: Passing Parameters
; ============================================================
; Subroutines become much more useful when they can work with
; different data each time they're called.
;
; We pass data to subroutines using REGISTERS:
;   - Input parameters: Put values in registers before calling
;   - Return values: Subroutine puts result in a register
;
; Common LC-3 conventions:
;   - R0: Often used for return values (and I/O)
;   - R1-R3: Often used for input parameters
;   - R5: Often used for return values
;   - R7: Return address (don't modify!)
; ============================================================

        .ORIG x3000

; ============================================================
; MAIN PROGRAM
; ============================================================

        LEA R0, MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: Print Character N Times
; ------------------------------------------------------------
; Input: R0 = character to print, R1 = count
; Output: None (just prints)

        LEA R0, MSG_EX1
        PUTS

        LD R0, CHAR_STAR    ; Character to print: '*'
        AND R1, R1, #0
        ADD R1, R1, #5      ; Print 5 times
        JSR PRINT_N_TIMES
        
        LD R0, NEWLINE
        OUT

        LD R0, CHAR_HASH    ; Character to print: '#'
        AND R1, R1, #0
        ADD R1, R1, #12     ; Print 12 times
        JSR PRINT_N_TIMES
        
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Multiply Two Numbers
; ------------------------------------------------------------
; Input: R0 = first number, R1 = second number
; Output: R0 = product (R0 * R1)

        LEA R0, MSG_EX2
        PUTS

        ; Calculate 6 * 7
        AND R0, R0, #0
        ADD R0, R0, #6      ; First number: 6
        AND R1, R1, #0
        ADD R1, R1, #7      ; Second number: 7
        
        JSR MULTIPLY        ; R0 = R0 * R1 = 42
        
        ; R0 now contains 42! Let's print it.
        ; (For simplicity, we'll just show it's > 40)
        ADD R2, R0, #0      ; Save result in R2
        
        LEA R0, MSG_RESULT
        PUTS
        
        ; Print tens digit (4) and ones digit (2)
        ; 42 / 10 = 4, 42 % 10 = 2
        ; Simple approach: subtract 10s until < 10
        AND R3, R3, #0      ; R3 = tens counter
        
TENS_LOOP
        ADD R4, R2, #-10    ; R4 = R2 - 10
        BRn PRINT_TENS      ; If negative, we're done with tens
        ADD R2, R4, #0      ; R2 = R2 - 10
        ADD R3, R3, #1      ; tens++
        BRnzp TENS_LOOP

PRINT_TENS
        LD R0, ASCII_0
        ADD R0, R3, R0      ; Convert tens to ASCII
        OUT
        
        LD R0, ASCII_0
        ADD R0, R2, R0      ; Convert ones to ASCII
        OUT
        
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Maximum of Two Numbers
; ------------------------------------------------------------
; Input: R0 = first number, R1 = second number
; Output: R0 = larger of the two

        LEA R0, MSG_EX3
        PUTS

        ; Find max(8, 5)
        AND R0, R0, #0
        ADD R0, R0, #8      ; First: 8
        AND R1, R1, #0
        ADD R1, R1, #5      ; Second: 5
        
        JSR MAX
        
        ; Print result (should be 8)
        ADD R1, R0, #0      ; Save result
        LEA R0, MSG_MAX
        PUTS
        LD R0, ASCII_0
        ADD R0, R1, R0
        OUT
        LD R0, NEWLINE
        OUT
        
        ; Find max(3, 9)
        AND R0, R0, #0
        ADD R0, R0, #3
        AND R1, R1, #0
        ADD R1, R1, #9
        
        JSR MAX
        
        ADD R1, R0, #0
        LEA R0, MSG_MAX
        PUTS
        LD R0, ASCII_0
        ADD R0, R1, R0
        OUT
        LD R0, NEWLINE
        OUT

        HALT

; ============================================================
; SUBROUTINES
; ============================================================

; ------------------------------------------------------------
; PRINT_N_TIMES
; Input: R0 = character, R1 = count
; Output: None
; Modifies: R0, R1
; ------------------------------------------------------------
PRINT_N_TIMES
        ADD R1, R1, #0      ; Set condition codes
        BRz PNT_DONE        ; If count is 0, nothing to do

PNT_LOOP
        OUT                 ; Print character (already in R0)
        ADD R1, R1, #-1     ; count--
        BRp PNT_LOOP        ; while count > 0

PNT_DONE
        RET

; ------------------------------------------------------------
; MULTIPLY
; Input: R0 = A, R1 = B
; Output: R0 = A * B
; Modifies: R0, R2
; Note: Simple algorithm using repeated addition
; ------------------------------------------------------------
MULTIPLY
        ADD R1, R1, #0      ; Check if B is 0
        BRz MULT_ZERO       ; If B=0, result is 0
        
        ADD R2, R0, #0      ; R2 = A (save original A)
        AND R0, R0, #0      ; R0 = 0 (accumulator)

MULT_LOOP
        ADD R0, R0, R2      ; result += A
        ADD R1, R1, #-1     ; B--
        BRp MULT_LOOP       ; while B > 0
        
        RET                 ; R0 contains result

MULT_ZERO
        AND R0, R0, #0      ; R0 = 0
        RET

; ------------------------------------------------------------
; MAX
; Input: R0 = A, R1 = B
; Output: R0 = max(A, B)
; Modifies: R0, R2
; ------------------------------------------------------------
MAX
        ; Calculate A - B
        NOT R2, R1
        ADD R2, R2, #1      ; R2 = -B
        ADD R2, R0, R2      ; R2 = A - B
        
        BRzp MAX_RETURN_A   ; If A >= B, return A (already in R0)
        
        ; A < B, so return B
        ADD R0, R1, #0      ; R0 = B

MAX_RETURN_A
        RET                 ; R0 has the max

; ============================================================
; DATA
; ============================================================
MSG_HEADER  .STRINGZ "=== Parameter Passing Demo ===\n\n"
MSG_EX1     .STRINGZ "Example 1 - Print N Times:\n"
MSG_EX2     .STRINGZ "Example 2 - Multiply (6 * 7):\n"
MSG_EX3     .STRINGZ "Example 3 - Maximum:\n"
MSG_RESULT  .STRINGZ "Result: "
MSG_MAX     .STRINGZ "Max is: "

CHAR_STAR   .FILL x2A       ; '*'
CHAR_HASH   .FILL x23       ; '#'
NEWLINE     .FILL x0A
ASCII_0     .FILL x30

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. PARAMETER PASSING VIA REGISTERS:
;    - Before JSR: load parameters into agreed-upon registers
;    - After RET: read return value from agreed-upon register
;
; 2. COMMON CONVENTIONS:
;    - Inputs: R0, R1, R2, R3
;    - Output: R0 (or R5)
;    - R7: Reserved for return address!
;
; 3. SUBROUTINE DOCUMENTATION:
;    Always document:
;    ; Input: which registers, what they mean
;    ; Output: which register has result
;    ; Modifies: which registers are changed
;
; 4. DEFENSIVE CODING:
;    - Check for edge cases (zero, negative, etc.)
;    - Don't assume registers have valid values
;
; 5. LIMITATIONS:
;    - We're using registers, so limited parameters
;    - Calling another subroutine destroys R7!
;    - We'll solve these issues with the STACK later
;
; PRACTICE:
; - Write ABSOLUTE_VALUE: Input R0, Output R0 = |R0|
; - Write IS_EVEN: Input R0, Output R0 = 1 if even, 0 if odd
; - Write POWER: Input R0 = base, R1 = exponent, Output R0 = base^exp
; ============================================================
`,
};

export default lesson;
