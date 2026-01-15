import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-10',
  lessonNumber: 10,
  title: 'User Input',
  description: 'Learn how to read input from the user with GETC and IN trap routines.',
  objectives: [
    'Read a single character with GETC',
    'Read with a prompt using IN',
    'Store user input for processing',
    'Understand ASCII values of input characters',
  ],
  newInstructions: ['GETC', 'IN'],
  category: 'io',
  code: `; ============================================================
; LESSON 10: User Input
; ============================================================
; Programs become interactive when they can read user input!
; LC-3 provides two ways to read a character:
;
;   GETC - Read character into R0 (no echo, no prompt)
;   IN   - Prompt user, read character into R0, echo it
;
; Both read ONE character and store its ASCII code in R0.
;
; In this lesson, you'll learn:
; - How to read characters from the keyboard
; - The difference between GETC and IN
; - How to process user input
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; EXAMPLE 1: Simple Character Read with GETC
; ------------------------------------------------------------
; GETC reads one character silently (no prompt, no echo).
; The ASCII value goes into R0.

        LEA R0, PROMPT1
        PUTS                ; Print our own prompt

        GETC                ; Wait for user to type a character
                            ; Character's ASCII value is now in R0
        
        ; Save the character before we overwrite R0
        ADD R1, R0, #0      ; R1 = copy of input character
        
        ; Now echo it ourselves (GETC doesn't echo)
        OUT                 ; Print the character user typed
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Read with Prompt using IN
; ------------------------------------------------------------
; IN does three things:
;   1. Prints "Input a character> " prompt
;   2. Waits for input
;   3. Echoes the character
; Much more convenient for simple input!

        IN                  ; Prompts, reads, and echoes
        ADD R2, R0, #0      ; Save character in R2
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Process User Input
; ------------------------------------------------------------
; Let's ask for a digit (0-9) and convert it to a number.
; ASCII '0' = x30 (48), '9' = x39 (57)
; To convert: subtract '0' from the ASCII value

        LEA R0, PROMPT2
        PUTS
        
        GETC                ; Read a digit character
        OUT                 ; Echo it
        ADD R3, R0, #0      ; Save in R3
        
        LD R0, NEWLINE
        OUT
        
        ; Convert ASCII to number
        ; '0' (x30) -> 0, '1' (x31) -> 1, etc.
        LD R4, NEG_ASCII_0  ; R4 = -48 = -'0'
        ADD R3, R3, R4      ; R3 = digit value (0-9)
        
        ; R3 now contains the actual number!
        ; Let's double it and print the result
        ADD R3, R3, R3      ; R3 = R3 * 2
        
        LEA R0, RESULT_MSG
        PUTS
        
        ; Convert number back to ASCII for printing
        LD R4, ASCII_0
        ADD R0, R3, R4      ; R0 = number + '0' = ASCII digit
        OUT
        
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 4: Yes/No Question
; ------------------------------------------------------------
        LEA R0, QUESTION
        PUTS
        
        GETC                ; Read y or n
        OUT                 ; Echo it
        ADD R1, R0, #0      ; Save response
        
        LD R0, NEWLINE
        OUT
        
        ; Check if user typed 'y' or 'Y'
        LD R2, CHAR_Y_LOWER
        NOT R2, R2
        ADD R2, R2, #1      ; R2 = -'y'
        ADD R3, R1, R2      ; R3 = input - 'y'
        BRz ANSWERED_YES
        
        LD R2, CHAR_Y_UPPER
        NOT R2, R2
        ADD R2, R2, #1      ; R2 = -'Y'
        ADD R3, R1, R2
        BRz ANSWERED_YES
        
        ; Not 'y' or 'Y', assume no
        LEA R0, MSG_NO
        PUTS
        BRnzp END_QUESTION

ANSWERED_YES
        LEA R0, MSG_YES
        PUTS

END_QUESTION

        HALT

; ------------------------------------------------------------
; DATA
; ------------------------------------------------------------
PROMPT1     .STRINGZ "Type a character: "
PROMPT2     .STRINGZ "Enter a digit (0-9): "
RESULT_MSG  .STRINGZ "Doubled: "
QUESTION    .STRINGZ "Do you like LC-3? (y/n): "
MSG_YES     .STRINGZ "Great! LC-3 likes you too!\\n"
MSG_NO      .STRINGZ "That's okay, it grows on you!\\n"

NEWLINE     .FILL x0A
ASCII_0     .FILL x30       ; '0'
NEG_ASCII_0 .FILL xFFD0     ; -48 = -'0'
CHAR_Y_LOWER .FILL x79      ; 'y'
CHAR_Y_UPPER .FILL x59      ; 'Y'

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. GETC - Silent read
;    - No prompt displayed
;    - No echo (you must OUT if you want to show it)
;    - Result in R0
;
; 2. IN - Prompted read
;    - Shows "Input a character> "
;    - Automatically echoes the character
;    - Result in R0
;
; 3. ASCII CONVERSION:
;    - Character to number: subtract '0' (x30)
;    - Number to character: add '0' (x30)
;    - Only works for single digits 0-9!
;
; 4. INPUT PROCESSING PATTERN:
;    (print prompt)
;    GETC or IN
;    ADD Rx, R0, #0     ; Save input before R0 is overwritten
;    (process Rx)
;
; 5. CHARACTER COMPARISON:
;    - Load the target character's negative
;    - Add to input
;    - BRz if they match
;
; PRACTICE:
; - Read two digits and print their sum
; - Make a simple calculator: read digit, operator (+/-), digit
; - Create a password checker: read chars until correct password
; ============================================================
`,
};

export default lesson;
