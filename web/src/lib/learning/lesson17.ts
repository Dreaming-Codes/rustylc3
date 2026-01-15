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
; the caller was using! There are two solutions:
;
; CALLER-SAVE: Caller saves registers before call, restores after
;   - Caller does more work
;   - Only saves what it actually needs
;
; CALLEE-SAVE: Subroutine saves registers it uses, restores before RET
;   - Subroutine is "transparent" - doesn't affect caller's registers
;   - More reliable, easier for caller
;   - Standard convention in LC-3
;
; In this lesson, we'll implement proper callee-save subroutines.
; ============================================================

        .ORIG x3000

; ============================================================
; MAIN PROGRAM
; ============================================================

        ; Initialize stack pointer
        LD R6, STACK_BASE

        LEA R0, MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: The Problem - Registers Getting Clobbered
; ------------------------------------------------------------
        LEA R0, MSG_EX1
        PUTS
        
        ; Set up some values in registers
        AND R1, R1, #0
        ADD R1, R1, #10     ; R1 = 10
        AND R2, R2, #0
        ADD R2, R2, #15     ; R2 = 15
        AND R3, R3, #0
        ADD R3, R3, #7      ; R3 = 7
        
        LEA R0, MSG_BEFORE
        PUTS
        JSR PRINT_REGS      ; Print R1, R2, R3
        
        ; Call a BAD subroutine that doesn't save registers
        JSR BAD_SUBROUTINE
        
        LEA R0, MSG_AFTER_BAD
        PUTS
        JSR PRINT_REGS      ; R1, R2, R3 were destroyed!
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: The Solution - Proper Register Saving
; ------------------------------------------------------------
        LEA R0, MSG_EX2
        PUTS
        
        ; Set up values again
        AND R1, R1, #0
        ADD R1, R1, #10
        AND R2, R2, #0
        ADD R2, R2, #15
        AND R3, R3, #0
        ADD R3, R3, #7
        
        LEA R0, MSG_BEFORE
        PUTS
        JSR PRINT_REGS
        
        ; Call a GOOD subroutine that saves registers
        JSR GOOD_SUBROUTINE
        
        LEA R0, MSG_AFTER_GOOD
        PUTS
        JSR PRINT_REGS      ; R1, R2, R3 preserved!
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Practical Example - Multiply with Proper Saving
; ------------------------------------------------------------
        LEA R0, MSG_EX3
        PUTS
        
        ; Calculate 6 * 7 using our safe multiply
        AND R1, R1, #0
        ADD R1, R1, #6      ; First operand
        AND R2, R2, #0
        ADD R2, R2, #7      ; Second operand
        
        ; R3, R4 have important values we want to keep
        AND R3, R3, #0
        ADD R3, R3, #3
        AND R4, R4, #0
        ADD R4, R4, #4
        
        LEA R0, MSG_BEFORE_MULT
        PUTS
        
        ; Input: R1 = A, R2 = B
        ; Output: R0 = A * B
        JSR SAFE_MULTIPLY
        
        ; Result is in R0
        ADD R5, R0, #0      ; Save result
        
        LEA R0, MSG_RESULT
        PUTS
        ADD R2, R5, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        ; Verify R3 and R4 were preserved
        LEA R0, MSG_PRESERVED
        PUTS
        JSR PRINT_REGS      ; Should show R1=6, R2=7, R3=3
        
        HALT

; ============================================================
; SUBROUTINES
; ============================================================

; ------------------------------------------------------------
; BAD_SUBROUTINE - Demonstrates register clobbering
; Uses R1, R2, R3 without saving them
; ------------------------------------------------------------
BAD_SUBROUTINE
        ; This subroutine carelessly overwrites registers!
        AND R1, R1, #0
        ADD R1, R1, #1      ; Overwrites R1!
        AND R2, R2, #0
        ADD R2, R2, #2      ; Overwrites R2!
        AND R3, R3, #0
        ADD R3, R3, #3      ; Overwrites R3!
        RET

