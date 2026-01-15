import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-18',
  lessonNumber: 18,
  title: 'Indirect Jumps & Final Project',
  description: 'Master JSRR, JMP, and .BLKW, then apply everything in a comprehensive final project.',
  objectives: [
    'Use JSRR to call subroutines through registers',
    'Use JMP for indirect jumps',
    'Allocate memory blocks with .BLKW',
    'Combine all concepts in a complete program',
  ],
  newInstructions: ['JSRR', 'JMP', '.BLKW'],
  category: 'advanced',
  code: `; ============================================================
; LESSON 18: Indirect Jumps & Final Project
; ============================================================
; This final lesson covers the remaining instructions and
; puts EVERYTHING together in a comprehensive program!
;
; NEW INSTRUCTIONS:
;   JSRR BaseR    - Jump to subroutine at address in BaseR
;   JMP BaseR     - Jump to address in BaseR (RET = JMP R7)
;   .BLKW n       - Allocate n words of memory (uninitialized)
;
; JSRR and JMP are useful for:
;   - Function pointers / callbacks
;   - Jump tables for switch statements
;   - Dynamic dispatch
; ============================================================

        .ORIG x3000

; ============================================================
; MAIN PROGRAM
; ============================================================

        LD R6, STACK_BASE   ; Initialize stack

        LEA R0, MSG_HEADER
        PUTS

; ------------------------------------------------------------
; PART 1: JMP - Indirect Jump
; ------------------------------------------------------------
; JMP BaseR jumps to the address stored in BaseR.
; Note: RET is actually just JMP R7!

        LEA R0, MSG_PART1
        PUTS

        LEA R1, JUMP_TARGET ; R1 = address of JUMP_TARGET
        JMP R1              ; Jump to address in R1
        
        ; This line is SKIPPED because we jumped!
        LEA R0, MSG_SKIPPED
        PUTS

JUMP_TARGET
        LEA R0, MSG_JUMPED
        PUTS
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 2: JSRR - Indirect Subroutine Call
; ------------------------------------------------------------
; JSRR BaseR is like JSR, but the address is in a register.
; This enables function pointers and callbacks!

        LEA R0, MSG_PART2
        PUTS

        ; Call different subroutines using JSRR
        LEA R1, FUNC_HELLO
        JSRR R1             ; Call FUNC_HELLO via R1
        
        LEA R1, FUNC_GOODBYE
        JSRR R1             ; Call FUNC_GOODBYE via R1
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 3: Jump Table (Switch Statement)
; ------------------------------------------------------------
; Use JSRR to implement a menu selection!

        LEA R0, MSG_PART3
        PUTS
        LEA R0, MSG_MENU
        PUTS
        
        IN                  ; Read choice
        LD R0, NEWLINE
        OUT
        
        ; Convert ASCII digit to number (subtract '0')
        ADD R1, R0, #0      ; R1 = input character
        LD R2, NEG_ASCII_0
        ADD R1, R1, R2      ; R1 = choice number (0-3)
        
        ; Bounds check
        BRn INVALID_CHOICE
        ADD R2, R1, #-4     ; Check if >= 4
        BRzp INVALID_CHOICE
        
        ; Use jump table to call appropriate function
        LEA R2, JUMP_TABLE  ; R2 = base of jump table
        ADD R2, R2, R1      ; R2 = &JUMP_TABLE[choice]
        LDR R2, R2, #0      ; R2 = JUMP_TABLE[choice] (function address)
        JSRR R2             ; Call the function!
        
        BRnzp MENU_DONE

INVALID_CHOICE
        LEA R0, MSG_INVALID
        PUTS

MENU_DONE
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 4: .BLKW - Block of Words
; ------------------------------------------------------------
; .BLKW n reserves n words of memory (uninitialized).
; Perfect for arrays and buffers!

        LEA R0, MSG_PART4
        PUTS

        ; Fill BUFFER with values 0, 1, 2, 3, 4
        LEA R1, BUFFER      ; R1 = buffer pointer
        AND R2, R2, #0      ; R2 = counter/value
        LD R3, BUFFER_SIZE

FILL_LOOP
        STR R2, R1, #0      ; buffer[i] = i
        ADD R1, R1, #1      ; pointer++
        ADD R2, R2, #1      ; value++
        ADD R3, R3, #-1
        BRp FILL_LOOP
        
        ; Print the buffer
        LEA R0, MSG_BUFFER
        PUTS
        LEA R1, BUFFER
        LD R3, BUFFER_SIZE
        
PRINT_BUF
        LDR R2, R1, #0
        JSR PRINT_NUM
        LD R0, SPACE
        OUT
        ADD R1, R1, #1
        ADD R3, R3, #-1
        BRp PRINT_BUF
        
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ============================================================
; FINAL PROJECT: Interactive Calculator
; ============================================================
; A complete program combining everything we've learned:
; - Input/Output
; - Branching and loops
; - Subroutines with register saving
; - Arrays and memory
; - Jump tables

        LEA R0, MSG_FINAL
        PUTS

CALC_LOOP
        LEA R0, MSG_CALC_PROMPT
        PUTS
        
        ; Read first number (single digit)
        GETC
        OUT
        ADD R1, R0, #0      ; Save first digit
        LD R2, NEG_ASCII_0
        ADD R1, R1, R2      ; Convert to number
        
        ; Read operator
        GETC
        OUT
        ADD R3, R0, #0      ; Save operator
        
        ; Read second number
        GETC
        OUT
        ADD R2, R0, #0      ; Save second digit
        LD R4, NEG_ASCII_0
        ADD R2, R2, R4      ; Convert to number
        
        LD R0, NEWLINE
        OUT
        
        ; Check operator and perform operation
        ; R1 = first number, R2 = second number, R3 = operator
        
        LD R4, CHAR_PLUS
        NOT R4, R4
        ADD R4, R4, #1
        ADD R4, R3, R4
        BRz DO_ADD
        
        LD R4, CHAR_MINUS
        NOT R4, R4
        ADD R4, R4, #1
        ADD R4, R3, R4
        BRz DO_SUB
        
        LD R4, CHAR_STAR
        NOT R4, R4
        ADD R4, R4, #1
        ADD R4, R3, R4
        BRz DO_MULT
        
        LD R4, CHAR_Q
        NOT R4, R4
        ADD R4, R4, #1
        ADD R4, R3, R4
        BRz CALC_QUIT
        
        LEA R0, MSG_UNK_OP
        PUTS
        BRnzp CALC_LOOP

DO_ADD
        ADD R5, R1, R2      ; R5 = result
        BRnzp SHOW_RESULT
        
DO_SUB
        NOT R2, R2
        ADD R2, R2, #1
        ADD R5, R1, R2
        BRnzp SHOW_RESULT
        
DO_MULT
        AND R5, R5, #0      ; R5 = 0 (accumulator)
        ADD R2, R2, #0
        BRz SHOW_RESULT
MUL_LP  ADD R5, R5, R1
        ADD R2, R2, #-1
        BRp MUL_LP
        BRnzp SHOW_RESULT

SHOW_RESULT
        LEA R0, MSG_EQUALS
        PUTS
        ADD R2, R5, #0
        
        ; Handle negative
        ADD R2, R2, #0
        BRzp PRINT_POS
        LD R0, CHAR_MINUS
        OUT
        NOT R2, R2
        ADD R2, R2, #1

PRINT_POS
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        BRnzp CALC_LOOP

CALC_QUIT
        LEA R0, MSG_BYE
        PUTS

        HALT

; ============================================================
; SUBROUTINES
; ============================================================

FUNC_HELLO
        LEA R0, MSG_HELLO
        PUTS
        RET

FUNC_GOODBYE
        LEA R0, MSG_GOODBYE
        PUTS
        RET

MENU_OPT0
        LEA R0, MSG_OPT0
        PUTS
        RET

MENU_OPT1
        LEA R0, MSG_OPT1
        PUTS
        RET

MENU_OPT2
        LEA R0, MSG_OPT2
        PUTS
        RET

MENU_OPT3
        LEA R0, MSG_OPT3
        PUTS
        RET

; Print number (handles negatives and 0-99)
PRINT_NUM
        ADD R6, R6, #-1
        STR R7, R6, #0
        ADD R6, R6, #-1
        STR R3, R6, #0
        ADD R6, R6, #-1
        STR R4, R6, #0
        
        AND R3, R3, #0      ; tens
PN_T    ADD R4, R2, #-10
        BRn PN_O
        ADD R2, R4, #0
        ADD R3, R3, #1
        BRnzp PN_T
PN_O    ADD R3, R3, #0
        BRz PN_S
        LD R0, ASCII_0
        ADD R0, R3, R0
        OUT
PN_S    LD R0, ASCII_0
        ADD R0, R2, R0
        OUT
        
        LDR R4, R6, #0
        ADD R6, R6, #1
        LDR R3, R6, #0
        ADD R6, R6, #1
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

; ============================================================
; DATA
; ============================================================
MSG_HEADER      .STRINGZ "=== Lesson 18: Final Project ===\\n\\n"
MSG_PART1       .STRINGZ "Part 1 - JMP (indirect jump):\\n"
MSG_PART2       .STRINGZ "Part 2 - JSRR (indirect call):\\n"
MSG_PART3       .STRINGZ "Part 3 - Jump table menu:\\n"
MSG_PART4       .STRINGZ "Part 4 - .BLKW buffer:\\n"
MSG_FINAL       .STRINGZ "=== FINAL PROJECT: Calculator ===\\n"

MSG_SKIPPED     .STRINGZ "This should NOT print!\\n"
MSG_JUMPED      .STRINGZ "Successfully jumped!\\n"
MSG_HELLO       .STRINGZ "Hello from FUNC_HELLO!\\n"
MSG_GOODBYE     .STRINGZ "Goodbye from FUNC_GOODBYE!\\n"

MSG_MENU        .STRINGZ "0=Info 1=Add 2=Mult 3=Exit: "
MSG_OPT0        .STRINGZ "LC-3 Calculator v1.0\\n"
MSG_OPT1        .STRINGZ "Addition selected!\\n"
MSG_OPT2        .STRINGZ "Multiplication selected!\\n"
MSG_OPT3        .STRINGZ "Goodbye!\\n"
MSG_INVALID     .STRINGZ "Invalid choice!\\n"

MSG_BUFFER      .STRINGZ "Buffer contents: "

MSG_CALC_PROMPT .STRINGZ "Enter (digit op digit) or 'q' to quit: "
MSG_EQUALS      .STRINGZ "= "
MSG_UNK_OP      .STRINGZ "Unknown operator! Use + - *\\n"
MSG_BYE         .STRINGZ "\\nThank you for using LC-3 Calculator!\\n"

; Jump table for menu
JUMP_TABLE      .FILL MENU_OPT0
                .FILL MENU_OPT1
                .FILL MENU_OPT2
                .FILL MENU_OPT3

; Buffer allocated with .BLKW
BUFFER          .BLKW #5        ; 5 uninitialized words
BUFFER_SIZE     .FILL #5

STACK_BASE      .FILL xFE00
NEG_ASCII_0     .FILL xFFD0     ; -48
ASCII_0         .FILL x30
NEWLINE         .FILL x0A
SPACE           .FILL x20
CHAR_PLUS       .FILL x2B       ; '+'
CHAR_MINUS      .FILL x2D       ; '-'
CHAR_STAR       .FILL x2A       ; '*'
CHAR_Q          .FILL x71       ; 'q'

        .END

; ============================================================
; CONGRATULATIONS!
; ============================================================
; You've completed the LC-3 Assembly course! You now know:
;
; INSTRUCTIONS:
;   Arithmetic: ADD, AND, NOT
;   Memory:     LD, LDI, LDR, LEA, ST, STI, STR
;   Control:    BR (all variants), JMP, JSR, JSRR, RET
;   I/O:        GETC, OUT, PUTS, IN, HALT
;
; DIRECTIVES:
;   .ORIG, .END, .FILL, .STRINGZ, .BLKW
;
; CONCEPTS:
;   - Registers and condition codes
;   - Memory addressing modes
;   - Branching and loops
;   - Subroutines and the stack
;   - Register saving conventions
;   - Arrays and data structures
;
; WHAT'S NEXT?
;   - Try writing more complex programs
;   - Implement sorting algorithms
;   - Create a simple game
;   - Study how the LC-3 OS works
;   - Learn about interrupts and privilege modes
;
; Happy coding!
; ============================================================
`,
};

export default lesson;
