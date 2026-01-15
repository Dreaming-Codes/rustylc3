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
; ============================================================

        .ORIG x3000

        BRnzp START         ; Skip over data section

; ============================================================
; CONSTANTS AND POINTERS
; ============================================================
STACK_BASE      .FILL xFE00
NEG_ASCII_0     .FILL xFFD0     ; -48
ASCII_0         .FILL x30
NEWLINE         .FILL x0A
SPACE           .FILL x20
CHAR_PLUS       .FILL x2B       ; '+'
CHAR_MINUS      .FILL x2D       ; '-'
CHAR_STAR       .FILL x2A       ; '*'
CHAR_Q          .FILL x71       ; 'q'
BUFFER_SIZE     .FILL #5

; String pointers
PTR_MSG_HEADER  .FILL x4000
PTR_MSG_PART1   .FILL x4040
PTR_MSG_PART2   .FILL x4070
PTR_MSG_PART3   .FILL x40A0
PTR_MSG_PART4   .FILL x40D0
PTR_MSG_FINAL   .FILL x4100
PTR_MSG_JUMPED  .FILL x4140
PTR_MSG_HELLO   .FILL x4160
PTR_MSG_GOODBYE .FILL x4190
PTR_MSG_MENU    .FILL x41C0
PTR_MSG_OPT0    .FILL x41F0
PTR_MSG_OPT1    .FILL x4210
PTR_MSG_OPT2    .FILL x4230
PTR_MSG_OPT3    .FILL x4250
PTR_MSG_INVALID .FILL x4270
PTR_MSG_BUFFER  .FILL x4290
PTR_MSG_PROMPT  .FILL x42B0
PTR_MSG_EQUALS  .FILL x42F0
PTR_MSG_UNKOP   .FILL x4300
PTR_MSG_BYE     .FILL x4330

; Jump table for menu
JUMP_TABLE      .FILL MENU_OPT0
                .FILL MENU_OPT1
                .FILL MENU_OPT2
                .FILL MENU_OPT3

; Buffer allocated with .BLKW
BUFFER          .BLKW #5

; ============================================================
; MAIN PROGRAM
; ============================================================

START
        LD R6, STACK_BASE

        LD R0, PTR_MSG_HEADER
        PUTS

; ------------------------------------------------------------
; PART 1: JMP - Indirect Jump
; ------------------------------------------------------------
        LD R0, PTR_MSG_PART1
        PUTS

        LEA R1, JUMP_TARGET
        JMP R1              ; Jump to address in R1

JUMP_TARGET
        LD R0, PTR_MSG_JUMPED
        PUTS
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 2: JSRR - Indirect Subroutine Call
; ------------------------------------------------------------
        LD R0, PTR_MSG_PART2
        PUTS

        LEA R1, FUNC_HELLO
        JSRR R1
        
        LEA R1, FUNC_GOODBYE
        JSRR R1
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 3: Jump Table Menu
; ------------------------------------------------------------
        LD R0, PTR_MSG_PART3
        PUTS
        LD R0, PTR_MSG_MENU
        PUTS
        
        IN
        LD R0, NEWLINE
        OUT
        
        ADD R1, R0, #0
        LD R2, NEG_ASCII_0
        ADD R1, R1, R2      ; R1 = choice (0-3)
        
        BRn INVALID_CHOICE
        ADD R2, R1, #-4
        BRzp INVALID_CHOICE
        
        LEA R2, JUMP_TABLE
        ADD R2, R2, R1
        LDR R2, R2, #0
        JSRR R2
        
        BRnzp MENU_DONE

INVALID_CHOICE
        LD R0, PTR_MSG_INVALID
        PUTS

MENU_DONE
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 4: .BLKW Buffer
; ------------------------------------------------------------
        LD R0, PTR_MSG_PART4
        PUTS

        LEA R1, BUFFER
        AND R2, R2, #0
        LD R3, BUFFER_SIZE

FILL_LOOP
        STR R2, R1, #0
        ADD R1, R1, #1
        ADD R2, R2, #1
        ADD R3, R3, #-1
        BRp FILL_LOOP
        
        LD R0, PTR_MSG_BUFFER
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
; FINAL PROJECT: Calculator
; ============================================================
        LD R0, PTR_MSG_FINAL
        PUTS

CALC_LOOP
        LD R0, PTR_MSG_PROMPT
        PUTS
        
        GETC
        OUT
        ADD R1, R0, #0
        LD R2, NEG_ASCII_0
        ADD R1, R1, R2      ; R1 = first number
        
        GETC
        OUT
        ADD R3, R0, #0      ; R3 = operator
        
        GETC
        OUT
        ADD R2, R0, #0
        LD R4, NEG_ASCII_0
        ADD R2, R2, R4      ; R2 = second number
        
        LD R0, NEWLINE
        OUT
        
        ; Check operator
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
        
        LD R0, PTR_MSG_UNKOP
        PUTS
        BRnzp CALC_LOOP

