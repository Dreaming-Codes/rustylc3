import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-15',
  lessonNumber: 15,
  title: 'Indirect Addressing',
  description: 'Learn LDI and STI for accessing memory through pointers stored in memory.',
  objectives: [
    'Understand indirect addressing (pointers to pointers)',
    'Use LDI to load through a pointer in memory',
    'Use STI to store through a pointer in memory',
    'Implement simple data structures with pointers',
  ],
  newInstructions: ['LDI', 'STI'],
  category: 'memory',
  code: `; ============================================================
; LESSON 15: Indirect Addressing
; ============================================================
; Sometimes we need to access data whose address is stored
; in MEMORY, not in a register. This is INDIRECT addressing.
;
;   LDI DR, LABEL - DR = mem[mem[LABEL]]
;   STI SR, LABEL - mem[mem[LABEL]] = SR
;
; Think of it as: LABEL holds a POINTER to the actual data.
; ============================================================

        .ORIG x3000

        BRnzp START         ; Skip over data section

; ============================================================
; POINTERS & CONSTANTS
; ============================================================
PTR_MSG_HEADER  .FILL x4000
PTR_MSG_EX1     .FILL x4030
PTR_MSG_EX2     .FILL x4060
PTR_MSG_EX3     .FILL x4090
PTR_MSG_EX4     .FILL x40C0
PTR_MSG_LDI     .FILL x40E0
PTR_MSG_BEFORE  .FILL x4100
PTR_MSG_AFTER   .FILL x4120
PTR_MSG_CURRENT .FILL x4140
PTR_MSG_CHANGED .FILL x4170
PTR_MSG_ENDLIST .FILL x41A0

; Data pointers
PTR_TO_DATA     .FILL x4200     ; -> ACTUAL_DATA
PTR_TO_TARGET   .FILL x4202     ; -> TARGET_DATA
PTR_SELECTOR    .FILL x4206     ; Current selector
PTR_OPTION_B    .FILL x4205     ; Address of OPTION_B
PTR_SELECTOR_LOC .FILL x4206    ; Address of SELECTOR
PTR_NODE1       .FILL x4210     ; Linked list start

; Constants
STACK_BASE      .FILL xFE00
ASCII_0         .FILL x30
NEWLINE         .FILL x0A
ARROW           .FILL x2D       ; '-'
NEW_VALUE       .FILL #99

; ============================================================
; MAIN PROGRAM
; ============================================================

START
        LD R6, STACK_BASE
        LD R0, PTR_MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: Basic LDI
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX1
        PUTS

        ; LDI loads THROUGH the pointer
        LDI R2, PTR_TO_DATA     ; R2 = 42
        
        LD R0, PTR_MSG_LDI
        PUTS
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Basic STI
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX2
        PUTS
        
        ; Load original value
        LDI R1, PTR_TO_TARGET
        LD R0, PTR_MSG_BEFORE
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        ; Store new value through pointer
        LD R1, NEW_VALUE
        STI R1, PTR_TO_TARGET
        
        ; Verify change
        LDI R1, PTR_TO_TARGET
        LD R0, PTR_MSG_AFTER
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Changing Pointers
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX3
        PUTS
        
        ; Initially SELECTOR points to OPTION_A (11)
        ; LDI gives us the address stored in SELECTOR
        ; Then we use LDR to get the actual value
        LDI R1, PTR_SELECTOR    ; R1 = address of OPTION_A
        LDR R1, R1, #0          ; R1 = value at OPTION_A = 11
        LD R0, PTR_MSG_CURRENT
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        ; Change SELECTOR to point to OPTION_B
        LD R1, PTR_OPTION_B
        STI R1, PTR_SELECTOR_LOC
        
        ; Now SELECTOR contains address of OPTION_B
        LDI R1, PTR_SELECTOR    ; R1 = address of OPTION_B  
        LDR R1, R1, #0          ; R1 = value at OPTION_B = 22
        LD R0, PTR_MSG_CHANGED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 4: Linked List
; ------------------------------------------------------------
        LD R0, PTR_MSG_EX4
        PUTS
        
        LD R3, PTR_NODE1        ; R3 = first node address

TRAVERSE_LOOP
        LDR R2, R3, #0          ; value
        JSR PRINT_NUM
        
        LDR R3, R3, #1          ; next pointer
        
        ADD R3, R3, #0
        BRz TRAVERSE_DONE
        
        LD R0, ARROW
        OUT
        LD R0, ARROW
        OUT
        BRnzp TRAVERSE_LOOP

TRAVERSE_DONE
        LD R0, PTR_MSG_ENDLIST
        PUTS

        HALT

; ============================================================
; SUBROUTINES
; ============================================================

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
MSG_HEADER  .STRINGZ "=== Indirect Addressing ===\\n\\n"

        .ORIG x4030
MSG_EX1     .STRINGZ "Example 1 - LDI basics:\\n"

        .ORIG x4060
MSG_EX2     .STRINGZ "Example 2 - STI basics:\\n"

        .ORIG x4090
MSG_EX3     .STRINGZ "Example 3 - Pointer redirect:\\n"

        .ORIG x40C0
MSG_EX4     .STRINGZ "Example 4 - Linked list: "

        .ORIG x40E0
MSG_LDI     .STRINGZ "LDI loaded value: "

        .ORIG x4100
MSG_BEFORE  .STRINGZ "Before STI: "

        .ORIG x4120
MSG_AFTER   .STRINGZ "After STI:  "

        .ORIG x4140
MSG_CURRENT .STRINGZ "Option A value: "

        .ORIG x4170
MSG_CHANGED .STRINGZ "Option B value: "

        .ORIG x41A0
MSG_ENDLIST .STRINGZ " -> END\\n"

; Data section
        .ORIG x4200
ACTUAL_DATA     .FILL #42       ; x4200
PTR_DATA_ADDR   .FILL x4200     ; x4201
TARGET_DATA     .FILL #10       ; x4202
PTR_TARGET_ADDR .FILL x4202     ; x4203
OPTION_A        .FILL #11       ; x4204
OPTION_B        .FILL #22       ; x4205
SELECTOR        .FILL x4204     ; x4206 -> OPTION_A

; Linked list
        .ORIG x4210
NODE1           .FILL #1        ; x4210: value
                .FILL x4212     ; x4211: next
NODE2           .FILL #2        ; x4212: value
                .FILL x4214     ; x4213: next
NODE3           .FILL #3        ; x4214: value
                .FILL #0        ; x4215: NULL

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; LDI DR, LABEL: DR = mem[mem[LABEL]]
; STI SR, LABEL: mem[mem[LABEL]] = SR
;
; Use cases:
; - Accessing data through memory pointers
; - Dynamic data structures
; - Indirection for flexibility
; ============================================================
`,
};

export default lesson;
