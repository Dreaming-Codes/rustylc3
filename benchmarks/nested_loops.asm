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

    HALT

OUTER_COUNT .FILL #50
MIDDLE_COUNT .FILL #50
INNER_COUNT .FILL #50

.END
