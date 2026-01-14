import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-08',
  lessonNumber: 8,
  title: 'Counting Loops',
  description: 'Learn how to create loops using branches to repeat code a specific number of times.',
  objectives: [
    'Create a loop using BR instructions',
    'Use a counter register to control iterations',
    'Understand the decrement-and-branch pattern',
    'Build a simple counting program',
  ],
  newInstructions: ['Loop patterns with BRp'],
  category: 'control-flow',
  code: `; ============================================================
; LESSON 8: Counting Loops
; ============================================================
; Loops let us repeat code multiple times without copying it.
; The basic pattern:
;   1. Initialize a counter
;   2. Do something
;   3. Decrement counter
;   4. If counter > 0, go back to step 2
;
; In this lesson, you'll learn:
; - How to create a counted loop
; - The decrement-and-branch pattern
; - Multiple practical loop examples
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; EXAMPLE 1: Print a character 5 times
; ------------------------------------------------------------
; Let's print "*****" (5 asterisks) using a loop.

        LD R1, FIVE         ; R1 = 5 (our counter)
        LD R0, ASTERISK     ; R0 = '*' (character to print)

LOOP1
        OUT                 ; Print the character in R0
        ADD R1, R1, #-1     ; Decrement counter: R1 = R1 - 1
        BRp LOOP1           ; If R1 > 0 (positive), loop again

; When R1 becomes 0, BRp doesn't branch, so we continue here.
        LD R0, NEWLINE
        OUT                 ; Print newline after the asterisks

; ------------------------------------------------------------
; EXAMPLE 2: Count from 1 to 5
; ------------------------------------------------------------
; Print the digits 1, 2, 3, 4, 5

        AND R1, R1, #0      ; R1 = 0 (current number)
        LD R2, FIVE         ; R2 = 5 (how many to print)
        LD R3, ASCII_ZERO   ; R3 = '0' (ASCII 48, for conversion)

LOOP2
        ADD R1, R1, #1      ; Increment: R1 = R1 + 1
        ADD R0, R1, R3      ; R0 = R1 + '0' (convert number to ASCII digit)
                            ; Example: 1 + 48 = 49 = '1'
        OUT                 ; Print the digit
        
        LD R0, SPACE        ; Print a space between digits
        OUT
        
        ADD R2, R2, #-1     ; Decrement counter
        BRp LOOP2           ; Loop while counter > 0

        LD R0, NEWLINE
        OUT

; Output: "1 2 3 4 5 "

; ------------------------------------------------------------
; EXAMPLE 3: Sum numbers 1 to N
; ------------------------------------------------------------
; Calculate: 1 + 2 + 3 + ... + N
; This is a classic loop example!

        LD R1, N            ; R1 = N (we'll count down from N)
        AND R2, R2, #0      ; R2 = 0 (accumulator for sum)

SUM_LOOP
        ADD R2, R2, R1      ; sum = sum + current number
        ADD R1, R1, #-1     ; current number--
        BRp SUM_LOOP        ; while current > 0

; R2 now contains 1+2+3+...+N
; For N=10: sum = 55
        ST R2, SUM_RESULT   ; Store result in memory

; ------------------------------------------------------------
; EXAMPLE 4: Loop with Early Exit
; ------------------------------------------------------------
; Find the first number divisible by 3 (starting from 1)
; Spoiler: it's 3, but the pattern is what matters!

        AND R1, R1, #0      ; R1 = current number (start at 0)
        LD R4, NEG_THREE    ; R4 = -3 (for checking divisibility)

FIND_LOOP
        ADD R1, R1, #1      ; R1++ (try next number)
        
        ; Check if R1 is divisible by 3
        ; We'll keep subtracting 3 until result <= 0
        ADD R2, R1, #0      ; R2 = copy of R1
        
CHECK_DIV
        ADD R2, R2, R4      ; R2 = R2 - 3
        BRp CHECK_DIV       ; If still positive, subtract again
        BRn FIND_LOOP       ; If negative, not divisible, try next number
        ; If zero, we found it!
        
        ; R1 contains the first number divisible by 3
        ST R1, DIV_RESULT

        HALT

; ------------------------------------------------------------
; DATA
; ------------------------------------------------------------
FIVE        .FILL #5
N           .FILL #10       ; Calculate sum of 1 to 10
ASTERISK    .FILL x2A       ; '*'
NEWLINE     .FILL x0A       ; newline
SPACE       .FILL x20       ; space
ASCII_ZERO  .FILL x30       ; '0' (for digit conversion)
NEG_THREE   .FILL #-3
SUM_RESULT  .FILL #0        ; Will hold sum result
DIV_RESULT  .FILL #0        ; Will hold divisibility result

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. BASIC LOOP PATTERN:
;        LD R1, COUNT       ; Initialize counter
;    LOOP
;        (do work)
;        ADD R1, R1, #-1    ; Decrement
;        BRp LOOP           ; Repeat while positive
;
; 2. COUNT UP PATTERN:
;        AND R1, R1, #0     ; Start at 0
;    LOOP
;        ADD R1, R1, #1     ; Increment first
;        (do work with R1)
;        (check if done, branch back)
;
; 3. ACCUMULATOR PATTERN:
;    Use one register as a running total (sum, product, etc.)
;
; 4. EARLY EXIT:
;    Use conditional branches to exit the loop early
;    when a condition is met.
;
; PRACTICE:
; - Modify Example 1 to print 10 asterisks
; - Print numbers counting DOWN from 5 to 1
; - Calculate the product 1 * 2 * 3 * 4 * 5 (factorial of 5)
; - Print a triangle of asterisks:
;   *
;   **
;   ***
; ============================================================
`,
};

export default lesson;
