; Nested loops stress test
; Three levels of nested loops
; Tests: branch prediction, loop overhead

.ORIG x3000

    LD R5, OUTER_COUNT  ; Outer loop counter
    AND R0, R0, #0      ; R0 = accumulator

OUTER
    LD R4, MIDDLE_COUNT ; Middle loop counter

MIDDLE
    LD R3, INNER_COUNT  ; Inner loop counter

INNER
    ADD R0, R0, #1      ; Increment accumulator
    ADD R3, R3, #-1
    BRp INNER

    ADD R4, R4, #-1
    BRp MIDDLE

    ADD R5, R5, #-1
    BRp OUTER

    ; Output a character so lc3sim works in non-interactive mode
    LD R0, DONE_CHAR
    OUT
    HALT

DONE_CHAR .FILL x0021  ; '!'

OUTER_COUNT .FILL #100
MIDDLE_COUNT .FILL #100
INNER_COUNT .FILL #100

.END
