; Fibonacci sequence calculator
; Calculates Fibonacci numbers iteratively
; Tests: loops, arithmetic, register manipulation

.ORIG x3000

    AND R0, R0, #0      ; R0 = fib(n-2) = 0
    AND R1, R1, #0
    ADD R1, R1, #1      ; R1 = fib(n-1) = 1
    LD R3, COUNT        ; R3 = number of iterations

FIB_LOOP
    ADD R2, R0, R1      ; R2 = fib(n) = fib(n-1) + fib(n-2)
    ADD R0, R1, #0      ; R0 = fib(n-1)
    ADD R1, R2, #0      ; R1 = fib(n)
    ADD R3, R3, #-1     ; decrement counter
    BRp FIB_LOOP        ; continue if counter > 0

    HALT

COUNT .FILL #1000       ; Calculate 1000 iterations

.END
