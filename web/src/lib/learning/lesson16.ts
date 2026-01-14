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
;
; The stack is ESSENTIAL for:
;   - Saving/restoring registers in subroutines
;   - Nested subroutine calls (saving R7)
;   - Local variables
;   - Expression evaluation
; ============================================================

        .ORIG x3000

; ============================================================
; MAIN PROGRAM
; ============================================================

        ; Initialize stack pointer
        ; Stack grows down from xFE00 (below I/O region)
        LD R6, STACK_BASE   ; R6 = xFE00 (stack pointer)

        LEA R0, MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: Basic PUSH and POP
; ------------------------------------------------------------
        LEA R0, MSG_EX1
        PUTS

        ; Let's push some values onto the stack
        AND R1, R1, #0
        ADD R1, R1, #5      ; R1 = 5
        
        ; PUSH R1 onto stack
        ADD R6, R6, #-1     ; SP-- (make room)
        STR R1, R6, #0      ; mem[SP] = R1
        
        LEA R0, MSG_PUSHED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT

        ; Push another value
        AND R1, R1, #0
        ADD R1, R1, #9      ; R1 = 9
        ADD R6, R6, #-1     ; PUSH
        STR R1, R6, #0
        
        LEA R0, MSG_PUSHED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT

        ; Push a third value
        AND R1, R1, #0
        ADD R1, R1, #3      ; R1 = 3
        ADD R6, R6, #-1     ; PUSH
        STR R1, R6, #0
        
        LEA R0, MSG_PUSHED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        ; Now POP them off (LIFO - reverse order!)
        LEA R0, MSG_POPPING
        PUTS
        
        ; POP into R2
        LDR R2, R6, #0      ; R2 = mem[SP]
        ADD R6, R6, #1      ; SP++
        
        LEA R0, MSG_POPPED
        PUTS
        JSR PRINT_NUM       ; Should print 3
        LD R0, NEWLINE
        OUT

        ; POP again
        LDR R2, R6, #0
        ADD R6, R6, #1
        
        LEA R0, MSG_POPPED
        PUTS
        JSR PRINT_NUM       ; Should print 9
        LD R0, NEWLINE
        OUT

        ; POP last one
        LDR R2, R6, #0
        ADD R6, R6, #1
        
        LEA R0, MSG_POPPED
        PUTS
        JSR PRINT_NUM       ; Should print 5
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Saving R7 for Nested Calls
; ------------------------------------------------------------
; This is the MAIN reason we need a stack in practice!
; When subroutine A calls subroutine B, B's JSR overwrites R7.
; We must PUSH R7 before calling, POP after returning.

        LEA R0, MSG_EX2
        PUTS
        
        JSR OUTER_SUB       ; Call a subroutine that calls another
        
        LEA R0, MSG_RETURNED
        PUTS

; ------------------------------------------------------------
; EXAMPLE 3: Using Stack for Computation
; ------------------------------------------------------------
; Calculate (3 + 5) * 2 using the stack.

        LEA R0, MSG_EX3
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
        
        ; Pop two values, add them, push result
        LDR R1, R6, #0      ; Pop 5
        ADD R6, R6, #1
        LDR R2, R6, #0      ; Pop 3
        ADD R6, R6, #1
        ADD R1, R1, R2      ; 5 + 3 = 8
        ADD R6, R6, #-1     ; Push 8
        STR R1, R6, #0
        
        ; Push 2
        AND R1, R1, #0
        ADD R1, R1, #2
        ADD R6, R6, #-1
        STR R1, R6, #0
        
        ; Pop two values, multiply, push result
        LDR R1, R6, #0      ; Pop 2
        ADD R6, R6, #1
        LDR R2, R6, #0      ; Pop 8
        ADD R6, R6, #1
        
        ; Multiply R2 * R1 (simple loop)
        AND R3, R3, #0      ; accumulator
MULT_LOOP
        ADD R3, R3, R2      ; acc += 8
        ADD R1, R1, #-1
        BRp MULT_LOOP
        ; R3 = 8 * 2 = 16
        
        ADD R6, R6, #-1     ; Push result
        STR R3, R6, #0
        
        ; Pop and display final result
        LDR R2, R6, #0
        ADD R6, R6, #1
        
        LEA R0, MSG_CALC
        PUTS
        JSR PRINT_NUM       ; Should print 16
        LD R0, NEWLINE
        OUT

        HALT

; ============================================================
; SUBROUTINES
; ============================================================

; OUTER_SUB - Calls INNER_SUB, demonstrating R7 save/restore
OUTER_SUB
        ; SAVE R7 on stack (critical!)
        ADD R6, R6, #-1
        STR R7, R6, #0
        
        LEA R0, MSG_IN_OUTER
        PUTS
        
        JSR INNER_SUB       ; This would destroy R7 without saving!
        
        LEA R0, MSG_BACK_OUTER
        PUTS
        
        ; RESTORE R7 from stack
        LDR R7, R6, #0
        ADD R6, R6, #1
        
        RET                 ; Now RET works correctly!

INNER_SUB
        LEA R0, MSG_IN_INNER
        PUTS
        RET

; Print number in R2 (0-99)
PRINT_NUM
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
        RET

; ============================================================
; DATA
; ============================================================
MSG_HEADER    .STRINGZ "=== The Stack ===\n\n"
MSG_EX1       .STRINGZ "Example 1 - Push/Pop:\n"
MSG_EX2       .STRINGZ "Example 2 - Nested subroutines:\n"
MSG_EX3       .STRINGZ "Example 3 - Stack computation:\n"

MSG_PUSHED    .STRINGZ "Pushed: "
MSG_POPPING   .STRINGZ "Popping (reverse order)...\n"
MSG_POPPED    .STRINGZ "Popped: "
MSG_IN_OUTER  .STRINGZ "  -> In OUTER_SUB\n"
MSG_IN_INNER  .STRINGZ "     -> In INNER_SUB\n"
MSG_BACK_OUTER .STRINGZ "  <- Back in OUTER_SUB\n"
MSG_RETURNED  .STRINGZ "<- Returned to main\n\n"
MSG_CALC      .STRINGZ "(3 + 5) * 2 = "

STACK_BASE    .FILL xFE00
ASCII_0       .FILL x30
NEWLINE       .FILL x0A

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
; 6. PUSH/POP PATTERN:
;        ; Push multiple
;        ADD R6, R6, #-1
;        STR R1, R6, #0
;        ADD R6, R6, #-1
;        STR R2, R6, #0
;        
;        ; Pop in REVERSE order
;        LDR R2, R6, #0
;        ADD R6, R6, #1
;        LDR R1, R6, #0
;        ADD R6, R6, #1
;
; PRACTICE:
; - Implement a recursive factorial function using the stack
; - Create a reverse-string function using push/pop
; - What happens if you pop more than you pushed? (stack underflow)
; ============================================================
`,
};

export default lesson;
