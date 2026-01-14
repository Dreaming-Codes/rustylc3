import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-11',
  lessonNumber: 11,
  title: 'Echo Program',
  description: 'Combine input and output to create an interactive program that processes user text.',
  objectives: [
    'Build a complete input-process-output program',
    'Handle multiple characters in a loop',
    'Detect special characters (Enter key)',
    'Create a text transformation program',
  ],
  newInstructions: ['Combined I/O patterns'],
  category: 'io',
  code: `; ============================================================
; LESSON 11: Echo Program
; ============================================================
; Now let's combine what we know to build interactive programs!
; We'll read input, process it, and produce output - the heart
; of most programs.
;
; In this lesson, you'll learn:
; - How to read multiple characters
; - How to detect the Enter key (newline)
; - How to transform text (like uppercase conversion)
; - Complete input-process-output programs
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; EXAMPLE 1: Simple Echo (until Enter)
; ------------------------------------------------------------
; Read and echo characters until user presses Enter.

        LEA R0, MSG1
        PUTS

ECHO_LOOP
        GETC                ; Read a character
        OUT                 ; Echo it immediately
        
        ; Check if it's Enter (newline, ASCII x0A)
        LD R1, NEG_NEWLINE
        ADD R1, R0, R1      ; R1 = char - newline
        BRz ECHO_DONE       ; If zero, user pressed Enter
        
        BRnzp ECHO_LOOP     ; Otherwise, keep reading

ECHO_DONE
        ; User pressed Enter, move to next example
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Uppercase Converter
; ------------------------------------------------------------
; Read text and convert lowercase to uppercase.
; ASCII: 'a' = x61, 'z' = x7A, 'A' = x41, 'Z' = x5A
; To convert lowercase to uppercase: subtract x20 (32)
; 'a' (97) - 32 = 'A' (65)

        LEA R0, MSG2
        PUTS

UPPER_LOOP
        GETC                ; Read character
        ADD R1, R0, #0      ; Save original in R1
        
        ; Check for Enter
        LD R2, NEG_NEWLINE
        ADD R2, R0, R2
        BRz UPPER_DONE
        
        ; Check if it's a lowercase letter (>= 'a' and <= 'z')
        ; First check: char >= 'a' (x61 = 97)
        LD R2, NEG_LOWER_A
        ADD R2, R0, R2      ; R2 = char - 'a'
        BRn NOT_LOWER       ; If negative, char < 'a'
        
        ; Second check: char <= 'z' (x7A = 122)
        LD R2, NEG_LOWER_Z_PLUS1
        ADD R2, R0, R2      ; R2 = char - ('z' + 1)
        BRzp NOT_LOWER      ; If >= 0, char > 'z'
        
        ; It's lowercase! Convert to uppercase
        LD R2, UPPER_OFFSET ; R2 = -32
        ADD R0, R0, R2      ; R0 = char - 32 = uppercase
        OUT
        BRnzp UPPER_LOOP

NOT_LOWER
        ; Not lowercase, just echo original
        ADD R0, R1, #0      ; Restore original char
        OUT
        BRnzp UPPER_LOOP

UPPER_DONE
        LD R0, NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Character Counter
; ------------------------------------------------------------
; Count how many characters user types (excluding Enter).

        LEA R0, MSG3
        PUTS
        
        AND R3, R3, #0      ; R3 = counter = 0

COUNT_LOOP
        GETC                ; Read character
        OUT                 ; Echo it
        
        ; Check for Enter
        LD R1, NEG_NEWLINE
        ADD R1, R0, R1
        BRz COUNT_DONE
        
        ADD R3, R3, #1      ; Increment counter
        BRnzp COUNT_LOOP

COUNT_DONE
        LD R0, NEWLINE
        OUT
        
        ; Print the count
        LEA R0, COUNT_MSG
        PUTS
        
        ; Convert count to ASCII (assumes count < 10 for simplicity)
        LD R0, ASCII_0
        ADD R0, R3, R0      ; R0 = count + '0'
        OUT
        
        LEA R0, CHARS_MSG
        PUTS

; ------------------------------------------------------------
; EXAMPLE 4: ROT13 Cipher (Advanced!)
; ------------------------------------------------------------
; ROT13 shifts each letter by 13 positions.
; A->N, B->O, ..., M->Z, N->A, ..., Z->M
; It's its own inverse: apply twice = original!

        LEA R0, MSG4
        PUTS

ROT13_LOOP
        GETC
        ADD R1, R0, #0      ; Save original
        
        ; Check for Enter
        LD R2, NEG_NEWLINE
        ADD R2, R0, R2
        BRz ROT13_DONE
        
        ; Check if uppercase A-Z
        LD R2, NEG_UPPER_A
        ADD R2, R0, R2
        BRn ROT13_NOT_UPPER
        LD R2, NEG_UPPER_Z_PLUS1
        ADD R2, R0, R2
        BRzp ROT13_NOT_UPPER
        
        ; Uppercase letter: apply ROT13
        ADD R0, R0, #13     ; Shift by 13
        ; Check if we went past 'Z'
        LD R2, NEG_UPPER_Z_PLUS1
        ADD R2, R0, R2
        BRn ROT13_OUTPUT    ; Still valid, output it
        ADD R0, R0, #-13    ; Wrapped, go back
        ADD R0, R0, #-13    ; ... by 26 total
        BRnzp ROT13_OUTPUT

ROT13_NOT_UPPER
        ; Check if lowercase a-z
        ADD R0, R1, #0      ; Restore original
        LD R2, NEG_LOWER_A
        ADD R2, R0, R2
        BRn ROT13_OUTPUT    ; Not a letter
        LD R2, NEG_LOWER_Z_PLUS1
        ADD R2, R0, R2
        BRzp ROT13_OUTPUT   ; Not a letter
        
        ; Lowercase letter: apply ROT13
        ADD R0, R0, #13
        LD R2, NEG_LOWER_Z_PLUS1
        ADD R2, R0, R2
        BRn ROT13_OUTPUT
        ADD R0, R0, #-13
        ADD R0, R0, #-13
        BRnzp ROT13_OUTPUT

ROT13_OUTPUT
        OUT
        BRnzp ROT13_LOOP

ROT13_DONE
        LD R0, NEWLINE
        OUT
        
        HALT

; ------------------------------------------------------------
; DATA
; ------------------------------------------------------------
MSG1        .STRINGZ "Example 1 - Echo (type, Enter to stop):\n"
MSG2        .STRINGZ "Example 2 - Uppercase (type, Enter to stop):\n"
MSG3        .STRINGZ "Example 3 - Counter (type, Enter to stop):\n"
MSG4        .STRINGZ "Example 4 - ROT13 cipher (type, Enter to stop):\n"
COUNT_MSG   .STRINGZ "You typed "
CHARS_MSG   .STRINGZ " characters.\n"

NEWLINE         .FILL x0A
NEG_NEWLINE     .FILL xFFF6     ; -10
ASCII_0         .FILL x30
NEG_LOWER_A     .FILL xFF9F     ; -97 = -'a'
NEG_LOWER_Z_PLUS1 .FILL xFF85   ; -123 = -('z'+1)
NEG_UPPER_A     .FILL xFFBF     ; -65 = -'A'
NEG_UPPER_Z_PLUS1 .FILL xFFA5   ; -91 = -('Z'+1)
UPPER_OFFSET    .FILL xFFE0     ; -32 (to convert lower to upper)

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. INPUT LOOP PATTERN:
;    LOOP:
;        GETC                ; Read
;        (check for terminator - Enter, etc.)
;        BRz DONE
;        (process character)
;        BRnzp LOOP
;    DONE:
;
; 2. CHARACTER CLASSIFICATION:
;    To check if char is in range [A, B]:
;    - Subtract A: if negative, char < A
;    - Subtract (B+1): if not negative, char > B
;
; 3. CHARACTER TRANSFORMATION:
;    - Lower to upper: subtract 32 (x20)
;    - Upper to lower: add 32 (x20)
;    - Digit to number: subtract '0' (x30)
;
; 4. ENTER KEY: ASCII x0A (newline)
;
; PRACTICE:
; - Make a vowel counter (count a, e, i, o, u in input)
; - Create a simple "find and replace" for one character
; - Build a palindrome checker (harder: need to store the string!)
; ============================================================
`,
};

export default lesson;