; ------------------------------------------------------------
; GOOD_SUBROUTINE - Properly saves and restores registers
; Uses R1, R2, R3 but preserves caller's values
; ------------------------------------------------------------
GOOD_SUBROUTINE
        ; === PROLOGUE: Save registers we'll use ===
        ADD R6, R6, #-1
        STR R7, R6, #0      ; Save return address
        ADD R6, R6, #-1
        STR R1, R6, #0      ; Save R1
        ADD R6, R6, #-1
        STR R2, R6, #0      ; Save R2
        ADD R6, R6, #-1
        STR R3, R6, #0      ; Save R3
        
        ; === BODY: Do our work (uses R1, R2, R3) ===
        AND R1, R1, #0
        ADD R1, R1, #1
        AND R2, R2, #0
        ADD R2, R2, #2
        AND R3, R3, #0
        ADD R3, R3, #3
        ; (In a real subroutine, we'd do useful work here)
        
        ; === EPILOGUE: Restore registers in reverse order ===
        LDR R3, R6, #0      ; Restore R3
        ADD R6, R6, #1
        LDR R2, R6, #0      ; Restore R2
        ADD R6, R6, #1
        LDR R1, R6, #0      ; Restore R1
        ADD R6, R6, #1
        LDR R7, R6, #0      ; Restore return address
        ADD R6, R6, #1
        
        RET

; ------------------------------------------------------------
; SAFE_MULTIPLY - Multiply with proper register saving
; Input: R1 = A, R2 = B
; Output: R0 = A * B
; Preserves: R1, R2, R3, R4 (and R7 for nesting)
; ------------------------------------------------------------
SAFE_MULTIPLY
        ; === PROLOGUE ===
        ADD R6, R6, #-1
        STR R7, R6, #0      ; Save R7
        ADD R6, R6, #-1
        STR R3, R6, #0      ; Save R3 (we use it as counter)
        ADD R6, R6, #-1
        STR R4, R6, #0      ; Save R4 (we use it for temp)
        
        ; === BODY ===
        AND R0, R0, #0      ; R0 = 0 (accumulator/result)
        ADD R3, R2, #0      ; R3 = B (counter, copy to preserve R2)
        ADD R4, R1, #0      ; R4 = A (copy to preserve R1)
        
        ADD R3, R3, #0      ; Check if B is 0
        BRz SM_DONE
        
SM_LOOP
        ADD R0, R0, R4      ; result += A
        ADD R3, R3, #-1     ; counter--
        BRp SM_LOOP
        
SM_DONE
        ; === EPILOGUE ===
        LDR R4, R6, #0
        ADD R6, R6, #1
        LDR R3, R6, #0
        ADD R6, R6, #1
        LDR R7, R6, #0
        ADD R6, R6, #1
        
        RET                 ; R0 has the result

; ------------------------------------------------------------
; PRINT_REGS - Print R1, R2, R3 values (helper)
; ------------------------------------------------------------
PRINT_REGS
        ADD R6, R6, #-1
        STR R7, R6, #0
        ADD R6, R6, #-1
        STR R1, R6, #0
        ADD R6, R6, #-1
        STR R2, R6, #0
        ADD R6, R6, #-1
        STR R3, R6, #0
        
        LEA R0, MSG_R1
        PUTS
        LDR R2, R6, #2      ; Get saved R1
        JSR PRINT_NUM
        
        LEA R0, MSG_R2
        PUTS
        LDR R2, R6, #1      ; Get saved R2
        JSR PRINT_NUM
        
        LEA R0, MSG_R3
        PUTS
        LDR R2, R6, #0      ; Get saved R3
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

; Print number in R2 (0-99)
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
; DATA
; ============================================================
MSG_HEADER     .STRINGZ "=== Saving Registers ===\\n\\n"
MSG_EX1        .STRINGZ "Example 1 - BAD subroutine (clobbers regs):\\n"
MSG_EX2        .STRINGZ "Example 2 - GOOD subroutine (saves regs):\\n"
MSG_EX3        .STRINGZ "Example 3 - Safe Multiply:\\n"
MSG_BEFORE     .STRINGZ "Before call: "
MSG_AFTER_BAD  .STRINGZ "After BAD:   "
MSG_AFTER_GOOD .STRINGZ "After GOOD:  "
MSG_BEFORE_MULT .STRINGZ "6 * 7 = ?\\n"
MSG_RESULT     .STRINGZ "Result: "
MSG_PRESERVED  .STRINGZ "Registers preserved: "
MSG_R1         .STRINGZ "R1="
MSG_R2         .STRINGZ " R2="
MSG_R3         .STRINGZ " R3="

STACK_BASE     .FILL xFE00
ASCII_0        .FILL x30
NEWLINE        .FILL x0A

        .END

; ============================================================
; KEY CONCEPTS - SUBROUTINE TEMPLATE
; ============================================================
;
; SUBROUTINE_NAME
;     ; === PROLOGUE ===
;     ADD R6, R6, #-1     ; \
;     STR R7, R6, #0      ;  > Save R7 (for nested calls)
;     ADD R6, R6, #-1     ; \
;     STR Rx, R6, #0      ;  > Save each register you use
;     ...                 ; /
;     
;     ; === BODY ===
;     (your code here)
;     
;     ; === EPILOGUE ===
;     LDR Rx, R6, #0      ; \
;     ADD R6, R6, #1      ;  > Restore in REVERSE order
;     ...                 ; /
;     LDR R7, R6, #0      ; \
;     ADD R6, R6, #1      ;  > Restore R7 last
;     RET
;
; RULES:
; 1. Save R7 FIRST if you call other subroutines
; 2. Save all registers you modify (except return value register)
; 3. Restore in REVERSE order of saving
; 4. Restore R7 LAST, right before RET
;
; WHAT TO SAVE:
; - R7: Always, if calling other subroutines
; - R0: Usually holds return value, often not saved
; - R1-R5: Save any you modify
; - R6: NEVER save R6 (it's the stack pointer!)
;
; PRACTICE:
; - Convert your subroutines from previous lessons to use this pattern
; - Write a recursive function (e.g., factorial) with proper saving
; ============================================================
`,
};

export default lesson;
