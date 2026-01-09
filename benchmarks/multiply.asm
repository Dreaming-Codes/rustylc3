; Multiplication benchmark
; Performs multiple multiplications using repeated addition
; Tests: subroutine calls, stack operations, heavy arithmetic

.ORIG x3000

    LD R6, STACK_PTR    ; Initialize stack pointer
    
    ; Perform 50 multiplications
    LD R5, MULT_COUNT

MULT_LOOP
    LD R0, NUM_A        ; First number
    LD R1, NUM_B        ; Second number
    JSR MULTIPLY        ; Result in R2
    
    ADD R5, R5, #-1
    BRp MULT_LOOP

    HALT

; MULTIPLY subroutine
; Input: R0, R1
; Output: R2 = R0 * R1
; Uses: R3 as temp
MULTIPLY
    ; Save registers
    ADD R6, R6, #-1
    STR R7, R6, #0
    ADD R6, R6, #-1
    STR R3, R6, #0

    AND R2, R2, #0      ; R2 = result = 0
    ADD R3, R1, #0      ; R3 = counter = R1

    ADD R3, R3, #0      ; Check if counter is 0
    BRz MULT_DONE

MULT_ADD
    ADD R2, R2, R0      ; result += R0
    ADD R3, R3, #-1     ; counter--
    BRp MULT_ADD

MULT_DONE
    ; Restore registers
    LDR R3, R6, #0
    ADD R6, R6, #1
    LDR R7, R6, #0
    ADD R6, R6, #1
    RET

MULT_COUNT .FILL #500
NUM_A .FILL #123
NUM_B .FILL #45
STACK_PTR .FILL xFE00

.END
