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

        BRnzp START         ; Skip over data section

; ============================================================
; POINTERS TO DATA SEGMENT
; ============================================================
PTR_NUMBERS     .FILL x4000     ; Array of 5 numbers
PTR_RESULTS     .FILL x4010     ; Space for results
PTR_REV_ARRAY   .FILL x4020     ; Array to reverse
PTR_MSG_HEADER  .FILL x4100
PTR_MSG_EX1     .FILL x4130
PTR_MSG_EX2     .FILL x4160
PTR_MSG_EX3     .FILL x4190
PTR_MSG_EX4     .FILL x41C0
PTR_MSG_ORIG    .FILL x41F0
PTR_MSG_REV     .FILL x4200

; Constants (close to code)
ARRAY_SIZE  .FILL #5
REV_SIZE    .FILL #5
NEG_FIVE    .FILL #-5
ASCII_0     .FILL x30
SPACE       .FILL x20
NEWLINE     .FILL x0A

; ============================================================
; MAIN PROGRAM
; ============================================================

START   
        LD R0, PTR_MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: Access Array Elements with Fixed Offsets
; ------------------------------------------------------------
; We have an array of 5 numbers. Let's access them using LDR.

        LD R0, PTR_MSG_EX1
        PUTS

        LD R1, PTR_NUMBERS  ; R1 = base address of array
        
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

        LD R0, PTR_MSG_EX2
        PUTS
        
        LD R1, PTR_NUMBERS  ; R1 = pointer to current element
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

        LD R0, PTR_MSG_EX3
        PUTS
        
        LD R1, PTR_RESULTS  ; R1 = base of results array
        AND R2, R2, #0
        ADD R2, R2, #1      ; R2 = current number (1, 2, 3, 4, 5)
        AND R4, R4, #0      ; R4 = offset counter

SQUARE_LOOP
        ; Calculate square: R3 = R2 * R2
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
        ADD R5, R2, #0      ; Save R2
        ADD R2, R3, #0      ; R2 = square for printing
        JSR PRINT_NUMBER
        
        ; Move to next
        ADD R1, R1, #1      ; Next position in results
        ADD R2, R5, #1      ; Next number (R2 = old R2 + 1)
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

        LD R0, PTR_MSG_EX4
        PUTS
        
        ; Print original array
        LD R0, PTR_MSG_ORIG
        PUTS
        LD R1, PTR_REV_ARRAY
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
        LD R1, PTR_REV_ARRAY    ; R1 = left pointer (start)
        LD R2, PTR_REV_ARRAY
        LD R3, REV_SIZE
        ADD R3, R3, #-1         ; R3 = size - 1
        ADD R2, R2, R3          ; R2 = right pointer (end)

REV_LOOP
        ; Check if pointers crossed (R1 >= R2 means done)
        NOT R3, R2
        ADD R3, R3, #1
        ADD R3, R1, R3      ; R3 = R1 - R2
        BRzp REV_DONE       ; If R1 >= R2, done
        
        ; Swap: temp = *left; *left = *right; *right = temp
        LDR R3, R1, #0      ; R3 = *left (temp)
        LDR R4, R2, #0      ; R4 = *right
        STR R4, R1, #0      ; *left = R4
        STR R3, R2, #0      ; *right = R3 (temp)
        
        ; Move pointers toward center
        ADD R1, R1, #1      ; left++
        ADD R2, R2, #-1     ; right--
        BRnzp REV_LOOP

REV_DONE
        ; Print reversed array
        LD R0, PTR_MSG_REV
        PUTS
        LD R1, PTR_REV_ARRAY
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

; Print number in R2 (0-99)
PRINT_NUMBER
        ST R7, PN_SAVE_R7
        ST R3, PN_SAVE_R3
        ST R4, PN_SAVE_R4
        
        AND R3, R3, #0      ; R3 = tens digit counter
PN_TENS
        ADD R4, R2, #-10
        BRn PN_PRINT
        ADD R2, R4, #0      ; R2 -= 10
        ADD R3, R3, #1      ; tens++
        BRnzp PN_TENS
        
PN_PRINT
        ; Print tens if non-zero
        ADD R3, R3, #0
        BRz PN_ONES
        LD R0, ASCII_0
        ADD R0, R3, R0
        OUT
        
PN_ONES
        LD R0, ASCII_0
        ADD R0, R2, R0
        OUT
        LD R0, SPACE
        OUT
        
        LD R4, PN_SAVE_R4
        LD R3, PN_SAVE_R3
        LD R7, PN_SAVE_R7
        RET

PN_SAVE_R7  .BLKW 1
PN_SAVE_R3  .BLKW 1
PN_SAVE_R4  .BLKW 1

; ============================================================
; DATA SEGMENT
; ============================================================

        .ORIG x4000

; Arrays at x4000
NUMBERS     .FILL #1        ; x4000
            .FILL #2        ; x4001
            .FILL #3        ; x4002
            .FILL #4        ; x4003
            .FILL #5        ; x4004

        .BLKW 11            ; Padding to x4010

RESULTS     .BLKW #5        ; x4010-x4014: Space for squares

        .BLKW 11            ; Padding to x4020

REV_ARRAY   .FILL #1        ; x4020: Array to reverse
            .FILL #2
            .FILL #3
            .FILL #4
            .FILL #5

; ============================================================
; STRING SEGMENT
; ============================================================

        .ORIG x4100
MSG_HEADER  .STRINGZ "=== Base+Offset Addressing ===\\n\\n"

        .ORIG x4130
MSG_EX1     .STRINGZ "Ex 1 - Fixed offsets: "

        .ORIG x4160
MSG_EX2     .STRINGZ "Ex 2 - Loop iteration: "

        .ORIG x4190
MSG_EX3     .STRINGZ "Ex 3 - Store squares: "

        .ORIG x41C0
MSG_EX4     .STRINGZ "Ex 4 - Array reversal:\\n"

        .ORIG x41F0
MSG_ORIG    .STRINGZ "Original: "

        .ORIG x4200
MSG_REV     .STRINGZ "Reversed: "

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
;        LD R1, ARRAY_PTR  ; R1 = address of array
;        LDR R0, R1, #3    ; Load ARRAY[3]
;    
;    Moving pointer (sequential):
;        LD R1, ARRAY_PTR  ; R1 = pointer
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
