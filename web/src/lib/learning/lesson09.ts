import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-09',
  lessonNumber: 9,
  title: 'Conditional Logic',
  description: 'Master complex branching with combined condition codes for sophisticated decision-making.',
  objectives: [
    'Use combined condition codes (BRnz, BRnp, BRzp)',
    'Implement if-else-if chains',
    'Create comparison logic (greater than, less than)',
    'Build a number classification program',
  ],
  newInstructions: ['BRnz', 'BRnp', 'BRzp', 'BRnzp'],
  category: 'control-flow',
  code: `; ============================================================
; LESSON 9: Conditional Logic
; ============================================================
; In Lesson 7, we learned BRn, BRz, BRp for simple conditions.
; Now let's combine them for more complex logic!
;
; COMBINED CONDITIONS:
;   BRnz  - Branch if Negative OR Zero (i.e., <= 0)
;   BRnp  - Branch if Negative OR Positive (i.e., != 0)
;   BRzp  - Branch if Zero OR Positive (i.e., >= 0)
;   BRnzp - Branch always (unconditional)
;
; These let us do comparisons like >, <, >=, <=, ==, !=
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; PART 1: Comparison Patterns
; ------------------------------------------------------------
; To compare A and B, compute A - B, then check condition codes:
;   A - B > 0  (positive) means A > B
;   A - B = 0  (zero)     means A = B
;   A - B < 0  (negative) means A < B

        LD R1, NUM_A        ; R1 = A
        LD R2, NUM_B        ; R2 = B
        
        ; Calculate A - B (without destroying R1)
        NOT R3, R2          ; R3 = ~B
        ADD R3, R3, #1      ; R3 = -B
        ADD R3, R1, R3      ; R3 = A + (-B) = A - B
        
        ; Now check the result
        BRp A_GREATER       ; A - B > 0 means A > B
        BRz A_EQUALS        ; A - B = 0 means A = B
        ; If we get here, A < B
        
        LEA R0, MSG_A_LESS
        PUTS
        BRnzp END_COMPARE

A_GREATER
        LEA R0, MSG_A_GREATER
        PUTS
        BRnzp END_COMPARE

A_EQUALS
        LEA R0, MSG_A_EQUAL
        PUTS

END_COMPARE
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 2: Greater-Than-Or-Equal (>=)
; ------------------------------------------------------------
; Check if X >= 10
; Strategy: compute X - 10, branch if >= 0 (zero or positive)

        LD R1, VALUE_X      ; R1 = X
        LD R2, NEG_TEN      ; R2 = -10
        ADD R3, R1, R2      ; R3 = X - 10
        
        BRzp X_GTE_10       ; If X - 10 >= 0, then X >= 10
        
        ; X < 10
        LEA R0, MSG_LESS_10
        PUTS
        BRnzp END_PART2

X_GTE_10
        LEA R0, MSG_GTE_10
        PUTS

END_PART2
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 3: Not Equal (!=)
; ------------------------------------------------------------
; Check if Y != 0
; Use BRnp - branches if Negative OR Positive (not zero)

        LD R4, VALUE_Y      ; R4 = Y (LD sets condition codes!)
        
        BRnp Y_NOT_ZERO     ; If Y is not zero...
        
        ; Y is zero
        LEA R0, MSG_Y_ZERO
        PUTS
        BRnzp END_PART3

Y_NOT_ZERO
        LEA R0, MSG_Y_NOT_ZERO
        PUTS

END_PART3
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; PART 4: If-Else-If Chain (Grade Calculator)
; ------------------------------------------------------------
; Given a score (0-100), print the letter grade:
;   90-100: A
;   80-89:  B
;   70-79:  C
;   60-69:  D
;   0-59:   F

        LD R1, SCORE        ; R1 = score
        
        ; Check if >= 90
        LD R2, NEG_90
        ADD R3, R1, R2      ; R3 = score - 90
        BRzp GRADE_A        ; If score >= 90, grade A
        
        ; Check if >= 80
        LD R2, NEG_80
        ADD R3, R1, R2      ; R3 = score - 80
        BRzp GRADE_B
        
        ; Check if >= 70
        LD R2, NEG_70
        ADD R3, R1, R2
        BRzp GRADE_C
        
        ; Check if >= 60
        LD R2, NEG_60
        ADD R3, R1, R2
        BRzp GRADE_D
        
        ; Otherwise, grade F
        BRnzp GRADE_F

GRADE_A
        LD R0, CHAR_A
        BRnzp PRINT_GRADE
GRADE_B
        LD R0, CHAR_B
        BRnzp PRINT_GRADE
GRADE_C
        LD R0, CHAR_C
        BRnzp PRINT_GRADE
GRADE_D
        LD R0, CHAR_D
        BRnzp PRINT_GRADE
GRADE_F
        LD R0, CHAR_F

PRINT_GRADE
        OUT                 ; Print the grade letter
        LD R0, NEWLINE
        OUT

        HALT

; ------------------------------------------------------------
; DATA
; ------------------------------------------------------------
NUM_A       .FILL #15
NUM_B       .FILL #10       ; Try different values!
VALUE_X     .FILL #12       ; For >= 10 check
VALUE_Y     .FILL #5        ; For != 0 check
SCORE       .FILL #85       ; Try: 95, 85, 75, 65, 55

NEG_TEN     .FILL #-10
NEG_90      .FILL #-90
NEG_80      .FILL #-80
NEG_70      .FILL #-70
NEG_60      .FILL #-60

CHAR_A      .FILL x41       ; 'A'
CHAR_B      .FILL x42       ; 'B'
CHAR_C      .FILL x43       ; 'C'
CHAR_D      .FILL x44       ; 'D'
CHAR_F      .FILL x46       ; 'F'
NEWLINE     .FILL x0A

MSG_A_GREATER  .STRINGZ "A is greater than B"
MSG_A_LESS     .STRINGZ "A is less than B"
MSG_A_EQUAL    .STRINGZ "A equals B"
MSG_GTE_10     .STRINGZ "X is >= 10"
MSG_LESS_10    .STRINGZ "X is < 10"
MSG_Y_ZERO     .STRINGZ "Y is zero"
MSG_Y_NOT_ZERO .STRINGZ "Y is not zero"

        .END

; ============================================================
; KEY CONCEPTS - COMPARISON CHEAT SHEET
; ============================================================
;
; To check condition, compute A - B then use:
;
;   CONDITION    | BRANCH
;   -------------|--------
;   A == B       | BRz
;   A != B       | BRnp
;   A > B        | BRp
;   A >= B       | BRzp
;   A < B        | BRn
;   A <= B       | BRnz
;
; UNCONDITIONAL JUMP: BRnzp or BR
;
; IF-ELSE-IF PATTERN:
;   (check condition 1)
;   BRx CASE1
;   (check condition 2)
;   BRx CASE2
;   ...
;   (default case)
;   BRnzp END
;   CASE1: ... BRnzp END
;   CASE2: ... BRnzp END
;   END:
;
; PRACTICE:
; - Change SCORE to different values and verify grades
; - Implement: if X is between 5 and 15 (inclusive), print "IN RANGE"
; - Create a sign function: print -1, 0, or 1 based on input sign
; ============================================================
`,
};

export default lesson;
