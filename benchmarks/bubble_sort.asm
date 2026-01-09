; Bubble Sort implementation
; Sorts an array of 20 numbers repeatedly
; Tests: nested loops, memory access, comparisons

.ORIG x3000

    LD R6, REPEAT_COUNT ; Number of times to repeat sorting

REPEAT_LOOP
    ; Reset array to unsorted state each iteration
    LEA R0, ARRAY       ; R0 = pointer to array
    LD R1, SIZE         ; R1 = array size
    ADD R1, R1, #-1     ; R1 = size - 1 (outer loop count)

OUTER_LOOP
    ADD R2, R1, #0      ; R2 = inner loop counter
    LEA R0, ARRAY       ; Reset array pointer

INNER_LOOP
    LDR R3, R0, #0      ; R3 = array[i]
    LDR R4, R0, #1      ; R4 = array[i+1]
    
    ; Compare R3 and R4 (if R3 > R4, swap)
    NOT R5, R4
    ADD R5, R5, #1      ; R5 = -array[i+1]
    ADD R5, R3, R5      ; R5 = array[i] - array[i+1]
    BRnz NO_SWAP        ; if array[i] <= array[i+1], no swap
    
    ; Swap
    STR R4, R0, #0      ; array[i] = R4
    STR R3, R0, #1      ; array[i+1] = R3

NO_SWAP
    ADD R0, R0, #1      ; move to next element
    ADD R2, R2, #-1     ; decrement inner counter
    BRp INNER_LOOP

    ADD R1, R1, #-1     ; decrement outer counter
    BRp OUTER_LOOP

    ADD R6, R6, #-1     ; decrement repeat counter
    BRp REPEAT_LOOP

    ; Output a character so lc3sim works in non-interactive mode
    LD R0, DONE_CHAR
    OUT
    HALT

REPEAT_COUNT .FILL #100
SIZE .FILL #20
DONE_CHAR .FILL x0021   ; '!'

ARRAY
    .FILL #89
    .FILL #12
    .FILL #45
    .FILL #67
    .FILL #23
    .FILL #91
    .FILL #34
    .FILL #56
    .FILL #78
    .FILL #10
    .FILL #99
    .FILL #21
    .FILL #43
    .FILL #65
    .FILL #87
    .FILL #32
    .FILL #54
    .FILL #76
    .FILL #98
    .FILL #11

.END
