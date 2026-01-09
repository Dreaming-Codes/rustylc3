; Memory stress test
; Repeatedly reads and writes to memory locations
; Tests: memory bandwidth, load/store operations

.ORIG x3000

    LD R5, ITERATIONS   ; Number of iterations
    LEA R0, DATA_START  ; Pointer to data

MAIN_LOOP
    ; Write phase - write pattern to memory
    LEA R1, DATA_START
    LD R2, BLOCK_SIZE
    LD R3, PATTERN

WRITE_LOOP
    STR R3, R1, #0
    ADD R1, R1, #1
    ADD R2, R2, #-1
    BRp WRITE_LOOP

    ; Read phase - read and accumulate
    LEA R1, DATA_START
    LD R2, BLOCK_SIZE
    AND R4, R4, #0      ; Accumulator

READ_LOOP
    LDR R3, R1, #0
    ADD R4, R4, R3
    ADD R1, R1, #1
    ADD R2, R2, #-1
    BRp READ_LOOP

    ; Modify phase - increment each value
    LEA R1, DATA_START
    LD R2, BLOCK_SIZE

MODIFY_LOOP
    LDR R3, R1, #0
    ADD R3, R3, #1
    STR R3, R1, #0
    ADD R1, R1, #1
    ADD R2, R2, #-1
    BRp MODIFY_LOOP

    ADD R5, R5, #-1
    BRp MAIN_LOOP

    ; Output a character so lc3sim works in non-interactive mode
    LD R0, DONE_CHAR
    OUT
    HALT

DONE_CHAR .FILL x0021   ; '!'
ITERATIONS .FILL #500
BLOCK_SIZE .FILL #50
PATTERN .FILL xAAAA

DATA_START
    .BLKW #50

.END
