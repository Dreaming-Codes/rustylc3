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
;                   First reads the address from LABEL,
;                   then reads the value at that address.
;
;   STI SR, LABEL - mem[mem[LABEL]] = SR
;                   First reads the address from LABEL,
;                   then stores SR at that address.
;
; Think of it as: LABEL holds a POINTER to the actual data.
; ============================================================

        .ORIG x3000

; ============================================================
; MAIN PROGRAM
; ============================================================

        LEA R0, MSG_HEADER
        PUTS

; ------------------------------------------------------------
; EXAMPLE 1: Basic LDI - Loading Through a Pointer
; ------------------------------------------------------------
; ACTUAL_DATA contains our value (42).
; PTR_TO_DATA contains the ADDRESS of ACTUAL_DATA.
; LDI reads the address from PTR_TO_DATA, then reads from there.

        LEA R0, MSG_EX1
        PUTS

        ; Using regular LD, we'd load the POINTER itself
        LD R1, PTR_TO_DATA  ; R1 = address of ACTUAL_DATA (not 42!)
        
        ; Using LDI, we load THROUGH the pointer
        LDI R2, PTR_TO_DATA ; R2 = mem[mem[PTR_TO_DATA]] = 42!
        
        LEA R0, MSG_LD
        PUTS
        ; Print R1 (the address, in hex would be around x30xx)
        ; For demo, just show it's different from 42
        
        LEA R0, MSG_LDI
        PUTS
        ; Print R2 (should be 42)
        ADD R2, R2, #0      ; Move to R2 for print
        JSR PRINT_NUM       ; Print 42
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Basic STI - Storing Through a Pointer
; ------------------------------------------------------------
; Let's modify data at a location pointed to by another location.

        LEA R0, MSG_EX2
        PUTS
        
        ; Load original value
        LDI R1, PTR_TO_TARGET   ; R1 = current value at target
        LEA R0, MSG_BEFORE
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        ; Store new value (99) through the pointer
        LD R1, NEW_VALUE        ; R1 = 99
        STI R1, PTR_TO_TARGET   ; mem[mem[PTR_TO_TARGET]] = 99
        
        ; Verify it changed
        LDI R1, PTR_TO_TARGET   ; Load it back
        LEA R0, MSG_AFTER
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Changing Which Data We Access
; ------------------------------------------------------------
; By changing the pointer, we can access different data!

        LEA R0, MSG_EX3
        PUTS
        
        ; Initially SELECTOR points to OPTION_A
        LDI R1, SELECTOR
        LEA R0, MSG_CURRENT
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        
        ; Change SELECTOR to point to OPTION_B
        LEA R1, OPTION_B        ; R1 = address of OPTION_B
        ST R1, SELECTOR         ; SELECTOR now points to OPTION_B
        
        ; Now LDI gives us OPTION_B's value!
        LDI R1, SELECTOR
        LEA R0, MSG_CHANGED
        PUTS
        ADD R2, R1, #0
        JSR PRINT_NUM
        LD R0, NEWLINE
        OUT
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 4: Simple Linked Structure
; ------------------------------------------------------------
; A very simple linked list! Each node has:
;   - A value
;   - A pointer to the next node (or 0 for end)

        LEA R0, MSG_EX4
        PUTS
        
        LEA R3, NODE1       ; R3 = current node pointer

TRAVERSE_LOOP
        ; Load value from current node (offset 0)
        LDR R2, R3, #0      ; R2 = node->value
        JSR PRINT_NUM
        
        ; Load pointer to next node (offset 1)
        LDR R3, R3, #1      ; R3 = node->next
        
        ; Check if next is null (0)
        ADD R3, R3, #0
        BRz TRAVERSE_DONE
        
        LD R0, ARROW
        OUT
        LD R0, ARROW
        OUT
        BRnzp TRAVERSE_LOOP

TRAVERSE_DONE
        LEA R0, MSG_END_LIST
        PUTS

        HALT

