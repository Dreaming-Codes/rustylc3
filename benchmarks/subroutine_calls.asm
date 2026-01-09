; Subroutine call stress test
; Tests function call overhead, stack operations
; Recursive-like deep call chain

.ORIG x3000

    LD R6, STACK_PTR    ; Initialize stack pointer
    LD R5, CALL_COUNT   ; Number of call sequences

MAIN_LOOP
    AND R0, R0, #0      ; Reset accumulator
    JSR LEVEL1
    
    ADD R5, R5, #-1
    BRp MAIN_LOOP

    HALT

; Level 1 subroutine
LEVEL1
    ADD R6, R6, #-1
    STR R7, R6, #0      ; Save return address
    
    ADD R0, R0, #1
    JSR LEVEL2
    ADD R0, R0, #1
    
    LDR R7, R6, #0
    ADD R6, R6, #1
    RET

; Level 2 subroutine
LEVEL2
    ADD R6, R6, #-1
    STR R7, R6, #0
    
    ADD R0, R0, #1
    JSR LEVEL3
    ADD R0, R0, #1
    
    LDR R7, R6, #0
    ADD R6, R6, #1
    RET

; Level 3 subroutine
LEVEL3
    ADD R6, R6, #-1
    STR R7, R6, #0
    
    ADD R0, R0, #1
    JSR LEVEL4
    ADD R0, R0, #1
    
    LDR R7, R6, #0
    ADD R6, R6, #1
    RET

; Level 4 subroutine
LEVEL4
    ADD R6, R6, #-1
    STR R7, R6, #0
    
    ADD R0, R0, #1
    JSR COMPUTE
    ADD R0, R0, #1
    
    LDR R7, R6, #0
    ADD R6, R6, #1
    RET

; Compute subroutine - does some work
COMPUTE
    ADD R6, R6, #-1
    STR R7, R6, #0
    ADD R6, R6, #-1
    STR R1, R6, #0
    
    LD R1, WORK_COUNT
WORK_LOOP
    ADD R0, R0, #1
    ADD R1, R1, #-1
    BRp WORK_LOOP
    
    LDR R1, R6, #0
    ADD R6, R6, #1
    LDR R7, R6, #0
    ADD R6, R6, #1
    RET

CALL_COUNT .FILL #2000
WORK_COUNT .FILL #20
STACK_PTR .FILL xFE00

.END
