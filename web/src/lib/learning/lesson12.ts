import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-12',
  lessonNumber: 12,
  title: 'Subroutines',
  description: 'Learn how to create reusable functions with JSR and RET instructions.',
  objectives: [
    'Understand the purpose of subroutines',
    'Use JSR to call a subroutine',
    'Use RET to return from a subroutine',
    'Understand how R7 stores the return address',
  ],
  newInstructions: ['JSR', 'RET'],
  category: 'subroutines',
  code: `; ============================================================
; LESSON 12: Subroutines
; ============================================================
; Subroutines (also called functions or procedures) let us:
;   - Reuse code without copying it
;   - Break complex programs into smaller pieces
;   - Make code easier to understand and maintain
;
; Key instructions:
;   JSR LABEL - Jump to Subroutine: saves PC in R7, jumps to LABEL
;   RET       - Return: jumps back to address in R7
;
; In this lesson, you'll learn:
; - How to define a subroutine
; - How to call it with JSR
; - How to return with RET
; - How R7 tracks where to return
; ============================================================

        .ORIG x3000

; ============================================================
; MAIN PROGRAM
; ============================================================

        ; Let's print a line of asterisks multiple times!
        ; Instead of writing the same code 3 times, we'll use
        ; a subroutine.

        LEA R0, MSG_START
        PUTS

        ; Call our subroutine 3 times
        JSR PRINT_STARS     ; First call
        JSR PRINT_STARS     ; Second call
        JSR PRINT_STARS     ; Third call

        LEA R0, MSG_END
        PUTS

; ------------------------------------------------------------
; EXAMPLE 2: Subroutine with Different Behavior
; ------------------------------------------------------------
        ; Let's call a greeting subroutine

        JSR PRINT_GREETING

; ------------------------------------------------------------
; EXAMPLE 3: Multiple Subroutines
; ------------------------------------------------------------
        ; Print a box using subroutines!
        
        LEA R0, MSG_BOX
        PUTS
        
        JSR PRINT_HORIZONTAL_LINE   ; Top edge
        JSR PRINT_BOX_MIDDLE        ; Middle rows
        JSR PRINT_BOX_MIDDLE
        JSR PRINT_HORIZONTAL_LINE   ; Bottom edge

        HALT

; ============================================================
; SUBROUTINES
; ============================================================
; Convention: Put subroutines AFTER the HALT in main program.
; This keeps them from being accidentally executed.

; ------------------------------------------------------------
; PRINT_STARS: Print a line of 10 asterisks
; Input: None
; Output: Prints "**********" followed by newline
; Modifies: R0, R1
; ------------------------------------------------------------
PRINT_STARS
        ; Save our work registers
        ; (We'll learn proper saving in a later lesson)
        
        LD R1, STAR_COUNT   ; R1 = 10 (counter)
        LD R0, CHAR_STAR    ; R0 = '*'

PS_LOOP
        OUT                 ; Print '*'
        ADD R1, R1, #-1     ; counter--
        BRp PS_LOOP         ; while counter > 0

        LD R0, NEWLINE
        OUT                 ; Print newline

        RET                 ; Return to caller!

; ------------------------------------------------------------
; PRINT_GREETING: Print a friendly greeting
; Input: None
; Output: Prints greeting message
; Modifies: R0
; ------------------------------------------------------------
PRINT_GREETING
        LEA R0, GREETING_MSG
        PUTS
        RET

; ------------------------------------------------------------
; PRINT_HORIZONTAL_LINE: Print "+--------+"
; Input: None
; Output: Prints horizontal box line
; Modifies: R0, R1
; ------------------------------------------------------------
PRINT_HORIZONTAL_LINE
        LD R0, CHAR_PLUS
        OUT                     ; Print '+'
        
        LD R1, DASH_COUNT       ; 8 dashes
        LD R0, CHAR_DASH

PHL_LOOP
        OUT
        ADD R1, R1, #-1
        BRp PHL_LOOP
        
        LD R0, CHAR_PLUS
        OUT                     ; Print '+'
        LD R0, NEWLINE
        OUT
        
        RET

; ------------------------------------------------------------
; PRINT_BOX_MIDDLE: Print "|        |"
; Input: None
; Output: Prints middle row of box
; Modifies: R0, R1
; ------------------------------------------------------------
PRINT_BOX_MIDDLE
        LD R0, CHAR_PIPE
        OUT                     ; Print '|'
        
        LD R1, SPACE_COUNT      ; 8 spaces
        LD R0, CHAR_SPACE

PBM_LOOP
        OUT
        ADD R1, R1, #-1
        BRp PBM_LOOP
        
        LD R0, CHAR_PIPE
        OUT                     ; Print '|'
        LD R0, NEWLINE
        OUT
        
        RET

; ============================================================
; DATA
; ============================================================
MSG_START   .STRINGZ "=== Subroutine Demo ===\n"
MSG_END     .STRINGZ "=== Done! ===\n\n"
MSG_BOX     .STRINGZ "A box made with subroutines:\n"
GREETING_MSG .STRINGZ "Hello from a subroutine!\n\n"

CHAR_STAR   .FILL x2A       ; '*'
CHAR_PLUS   .FILL x2B       ; '+'
CHAR_DASH   .FILL x2D       ; '-'
CHAR_PIPE   .FILL x7C       ; '|'
CHAR_SPACE  .FILL x20       ; ' '
NEWLINE     .FILL x0A

STAR_COUNT  .FILL #10
DASH_COUNT  .FILL #8
SPACE_COUNT .FILL #8

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. JSR LABEL - Jump to Subroutine
;    - Saves current PC (next instruction address) into R7
;    - Jumps to LABEL
;    
; 2. RET - Return from Subroutine
;    - Jumps to address stored in R7
;    - Equivalent to: JMP R7
;
; 3. R7 IS SPECIAL!
;    - JSR automatically stores return address in R7
;    - If you call another subroutine, R7 gets overwritten!
;    - We'll learn to save R7 in the next lessons
;
; 4. SUBROUTINE STRUCTURE:
;    SUBR_NAME
;        (do work)
;        RET
;
; 5. CALLING CONVENTION (informal):
;    - Document what the subroutine does
;    - Document inputs (which registers)
;    - Document outputs (which registers)
;    - Document which registers are modified
;
; IMPORTANT WARNING:
;    If subroutine A calls subroutine B, A's return address
;    (in R7) will be LOST when B is called! We'll fix this
;    in the stack lesson.
;
; PRACTICE:
; - Create a subroutine that prints your name
; - Create a subroutine that prints any character N times
;   (pass character in R0, count in R1)
; - What happens if you call JSR inside a subroutine without
;   saving R7 first? Try it!
; ============================================================
`,
};

export default lesson;