; ============================================================
; SUBROUTINES
; ============================================================

; Print number in R2 (handles 0-99)
PRINT_NUM
        ; Handle tens
        AND R3, R3, #0      ; tens counter
PN_TENS
        ADD R4, R2, #-10
        BRn PN_ONES
        ADD R2, R4, #0      ; R2 -= 10
        ADD R3, R3, #1      ; tens++
        BRnzp PN_TENS
PN_ONES
        ; Print tens if non-zero
        ADD R3, R3, #0
        BRz PN_SKIP_TENS
        LD R0, ASCII_0
        ADD R0, R3, R0
        OUT
PN_SKIP_TENS
        ; Print ones
        LD R0, ASCII_0
        ADD R0, R2, R0
        OUT
        RET

; ============================================================
; DATA
; ============================================================
MSG_HEADER  .STRINGZ "=== Indirect Addressing ===\n\n"
MSG_EX1     .STRINGZ "Example 1 - LDI basics:\n"
MSG_EX2     .STRINGZ "Example 2 - STI basics:\n"
MSG_EX3     .STRINGZ "Example 3 - Changing pointers:\n"
MSG_EX4     .STRINGZ "Example 4 - Linked list: "

MSG_LD      .STRINGZ "LD loads the address (pointer)\n"
MSG_LDI     .STRINGZ "LDI loads the VALUE at that address: "
MSG_BEFORE  .STRINGZ "Before STI: "
MSG_AFTER   .STRINGZ "After STI:  "
MSG_CURRENT .STRINGZ "Via selector (Option A): "
MSG_CHANGED .STRINGZ "Via selector (Option B): "
MSG_END_LIST .STRINGZ " -> END\n"

; Pointer example data
ACTUAL_DATA     .FILL #42
PTR_TO_DATA     .FILL ACTUAL_DATA   ; Points to ACTUAL_DATA

TARGET_DATA     .FILL #10           ; Will be changed
PTR_TO_TARGET   .FILL TARGET_DATA   ; Points to TARGET_DATA
NEW_VALUE       .FILL #99

; Selector example
OPTION_A        .FILL #11
OPTION_B        .FILL #22
SELECTOR        .FILL OPTION_A      ; Currently points to OPTION_A

; Linked list: value, next_pointer
NODE1           .FILL #1            ; value
                .FILL NODE2         ; next -> NODE2
NODE2           .FILL #2            ; value
                .FILL NODE3         ; next -> NODE3
NODE3           .FILL #3            ; value
                .FILL #0            ; next -> NULL (end of list)

ASCII_0         .FILL x30
NEWLINE         .FILL x0A
ARROW           .FILL x2D           ; '-'

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. LDI DR, LABEL (Load Indirect)
;    - LABEL contains an ADDRESS (pointer)
;    - LDI reads that address, then reads from THAT location
;    - DR = mem[mem[LABEL]]
;
; 2. STI SR, LABEL (Store Indirect)
;    - LABEL contains an ADDRESS (pointer)
;    - STI reads that address, then stores to THAT location
;    - mem[mem[LABEL]] = SR
;
; 3. COMPARISON:
;    LD  R0, X   ; R0 = mem[X] (direct)
;    LDI R0, X   ; R0 = mem[mem[X]] (indirect)
;    LDR R0,R1,0 ; R0 = mem[R1+0] (base+offset)
;
; 4. USE CASES:
;    - Accessing data through pointers in memory
;    - Implementing dynamic data structures
;    - Accessing memory-mapped I/O
;    - When the actual address is computed/stored elsewhere
;
; 5. LINKED STRUCTURES:
;    Each node stores data AND a pointer to the next node.
;    Traverse by following the pointers until NULL (0).
;
; PRACTICE:
; - Add more nodes to the linked list
; - Create a function that counts linked list length
; - Implement a doubly-linked list (prev and next pointers)
; ============================================================
`,
};

export default lesson;
