import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-14',
  lessonNumber: 14,
  title: 'Base+Offset Addressing',
  description: 'Learn LDR and STR for flexible memory access using a base register plus offset.',
  objectives: [
    'Understand base+offset addressing mode',
    'Use LDR to load from base register + offset',
    'Use STR to store to base register + offset',
    'Access arrays and sequential data efficiently',
  ],
  newInstructions: ['LDR', 'STR'],
  category: 'memory',
  code: `; ============================================================
; LESSON 14: Base+Offset Addressing
; ============================================================
; LD and ST use PC-relative addressing - the label must be
; within ~256 words of the instruction. But what if we need
; to access data far away, or iterate through an array?
;
; LDR and STR use BASE+OFFSET addressing:
;   LDR DR, BaseR, offset6 - Load: DR = mem[BaseR + offset]
;   STR SR, BaseR, offset6 - Store: mem[BaseR + offset] = SR
;
; The base register holds an ADDRESS, and offset is -32 to +31.
;
; This is perfect for:
;   - Arrays (base = start, offset = index)
;   - Structs (base = start, offset = field position)
;   - Data far from your code
; ============================================================

        .ORIG x3000

; ============================================================
; MAIN PROGRAM
; ============================================================

        LEA R0, MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: Access Array Elements
; ------------------------------------------------------------
; We have an array of 5 numbers. Let's access them using LDR.

        LEA R0, MSG_EX1
        PUTS

        LEA R1, NUMBERS     ; R1 = base address of array
        
        ; Access NUMBERS[0] - offset 0
        LDR R2, R1, #0      ; R2 = mem[R1 + 0] = first element
        JSR PRINT_NUMBER
        
        ; Access NUMBERS[1] - offset 1
        LDR R2, R1, #1      ; R2 = mem[R1 + 1] = second element
        JSR PRINT_NUMBER
        
        ; Access NUMBERS[2] - offset 2
        LDR R2, R1, #2      ; R2 = third element
        JSR PRINT_NUMBER
        
        ; Access NUMBERS[3] - offset 3
        LDR R2, R1, #3      ; R2 = fourth element
        JSR PRINT_NUMBER
        
        ; Access NUMBERS[4] - offset 4
        LDR R2, R1, #4      ; R2 = fifth element
        JSR PRINT_NUMBER
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Iterate Through Array with Loop
; ------------------------------------------------------------
; Use the base register as a moving pointer through the array.

        LEA R0, MSG_EX2
        PUTS
        
        LEA R1, NUMBERS     ; R1 = pointer to current element
        LD R3, ARRAY_SIZE   ; R3 = 5 (counter)

ITER_LOOP
        LDR R2, R1, #0      ; Load current element (offset 0)
        JSR PRINT_NUMBER
        
        ADD R1, R1, #1      ; Move pointer to next element
        ADD R3, R3, #-1     ; Decrement counter
        BRp ITER_LOOP
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Store Values to Array
; ------------------------------------------------------------
; Let's fill an array with squares: 1, 4, 9, 16, 25

        LEA R0, MSG_EX3
        PUTS
        
        LEA R1, RESULTS     ; R1 = base of results array
        AND R2, R2, #0
        ADD R2, R2, #1      ; R2 = current number (1, 2, 3, 4, 5)
        AND R4, R4, #0      ; R4 = offset (0, 1, 2, 3, 4)

SQUARE_LOOP
        ; Calculate square (R2 * R2) using multiply subroutine
        ADD R0, R2, #0      ; R0 = R2
        ADD R5, R2, #0      ; R5 = R2 (save R2)
        
        ; Simple multiply: R0 = R2 * R2
        AND R3, R3, #0      ; R3 = accumulator
        ADD R6, R2, #0      ; R6 = counter = R2
SQ_MULT
        ADD R3, R3, R2      ; accumulator += R2
        ADD R6, R6, #-1
        BRp SQ_MULT
        ; R3 = R2 * R2
        
        ; Store the square using STR
        STR R3, R1, #0      ; mem[R1 + 0] = R3
        
        ; Print the result
        ADD R2, R3, #0      ; R2 = square for printing
        JSR PRINT_NUMBER
        
        ; Move to next
        ADD R1, R1, #1      ; Next position in results
        ADD R2, R5, #1      ; Next number (restore and increment)
        ADD R4, R4, #1      ; Increment offset tracker
        
        LD R6, NEG_FIVE
        ADD R6, R4, R6      ; Check if we've done 5
        BRn SQUARE_LOOP
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 4: Array Reversal
; ------------------------------------------------------------
; Reverse an array in place using LDR and STR.

        LEA R0, MSG_EX4
        PUTS
        
        ; Print original
        LEA R0, MSG_ORIG
        PUTS
        LEA R1, REV_ARRAY
        LD R3, REV_SIZE
PRINT_ORIG
        LDR R2, R1, #0
        JSR PRINT_NUMBER
        ADD R1, R1, #1
        ADD R3, R3, #-1
        BRp PRINT_ORIG
        LD R0, NEWLINE
        OUT
        
        ; Reverse: swap elements from both ends
        LEA R1, REV_ARRAY   ; R1 = left pointer (start)
        LEA R2, REV_ARRAY
        LD R3, REV_SIZE
        ADD R3, R3, #-1     ; R3 = size - 1
        ADD R2, R2, R3      ; R2 = right pointer (end)

REV_LOOP
        ; Check if pointers crossed
        NOT R3, R2
        ADD R3, R3, #1
        ADD R3, R1, R3      ; R3 = R1 - R2
        BRzp REV_DONE       ; If R1 >= R2, done
        
        ; Swap: temp = *left; *left = *right; *right = temp
        LDR R3, R1, #0      ; R3 = *left (temp)
        LDR R4, R2, #0      ; R4 = *right
        STR R4, R1, #0      ; *left = R4
        STR R3, R2, #0      ; *right = R3 (temp)
        
        ; Move pointers
        ADD R1, R1, #1      ; left++
        ADD R2, R2, #-1     ; right--
        BRnzp REV_LOOP

REV_DONE
        ; Print reversed
        LEA R0, MSG_REVERSED
        PUTS
        LEA R1, REV_ARRAY
        LD R3, REV_SIZE
PRINT_REV
        LDR R2, R1, #0
        JSR PRINT_NUMBER
        ADD R1, R1, #1
        ADD R3, R3, #-1
        BRp PRINT_REV
        LD R0, NEWLINE
        OUT

        HALT

; ============================================================
; SUBROUTINES
; ============================================================

; Print number in R2 (assumes 0-9)
PRINT_NUMBER
        LD R0, ASCII_0
        ADD R0, R2, R0
        OUT
        LD R0, SPACE
        OUT
        RET

; ============================================================
; DATA
; ============================================================
MSG_HEADER  .STRINGZ "=== Base+Offset Addressing ===\\n\\n"
MSG_EX1     .STRINGZ "Example 1 - Direct offset access:\\n"
MSG_EX2     .STRINGZ "Example 2 - Loop iteration:\\n"
MSG_EX3     .STRINGZ "Example 3 - Store squares:\\n"
MSG_EX4     .STRINGZ "Example 4 - Array reversal:\\n"
MSG_ORIG    .STRINGZ "Original: "
MSG_REVERSED .STRINGZ "Reversed: "

NUMBERS     .FILL #1        ; Array of 5 numbers
            .FILL #2
            .FILL #3
            .FILL #4
            .FILL #5

RESULTS     .BLKW #5        ; Space for 5 results

REV_ARRAY   .FILL #1        ; Array to reverse
            .FILL #2
            .FILL #3
            .FILL #4
            .FILL #5
            
ARRAY_SIZE  .FILL #5
REV_SIZE    .FILL #5
NEG_FIVE    .FILL #-5

ASCII_0     .FILL x30
SPACE       .FILL x20
NEWLINE     .FILL x0A

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. LDR DR, BaseR, offset6
;    - BaseR contains an ADDRESS
;    - offset is -32 to +31
;    - Loads from mem[BaseR + offset]
;
; 2. STR SR, BaseR, offset6
;    - Stores SR to mem[BaseR + offset]
;
; 3. ARRAY ACCESS PATTERNS:
;    
;    Fixed offset (random access):
;        LEA R1, ARRAY
;        LDR R0, R1, #3    ; Load ARRAY[3]
;    
;    Moving pointer (sequential):
;        LEA R1, ARRAY     ; R1 = pointer
;    LOOP:
;        LDR R0, R1, #0    ; Load *pointer
;        ADD R1, R1, #1    ; pointer++
;
; 4. USE CASES:
;    - Arrays: base = array start, offset = index
;    - Strings: iterate character by character
;    - Structs: base = struct start, offset = field
;
; 5. LD vs LDR:
;    - LD: PC-relative, uses label, limited range
;    - LDR: Base+offset, flexible, needs register setup
;
; PRACTICE:
; - Sum all elements in an array
; - Find the maximum element in an array
; - Copy one array to another
; - Implement a string length function
; ============================================================
`,
};

export default lesson;
