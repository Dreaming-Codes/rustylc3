import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-16',
  lessonNumber: 16,
  title: 'The Stack',
  description: 'Learn how to use a stack for temporary storage using push and pop operations.',
  objectives: [
    'Understand what a stack is (LIFO structure)',
    'Use R6 as the stack pointer',
    'Implement PUSH and POP operations',
    'Use the stack to save/restore registers',
  ],
  newInstructions: ['Stack operations (using ADD, STR, LDR)'],
  category: 'advanced',
  code: `; ============================================================
; LESSON 16: The Stack
; ============================================================
; The STACK is a Last-In-First-Out (LIFO) data structure.
; Think of it like a stack of plates - you can only add or
; remove from the TOP.
;
; In LC-3, we use R6 as the Stack Pointer (SP).
; The stack GROWS DOWNWARD in memory (toward lower addresses).
;
; Operations:
;   PUSH: Decrement SP, then store value at SP
;   POP:  Load value from SP, then increment SP
; ============================================================

        .ORIG x3000

        BRnzp START         ; Skip over data section

; ============================================================
; CONSTANTS (must be near code that uses them)
; ============================================================
STACK_BASE    .FILL xFE00
ASCII_0       .FILL x30
NEWLINE       .FILL x0A

; String pointers
PTR_MSG_HEADER  .FILL x4000
PTR_MSG_EX1     .FILL x4030
PTR_MSG_EX2     .FILL x4060
PTR_MSG_EX3     .FILL x4090
PTR_MSG_PUSHED  .FILL x40C0
PTR_MSG_POPPING .FILL x40D0
PTR_MSG_POPPED  .FILL x4100
PTR_MSG_OUTER   .FILL x4110
PTR_MSG_INNER   .FILL x4130
PTR_MSG_BACK    .FILL x4160
PTR_MSG_RET     .FILL x4190
PTR_MSG_CALC    .FILL x41C0

; ============================================================
; MAIN PROGRAM
; ============================================================

START
        ; Initialize stack pointer to xFE00
        LD R6, STACK_BASE

        LD R0, PTR_MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: Basic PUSH and POP
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX1
        PUTS

        ; Push 5 onto stack
        AND R1, R1, #0
        ADD R1, R1, #5
        ADD R6, R6, #-1     ; SP-- (make room)
        STR R1, R6, #0      ; mem[SP] = R1
        
        LD R0, PTR_MSG_PUSHED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT

        ; Push 9
        AND R1, R1, #0
        ADD R1, R1, #9
        ADD R6, R6, #-1
        STR R1, R6, #0
        
        LD R0, PTR_MSG_PUSHED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT

        ; Push 3
        AND R1, R1, #0
        ADD R1, R1, #3
        ADD R6, R6, #-1
        STR R1, R6, #0
        
        LD R0, PTR_MSG_PUSHED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        ; Pop them (LIFO - reverse order!)
        LD R0, PTR_MSG_POPPING
        PUTS
        
        ; POP into R2 (should be 3)
        LDR R2, R6, #0
        ADD R6, R6, #1
        LD R0, PTR_MSG_POPPED
        PUTS
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT

        ; POP (should be 9)
        LDR R2, R6, #0
        ADD R6, R6, #1
        LD R0, PTR_MSG_POPPED
        PUTS
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT

        ; POP (should be 5)
        LDR R2, R6, #0
        ADD R6, R6, #1
        LD R0, PTR_MSG_POPPED
        PUTS
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Saving R7 for Nested Calls
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX2
        PUTS
        
        JSR OUTER_SUB
        
        LD R0, PTR_MSG_RET
        PUTS
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Stack-based Computation: (3 + 5) * 2
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX3
        PUTS
        
        ; Push 3
        AND R1, R1, #0
        ADD R1, R1, #3
        ADD R6, R6, #-1
        STR R1, R6, #0
        
        ; Push 5
        AND R1, R1, #0
        ADD R1, R1, #5
        ADD R6, R6, #-1
        STR R1, R6, #0
        
        ; Pop two, add, push result
        LDR R1, R6, #0      ; Pop 5
        ADD R6, R6, #1
        LDR R2, R6, #0      ; Pop 3
        ADD R6, R6, #1
        ADD R1, R1, R2      ; 8
        ADD R6, R6, #-1
        STR R1, R6, #0      ; Push 8
        
        ; Push 2
        AND R1, R1, #0
        ADD R1, R1, #2
        ADD R6, R6, #-1
        STR R1, R6, #0
        
        ; Pop two, multiply, push result
        LDR R1, R6, #0      ; Pop 2
        ADD R6, R6, #1
        LDR R2, R6, #0      ; Pop 8
        ADD R6, R6, #1
        
        ; R2 * R1 = 8 * 2
        AND R3, R3, #0
MULT_LOOP
        ADD R3, R3, R2
        ADD R1, R1, #-1
        BRp MULT_LOOP
        ; R3 = 16
        
        ADD R6, R6, #-1
        STR R3, R6, #0      ; Push 16
        
        ; Pop and display
        LDR R2, R6, #0
        ADD R6, R6, #1
        
        LD R0, PTR_MSG_CALC
        PUTS
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT

        HALT

; ============================================================
; SUBROUTINES
; ============================================================

OUTER_SUB
        ; SAVE R7 on stack
        ADD R6, R6, #-1
        STR R7, R6, #0
        
        LD R0, PTR_MSG_OUTER
        PUTS
        
        JSR INNER_SUB
        
        LD R0, PTR_MSG_BACK
        PUTS
        
        ; RESTORE R7
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

INNER_SUB
        ADD R6, R6, #-1
        STR R7, R6, #0
        LD R0, PTR_MSG_INNER
        PUTS
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

; Print number in R2 (0-99)
PRINT_NUM
        ADD R6, R6, #-1
        STR R7, R6, #0
        ADD R6, R6, #-1
        STR R3, R6, #0
        ADD R6, R6, #-1
        STR R4, R6, #0
        
        AND R3, R3, #0
PN_TENS
        ADD R4, R2, #-10
        BRn PN_ONES
        ADD R2, R4, #0
        ADD R3, R3, #1
        BRnzp PN_TENS
PN_ONES
        ADD R3, R3, #0
        BRz PN_SKIP
        LD R0, ASCII_0
        ADD R0, R3, R0
        OUT
PN_SKIP
        LD R0, ASCII_0
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
MSG_HEADER    .STRINGZ "=== The Stack ===\\n\\n"

        .ORIG x4030
MSG_EX1       .STRINGZ "Example 1 - Push/Pop:\\n"

        .ORIG x4060
MSG_EX2       .STRINGZ "Example 2 - Nested calls:\\n"

        .ORIG x4090
MSG_EX3       .STRINGZ "Example 3 - Computation:\\n"

        .ORIG x40C0
MSG_PUSHED    .STRINGZ "Pushed: "

        .ORIG x40D0
MSG_POPPING   .STRINGZ "Popping (reverse)...\\n"

        .ORIG x4100
MSG_POPPED    .STRINGZ "Popped: "

        .ORIG x4110
MSG_OUTER     .STRINGZ "  -> In OUTER_SUB\\n"

        .ORIG x4130
MSG_INNER     .STRINGZ "     -> In INNER_SUB\\n"

        .ORIG x4160
MSG_BACK      .STRINGZ "  <- Back in OUTER\\n"

        .ORIG x4190
MSG_RET       .STRINGZ "<- Returned to main\\n"

        .ORIG x41C0
MSG_CALC      .STRINGZ "(3+5)*2 = "

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. STACK POINTER: R6 by convention
;    Points to the TOP of the stack (last pushed item).
;
; 2. STACK GROWS DOWNWARD:
;    Starts at high address (xFE00), grows toward lower.
;
; 3. PUSH OPERATION:
;    ADD R6, R6, #-1    ; Make room
;    STR Rx, R6, #0     ; Store value
;
; 4. POP OPERATION:
;    LDR Rx, R6, #0     ; Load value
;    ADD R6, R6, #1     ; Free the space
;
; 5. SAVING R7 (CRITICAL!):
;    At subroutine START: push R7
;    Before RET: pop R7
;    This enables nested/recursive calls!
;
; PRACTICE:
; - Implement recursive factorial using the stack
; - Create a reverse-string function using push/pop
; - What happens if you pop more than you pushed?
; ============================================================
`,
};

export default lesson;
