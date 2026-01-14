import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-07',
  lessonNumber: 7,
  title: 'Simple Branching',
  description: 'Learn how to make decisions in your code using condition codes and the BR instruction.',
  objectives: [
    'Understand condition codes (N, Z, P)',
    'Use BR to conditionally jump to a label',
    'Learn about BRn, BRz, BRp variants',
    'Make simple if-then decisions',
  ],
  newInstructions: ['BR', 'BRn', 'BRz', 'BRp'],
  category: 'control-flow',
  code: `; ============================================================
; LESSON 7: Simple Branching
; ============================================================
; So far, our programs run straight through from top to bottom.
; But real programs need to make DECISIONS!
;
; LC-3 uses CONDITION CODES to remember the result of the last
; operation, and BR (branch) to jump based on those codes.
;
; CONDITION CODES:
;   N (Negative) - Set if result was negative
;   Z (Zero)     - Set if result was zero  
;   P (Positive) - Set if result was positive
;
; Exactly ONE of N, Z, P is set at any time.
;
; BRANCH INSTRUCTION:
;   BR[n][z][p] LABEL - Jump to LABEL if specified conditions match
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; PART 1: Understanding Condition Codes
; ------------------------------------------------------------
; After ADD, AND, NOT, LD, LDI, LDR, or LEA, the condition codes
; are updated based on the value loaded into the destination register.

        AND R0, R0, #0      ; R0 = 0 -> Z flag is SET (result was zero)
        
        ADD R0, R0, #5      ; R0 = 5 -> P flag is SET (result was positive)
        
        ADD R0, R0, #-10    ; R0 = -5 -> N flag is SET (result was negative)

; Check the PSR (Processor Status Register) in the Registers panel!
; You'll see which flag (N, Z, or P) is currently set.

; ------------------------------------------------------------
; PART 2: Conditional Branch - Simple Example
; ------------------------------------------------------------
; Let's check if a number is zero.

        LD R1, TEST_NUM     ; Load test number into R1
                            ; This also sets condition codes!
        
        BRz IS_ZERO         ; If Z flag is set (R1 was 0), jump to IS_ZERO
        
        ; If we get here, the number was NOT zero
        LEA R0, MSG_NOT_ZERO
        PUTS
        BRnzp DONE          ; Jump to DONE unconditionally (skip IS_ZERO)

IS_ZERO
        LEA R0, MSG_ZERO
        PUTS

DONE

; ------------------------------------------------------------
; PART 3: Checking Positive vs Negative
; ------------------------------------------------------------
; Let's classify a number as positive, negative, or zero.

        LD R2, CHECK_NUM    ; Load number to check
        
        BRn NUMBER_NEG      ; If negative, jump
        BRz NUMBER_ZERO     ; If zero, jump
        ; If we get here, it must be positive
        BRp NUMBER_POS      ; (This BRp is technically optional)

NUMBER_NEG
        LEA R0, MSG_NEG
        PUTS
        BRnzp END_CHECK     ; Jump to end

NUMBER_ZERO
        LEA R0, MSG_ZERO2
        PUTS
        BRnzp END_CHECK

NUMBER_POS
        LEA R0, MSG_POS
        PUTS

END_CHECK

; ------------------------------------------------------------
; PART 4: Branch Variants Summary
; ------------------------------------------------------------
; BRn LABEL   - Branch if Negative
; BRz LABEL   - Branch if Zero
; BRp LABEL   - Branch if Positive
; BRnz LABEL  - Branch if Negative OR Zero (i.e., not positive)
; BRnp LABEL  - Branch if Negative OR Positive (i.e., not zero)
; BRzp LABEL  - Branch if Zero OR Positive (i.e., not negative)  
; BRnzp LABEL - Branch ALWAYS (unconditional jump)
; BR LABEL    - Same as BRnzp (branch always)

        HALT

; ------------------------------------------------------------
; DATA
; ------------------------------------------------------------
TEST_NUM    .FILL #0        ; Try changing this to test branching!
CHECK_NUM   .FILL #-7       ; Try: positive, negative, and zero values

MSG_NOT_ZERO .STRINGZ "Number is not zero!\n"
MSG_ZERO     .STRINGZ "Number is zero!\n"
MSG_NEG      .STRINGZ "Number is negative\n"
MSG_ZERO2    .STRINGZ "Number is zero\n"
MSG_POS      .STRINGZ "Number is positive\n"

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. CONDITION CODES (N, Z, P):
;    Updated by: ADD, AND, NOT, LD, LDI, LDR, LEA
;    NOT updated by: ST, STI, STR, BR, JMP, JSR, TRAP
;
; 2. BR INSTRUCTION:
;    BRx LABEL - Jump to LABEL if condition x is met
;    x can be any combination of n, z, p
;
; 3. UNCONDITIONAL JUMP:
;    BRnzp LABEL or just BR LABEL - Always jumps
;
; 4. COMMON PATTERN - If/Else:
;    (code that sets condition codes)
;    BRz ELSE_PART
;    (then code)
;    BRnzp END_IF
;    ELSE_PART
;    (else code)
;    END_IF
;
; PRACTICE:
; - Change TEST_NUM and CHECK_NUM to different values
; - Write code that prints "BIG" if a number > 10, "SMALL" otherwise
;   (Hint: subtract 10, then check if result is positive)
; ============================================================
`,
};

export default lesson;
