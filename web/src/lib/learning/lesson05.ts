import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-05',
  lessonNumber: 5,
  title: 'Bitwise NOT',
  description: 'Learn the NOT instruction for bitwise complement and how to use it for subtraction.',
  objectives: [
    'Understand bitwise NOT (complement)',
    'Learn how NOT flips all bits',
    'Use NOT and ADD to perform subtraction',
    'Understand two\'s complement representation',
  ],
  newInstructions: ['NOT'],
  category: 'arithmetic',
  code: `; ============================================================
; LESSON 5: Bitwise NOT
; ============================================================
; LC-3 has only ADD for arithmetic - no SUB instruction!
; But we can subtract using NOT and ADD together.
;
; NOT DR, SR - Bitwise NOT: DR = ~SR (flip all bits)
;
; In this lesson, you'll learn:
; - How NOT flips every bit in a register
; - Two's complement number representation
; - How to subtract using NOT and ADD
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; PART 1: Understanding NOT
; ------------------------------------------------------------
; NOT flips every bit: 0 becomes 1, 1 becomes 0
;
; Example: NOT of x000F (binary: 0000000000001111)
;          Result: xFFF0 (binary: 1111111111110000)

        AND R0, R0, #0      ; Clear R0
        ADD R0, R0, #15     ; R0 = x000F = 0000000000001111
        
        NOT R1, R0          ; R1 = ~R0 = xFFF0 = 1111111111110000

; Check the Registers panel:
;   R0 = x000F (15)
;   R1 = xFFF0 (-16 in two's complement)

; ------------------------------------------------------------
; PART 2: Two's Complement Review
; ------------------------------------------------------------
; LC-3 uses two's complement for signed numbers.
; 
; To negate a number (make positive negative or vice versa):
;   Step 1: NOT the number (flip all bits)
;   Step 2: ADD 1
;
; Example: Negate 5
;   5     = 0000000000000101
;   NOT 5 = 1111111111111010 = -6 (not quite -5 yet!)
;   +1    = 1111111111111011 = -5 (there we go!)

        AND R2, R2, #0
        ADD R2, R2, #5      ; R2 = 5
        
        NOT R3, R2          ; R3 = ~5 = -6
        ADD R3, R3, #1      ; R3 = -6 + 1 = -5

; Now R3 contains -5 (which is xFFFB in hex)

; ------------------------------------------------------------
; PART 3: Subtraction Using NOT
; ------------------------------------------------------------
; To calculate A - B:
;   Step 1: Negate B (NOT B, then ADD 1)
;   Step 2: ADD A + (-B)
;
; Let's calculate 10 - 3 = 7

        AND R4, R4, #0
        ADD R4, R4, #10     ; R4 = 10 (this is A)
        
        AND R5, R5, #0
        ADD R5, R5, #3      ; R5 = 3 (this is B)
        
        ; Negate R5 to get -3
        NOT R5, R5          ; R5 = ~3
        ADD R5, R5, #1      ; R5 = -3
        
        ; Now add: 10 + (-3) = 7
        ADD R6, R4, R5      ; R6 = 10 + (-3) = 7

; R6 now contains 7!

; ------------------------------------------------------------
; PART 4: A Cleaner Subtraction Pattern
; ------------------------------------------------------------
; Here's a compact way to do A - B:
; (Assuming A is in R0, B is in R1, result goes to R2)
;
;   NOT R1, R1      ; R1 = ~B
;   ADD R1, R1, #1  ; R1 = -B
;   ADD R2, R0, R1  ; R2 = A + (-B) = A - B
;
; Let's calculate 15 - 8 = 7

        AND R0, R0, #0
        ADD R0, R0, #15     ; R0 = 15 (A)
        
        AND R1, R1, #0
        ADD R1, R1, #8      ; R1 = 8 (B)
        
        NOT R1, R1          ; Negate step 1: ~B
        ADD R1, R1, #1      ; Negate step 2: -B
        ADD R2, R0, R1      ; R2 = A - B = 15 - 8 = 7

        HALT

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. NOT DR, SR - Flips all 16 bits
;    0 -> 1, 1 -> 0
;
; 2. TWO'S COMPLEMENT NEGATION:
;    To get -X from X:
;      NOT X
;      ADD 1
;
; 3. SUBTRACTION PATTERN (A - B):
;      NOT B
;      ADD B, B, #1   ; B is now -B
;      ADD result, A, B
;
; 4. WHY THIS WORKS:
;    In two's complement: -X = ~X + 1
;    So A - B = A + (-B) = A + (~B + 1)
;
; PRACTICE:
; - Calculate 20 - 13 using NOT and ADD
; - What happens if you subtract a larger number from a smaller?
;   (Try 5 - 10 and look at the result in hex)
; - Can you create a "negate" sequence that negates R0 in place?
; ============================================================
`,
};

export default lesson;
