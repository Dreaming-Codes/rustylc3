; Simple Prime Checker
; Checks if numbers from 2 to N are prime using trial division
; Tests: nested loops, division simulation, conditionals

.ORIG x3000

    LD R0, START_NUM    ; Start checking from 2
    LD R5, END_NUM      ; Check up to this number

NEXT_NUMBER
    ADD R1, R0, #0      ; R1 = current number to check
    JSR IS_PRIME        ; Check if R1 is prime, result in R2
    
    ADD R0, R0, #1      ; Next number
    NOT R3, R0
    ADD R3, R3, #1
    ADD R3, R5, R3      ; R3 = END_NUM - current
    BRp NEXT_NUMBER

    ; Output a character so lc3sim works in non-interactive mode
    LD R0, DONE_CHAR
    OUT
    HALT

DONE_CHAR .FILL x0021   ; '!'

; IS_PRIME subroutine
; Input: R1 = number to check
; Output: R2 = 1 if prime, 0 if not
IS_PRIME
    ; Check if less than 2
    ADD R2, R1, #-2
    BRn NOT_PRIME
    
    ; Check divisibility from 2 to sqrt(n) approximation
    AND R3, R3, #0
    ADD R3, R3, #2      ; R3 = divisor starting at 2

DIV_LOOP
    ; Check if divisor * divisor > number
    ADD R4, R3, #0      ; R4 = divisor
    AND R6, R6, #0      ; R6 = divisor^2 accumulator
    
SQUARE_LOOP
    ADD R6, R6, R3
    ADD R4, R4, #-1
    BRp SQUARE_LOOP
    
    ; Compare R6 (divisor^2) with R1 (number)
    NOT R4, R1
    ADD R4, R4, #1
    ADD R4, R6, R4      ; R4 = divisor^2 - number
    BRp IS_PRIME_YES    ; divisor^2 > number, it's prime
    
    ; Check if number is divisible by divisor
    ADD R4, R1, #0      ; R4 = number
    
MOD_LOOP
    NOT R6, R3
    ADD R6, R6, #1
    ADD R4, R4, R6      ; R4 -= divisor
    BRp MOD_LOOP
    BRz NOT_PRIME       ; Divisible, not prime
    
    ADD R3, R3, #1      ; Next divisor
    BR DIV_LOOP

IS_PRIME_YES
    AND R2, R2, #0
    ADD R2, R2, #1
    RET

NOT_PRIME
    AND R2, R2, #0
    RET

START_NUM .FILL #2
END_NUM .FILL #500

.END
