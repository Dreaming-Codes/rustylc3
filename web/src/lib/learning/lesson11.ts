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
    'Use multiple .ORIG segments for code and data',
  ],
  newInstructions: ['Multiple .ORIG segments', 'LDI for far data'],
  category: 'io',
  code: `; ============================================================
; LESSON 11: Echo Program
; ============================================================
; Now let's combine what we know to build interactive programs!
; We'll read input, process it, and produce output.
;
; IMPORTANT: This lesson uses MULTIPLE .ORIG segments!
; - Code at x3000
; - Data at x4000 (too far for LD, so we use pointers + LDI)
;
; In this lesson, you'll learn:
; - How to read multiple characters in a loop
; - How to detect the Enter key (newline)
; - How to use LDI to access data in a different segment
; - How to transform text (uppercase conversion)
; ============================================================

        .ORIG x3000

        BRnzp START         ; Skip over data section

; ============================================================
; POINTERS TO DATA (these ARE within LD range)
; ============================================================
; We store pointers here, then use LDI to load the actual values
; from the data segment at x4000.

PTR_NEWLINE     .FILL x4000
PTR_NEG_NEWLINE .FILL x4001
PTR_ASCII_0     .FILL x4002
PTR_NEG_LOWER_A .FILL x4003
PTR_NEG_LOWER_Z .FILL x4004
PTR_UPPER_OFF   .FILL x4005
PTR_MSG1        .FILL x4010
PTR_MSG2        .FILL x4040
PTR_MSG3        .FILL x4080
PTR_COUNT_MSG   .FILL x40C0
PTR_CHARS_MSG   .FILL x40D0

; ============================================================
; MAIN PROGRAM
; ============================================================

START
        LD R0, PTR_MSG1
        PUTS

ECHO_LOOP
        GETC                ; Read a character
        OUT                 ; Echo it immediately
        
        ; Check if it's Enter (newline, ASCII x0A)
        LDI R1, PTR_NEG_NEWLINE
        ADD R1, R0, R1      ; R1 = char - newline
        BRz ECHO_DONE       ; If zero, user pressed Enter
        
        BRnzp ECHO_LOOP     ; Otherwise, keep reading

ECHO_DONE
        LD R0, PTR_NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 2: Uppercase Converter
; ------------------------------------------------------------
; Read text and convert lowercase to uppercase.
; ASCII: 'a' = x61 (97), 'A' = x41 (65)
; To convert: subtract x20 (32)

        LD R0, PTR_MSG2
        PUTS

UPPER_LOOP
        GETC                ; Read character
        ADD R1, R0, #0      ; Save original in R1
        
        ; Check for Enter
        LDI R2, PTR_NEG_NEWLINE
        ADD R2, R0, R2
        BRz UPPER_DONE
        
        ; Check if char >= 'a' (97)
        LDI R2, PTR_NEG_LOWER_A
        ADD R2, R0, R2      ; R2 = char - 'a'
        BRn NOT_LOWER       ; If negative, char < 'a'
        
        ; Check if char <= 'z' (122)
        LDI R2, PTR_NEG_LOWER_Z
        ADD R2, R0, R2      ; R2 = char - ('z' + 1)
        BRzp NOT_LOWER      ; If >= 0, char > 'z'
        
        ; It's lowercase! Convert to uppercase
        LDI R2, PTR_UPPER_OFF
        ADD R0, R0, R2      ; R0 = char - 32
        OUT
        BRnzp UPPER_LOOP

NOT_LOWER
        ADD R0, R1, #0      ; Restore original
        OUT
        BRnzp UPPER_LOOP

UPPER_DONE
        LD R0, PTR_NEWLINE
        OUT

; ------------------------------------------------------------
; EXAMPLE 3: Character Counter
; ------------------------------------------------------------
; Count how many characters user types (excluding Enter).

        LD R0, PTR_MSG3
        PUTS
        
        AND R3, R3, #0      ; R3 = counter = 0

COUNT_LOOP
        GETC                ; Read character
        OUT                 ; Echo it
        
        ; Check for Enter
        LDI R1, PTR_NEG_NEWLINE
        ADD R1, R0, R1
        BRz COUNT_DONE
        
        ADD R3, R3, #1      ; Increment counter
        BRnzp COUNT_LOOP

COUNT_DONE
        LD R0, PTR_NEWLINE
        OUT
        
        ; Print the result
        LD R0, PTR_COUNT_MSG
        PUTS
        
        ; Convert count to ASCII digit (works for 0-9)
        LD R0, PTR_ASCII_0
        ADD R0, R3, R0      ; R0 = count + '0'
        OUT
        
        LD R0, PTR_CHARS_MSG
        PUTS

        HALT

; ============================================================
; DATA SEGMENT at x4000
; ============================================================
; This is a separate memory region for our data.
; We access it via pointers and LDI from the code segment.

        .ORIG x4000

; Constants (x4000 - x400F)
NEWLINE         .FILL x0A       ; x4000
NEG_NEWLINE     .FILL xFFF6     ; x4001: -10
ASCII_0         .FILL x30       ; x4002: '0'
NEG_LOWER_A     .FILL xFF9F     ; x4003: -97 = -'a'
NEG_LOWER_Z_P1  .FILL xFF85     ; x4004: -123 = -('z'+1)
UPPER_OFFSET    .FILL xFFE0     ; x4005: -32

; Padding to x4010
        .BLKW 10

; Strings (starting at x4010)
MSG1        .STRINGZ "Example 1 - Echo (type, press Enter to stop):\\n"

; Padding to x4040
        .ORIG x4040
MSG2        .STRINGZ "Example 2 - Uppercase converter:\\n"

; Padding to x4080  
        .ORIG x4080
MSG3        .STRINGZ "Example 3 - Character counter:\\n"

; Padding to x40C0
        .ORIG x40C0
COUNT_MSG   .STRINGZ "You typed "

        .ORIG x40D0
CHARS_MSG   .STRINGZ " characters.\\n"

        .END

; ============================================================
; KEY CONCEPTS
; ============================================================
;
; 1. MULTIPLE .ORIG SEGMENTS:
;    - Code can be at one address, data at another
;    - Use .ORIG to start a new segment
;    - All segments are loaded into memory
;
; 2. ACCESSING FAR DATA:
;    - LD/ST have limited range (9-bit offset = -256 to +255)
;    - For far data: store pointer nearby, use LDI
;    - LDI loads the ADDRESS first, then the VALUE at that address
;
; 3. POINTER PATTERN:
;    PTR_DATA .FILL x4000    ; Pointer to actual data
;    ...
;    LDI R0, PTR_DATA        ; Load value at x4000 into R0
;
; 4. INPUT LOOP PATTERN:
;    LOOP:
;        GETC                ; Read
;        (check for Enter)
;        BRz DONE
;        (process character)
;        BRnzp LOOP
;    DONE:
;
; 5. CHARACTER CLASSIFICATION:
;    To check if char is in range [A, B]:
;    - Subtract A: if negative, char < A
;    - Subtract (B+1): if not negative, char > B
;
; PRACTICE:
; - Add a lowercase converter (add 32 instead of subtract)
; - Create a vowel counter
; - Make the counter work for numbers > 9 (print multiple digits)
; ============================================================
`,
};

export default lesson;