DO_ADD
        ADD R5, R1, R2
        BRnzp SHOW_RESULT
        
DO_SUB
        NOT R2, R2
        ADD R2, R2, #1
        ADD R5, R1, R2
        BRnzp SHOW_RESULT
        
DO_MULT
        AND R5, R5, #0
        ADD R2, R2, #0
        BRz SHOW_RESULT
MUL_LP  ADD R5, R5, R1
        ADD R2, R2, #-1
        BRp MUL_LP
        BRnzp SHOW_RESULT

SHOW_RESULT
        LD R0, PTR_MSG_EQUALS
        PUTS
        ADD R2, R5, #0
        
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
        LD R0, PTR_MSG_BYE
        PUTS
        HALT

; ============================================================
; SUBROUTINES
; ============================================================

FUNC_HELLO
        ADD R6, R6, #-1
        STR R7, R6, #0
        LD R0, PTR_MSG_HELLO
        PUTS
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

FUNC_GOODBYE
        ADD R6, R6, #-1
        STR R7, R6, #0
        LD R0, PTR_MSG_GOODBYE
        PUTS
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

MENU_OPT0
        ADD R6, R6, #-1
        STR R7, R6, #0
        LD R0, PTR_MSG_OPT0
        PUTS
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

MENU_OPT1
        ADD R6, R6, #-1
        STR R7, R6, #0
        LD R0, PTR_MSG_OPT1
        PUTS
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

MENU_OPT2
        ADD R6, R6, #-1
        STR R7, R6, #0
        LD R0, PTR_MSG_OPT2
        PUTS
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

MENU_OPT3
        ADD R6, R6, #-1
        STR R7, R6, #0
        LD R0, PTR_MSG_OPT3
        PUTS
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

; PRINT_NUM: Print R2 (0-99)
PRINT_NUM
        ADD R6, R6, #-1
        STR R7, R6, #0
        ADD R6, R6, #-1
        STR R3, R6, #0
        ADD R6, R6, #-1
        STR R4, R6, #0
        
        AND R3, R3, #0
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
; DATA SEGMENT
; ============================================================

        .ORIG x4000
MSG_HEADER      .STRINGZ "=== Lesson 18: Final Project ===\\n\\n"

        .ORIG x4040
MSG_PART1       .STRINGZ "Part 1 - JMP (indirect jump):\\n"

        .ORIG x4070
MSG_PART2       .STRINGZ "Part 2 - JSRR (indirect call):\\n"

        .ORIG x40A0
MSG_PART3       .STRINGZ "Part 3 - Jump table menu:\\n"

        .ORIG x40D0
MSG_PART4       .STRINGZ "Part 4 - .BLKW buffer:\\n"

        .ORIG x4100
MSG_FINAL       .STRINGZ "=== CALCULATOR ===\\n"

        .ORIG x4140
MSG_JUMPED      .STRINGZ "Successfully jumped!\\n"

        .ORIG x4160
MSG_HELLO       .STRINGZ "Hello from FUNC_HELLO!\\n"

        .ORIG x4190
MSG_GOODBYE     .STRINGZ "Goodbye from FUNC_GOODBYE!\\n"

        .ORIG x41C0
MSG_MENU        .STRINGZ "0=Info 1=Add 2=Mult 3=Exit: "

        .ORIG x41F0
MSG_OPT0        .STRINGZ "LC-3 Calculator v1.0\\n"

        .ORIG x4210
MSG_OPT1        .STRINGZ "Addition selected!\\n"

        .ORIG x4230
MSG_OPT2        .STRINGZ "Multiplication selected!\\n"

        .ORIG x4250
MSG_OPT3        .STRINGZ "Goodbye!\\n"

        .ORIG x4270
MSG_INVALID     .STRINGZ "Invalid choice!\\n"

        .ORIG x4290
MSG_BUFFER      .STRINGZ "Buffer: "

        .ORIG x42B0
MSG_PROMPT      .STRINGZ "Enter (d op d) or 'q': "

        .ORIG x42F0
MSG_EQUALS      .STRINGZ "= "

        .ORIG x4300
MSG_UNKOP       .STRINGZ "Use + - *\\n"

        .ORIG x4330
MSG_BYE         .STRINGZ "\\nThank you!\\n"

        .END

; ============================================================
; CONGRATULATIONS! You've completed the LC-3 course!
; ============================================================
`,
};

export default lesson;
