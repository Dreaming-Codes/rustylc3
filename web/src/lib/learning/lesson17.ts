import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-17',
  lessonNumber: 17,
  title: 'Saving Registers',
  description: 'Learn the callee-save convention for preserving registers across subroutine calls.',
  objectives: [
    'Understand callee-save vs caller-save conventions',
    'Implement proper register saving in subroutines',
    'Create robust, reusable subroutines',
    'Build a complete subroutine template',
  ],
  newInstructions: ['Complete subroutine pattern'],
  category: 'advanced',
  code: `; ============================================================
; LESSON 17: Saving Registers (Callee-Save Convention)
; ============================================================
; When a subroutine uses registers, it might overwrite values
; the caller was using! The solution: save and restore registers.
;
; CALLEE-SAVE: Subroutine saves registers it uses, restores before RET
;   - Subroutine is "transparent" - doesn't affect caller's registers
;   - Standard convention in LC-3
; ============================================================

        .ORIG x3000

        BRnzp START         ; Skip over data section

; ============================================================
; CONSTANTS AND POINTERS
; ============================================================
STACK_BASE     .FILL xFE00
ASCII_0        .FILL x30
NEWLINE        .FILL x0A

; String pointers
PTR_MSG_HEADER  .FILL x4000
PTR_MSG_EX1     .FILL x4030
PTR_MSG_EX2     .FILL x4080
PTR_MSG_EX3     .FILL x40D0
PTR_MSG_BEFORE  .FILL x4100
PTR_MSG_AFTER_B .FILL x4120
PTR_MSG_AFTER_G .FILL x4140
PTR_MSG_MULT    .FILL x4160
PTR_MSG_RESULT  .FILL x4180
PTR_MSG_PRES    .FILL x4190
PTR_MSG_R1      .FILL x41B0
PTR_MSG_R2      .FILL x41C0
PTR_MSG_R3      .FILL x41D0

; ============================================================
; MAIN PROGRAM
; ============================================================

START
        LD R6, STACK_BASE

        LD R0, PTR_MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: The Problem - Registers Getting Clobbered
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX1
        PUTS
        
        ; Set up values in registers
        AND R1, R1, #0
        ADD R1, R1, #10     ; R1 = 10
        AND R2, R2, #0
        ADD R2, R2, #15     ; R2 = 15
        AND R3, R3, #0
        ADD R3, R3, #7      ; R3 = 7
        
        LD R0, PTR_MSG_BEFORE
        PUTS
        JSR PRINT_REGS
        
        ; Call BAD subroutine that doesn't save registers
        JSR BAD_SUBROUTINE
        
        LD R0, PTR_MSG_AFTER_B
        PUTS
        JSR PRINT_REGS      ; R1, R2, R3 destroyed!
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: The Solution - Proper Register Saving
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX2
        PUTS
        
        ; Set up values again
        AND R1, R1, #0
        ADD R1, R1, #10
        AND R2, R2, #0
        ADD R2, R2, #15
        AND R3, R3, #0
        ADD R3, R3, #7
        
        LD R0, PTR_MSG_BEFORE
        PUTS
        JSR PRINT_REGS
        
        ; Call GOOD subroutine that saves registers
        JSR GOOD_SUBROUTINE
        
        LD R0, PTR_MSG_AFTER_G
        PUTS
        JSR PRINT_REGS      ; R1, R2, R3 preserved!
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Safe Multiply (6 * 7)
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX3
        PUTS
        
        AND R1, R1, #0
        ADD R1, R1, #6      ; A = 6
        AND R2, R2, #0
        ADD R2, R2, #7      ; B = 7
        
        ; Keep values in R3, R4 to verify preservation
        AND R3, R3, #0
        ADD R3, R3, #3
        AND R4, R4, #0
        ADD R4, R4, #4
        
        LD R0, PTR_MSG_MULT
        PUTS
        
        ; SAFE_MULTIPLY: R1*R2 -> R0
        JSR SAFE_MULTIPLY
        
        ADD R5, R0, #0      ; Save result
        
        LD R0, PTR_MSG_RESULT
        PUTS
        ADD R2, R5, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        LD R0, PTR_MSG_PRES
        PUTS
        JSR PRINT_REGS
        
        HALT

; ============================================================
; SUBROUTINES
; ============================================================

BAD_SUBROUTINE
        ; Carelessly overwrites registers!
        AND R1, R1, #0
        ADD R1, R1, #1
        AND R2, R2, #0
        ADD R2, R2, #2
        AND R3, R3, #0
        ADD R3, R3, #3
        RET

GOOD_SUBROUTINE
        ; === PROLOGUE: Save registers ===
        ADD R6, R6, #-1
        STR R7, R6, #0
        ADD R6, R6, #-1
        STR R1, R6, #0
        ADD R6, R6, #-1
        STR R2, R6, #0
        ADD R6, R6, #-1
        STR R3, R6, #0
        
        ; === BODY ===
        AND R1, R1, #0
        ADD R1, R1, #1
        AND R2, R2, #0
        ADD R2, R2, #2
        AND R3, R3, #0
        ADD R3, R3, #3
        
        ; === EPILOGUE: Restore in reverse ===
        LDR R3, R6, #0
        ADD R6, R6, #1
        LDR R2, R6, #0
        ADD R6, R6, #1
        LDR R1, R6, #0
        ADD R6, R6, #1
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

; SAFE_MULTIPLY: R0 = R1 * R2
SAFE_MULTIPLY
        ADD R6, R6, #-1
        STR R7, R6, #0
        ADD R6, R6, #-1
        STR R3, R6, #0
        ADD R6, R6, #-1
        STR R4, R6, #0
        
        AND R0, R0, #0      ; result = 0
        ADD R3, R2, #0      ; counter = B
        ADD R4, R1, #0      ; temp = A
        
        ADD R3, R3, #0
        BRz SM_DONE
SM_LOOP
        ADD R0, R0, R4
        ADD R3, R3, #-1
        BRp SM_LOOP
SM_DONE
        LDR R4, R6, #0
        ADD R6, R6, #1
        LDR R3, R6, #0
        ADD R6, R6, #1
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

; PRINT_REGS: Print R1, R2, R3
PRINT_REGS
        ADD R6, R6, #-1
        STR R7, R6, #0
        ADD R6, R6, #-1
        STR R1, R6, #0
        ADD R6, R6, #-1
        STR R2, R6, #0
        ADD R6, R6, #-1
        STR R3, R6, #0
        
        LD R0, PTR_MSG_R1
        PUTS
        LDR R2, R6, #2
        JSR PRINT_NUM
        
        LD R0, PTR_MSG_R2
        PUTS
        LDR R2, R6, #1
        JSR PRINT_NUM
        
        LD R0, PTR_MSG_R3
        PUTS
        LDR R2, R6, #0
        JSR PRINT_NUM
        
        LD R0, NEWLINE
        OUT
        
        LDR R3, R6, #0
        ADD R6, R6, #1
        LDR R2, R6, #0
        ADD R6, R6, #1
        LDR R1, R6, #0
        ADD R6, R6, #1
        LDR R7, R6, #0
        ADD R6, R6, #1
        RET

; PRINT_NUM: Print R2 as number (0-99)
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
MSG_HEADER     .STRINGZ "=== Saving Registers ===\\n\\n"

        .ORIG x4030
MSG_EX1        .STRINGZ "Ex 1 - BAD sub (clobbers):\\n"

        .ORIG x4080
MSG_EX2        .STRINGZ "Ex 2 - GOOD sub (saves):\\n"

        .ORIG x40D0
MSG_EX3        .STRINGZ "Ex 3 - Safe Multiply:\\n"

        .ORIG x4100
MSG_BEFORE     .STRINGZ "Before: "

        .ORIG x4120
MSG_AFTER_BAD  .STRINGZ "After BAD: "

        .ORIG x4140
MSG_AFTER_GOOD .STRINGZ "After GOOD: "

        .ORIG x4160
MSG_MULT       .STRINGZ "6 * 7 = ?\\n"

        .ORIG x4180
MSG_RESULT     .STRINGZ "Result: "

        .ORIG x4190
MSG_PRESERVED  .STRINGZ "Preserved: "

        .ORIG x41B0
MSG_R1         .STRINGZ "R1="

        .ORIG x41C0
MSG_R2         .STRINGZ " R2="

        .ORIG x41D0
MSG_R3         .STRINGZ " R3="

        .END

; ============================================================
; SUBROUTINE TEMPLATE
; ============================================================
;
; SUBROUTINE_NAME
;     ; === PROLOGUE ===
;     ADD R6, R6, #-1
;     STR R7, R6, #0      ; Save R7 first
;     ADD R6, R6, #-1
;     STR Rx, R6, #0      ; Save registers you use
;     
;     ; === BODY ===
;     (your code)
;     
;     ; === EPILOGUE ===
;     LDR Rx, R6, #0      ; Restore in REVERSE order
;     ADD R6, R6, #1
;     LDR R7, R6, #0      ; Restore R7 last
;     ADD R6, R6, #1
;     RET
; ============================================================
`,
};

export default lesson;
