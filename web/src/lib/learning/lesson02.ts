import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-02',
  lessonNumber: 2,
  title: 'Single Character Output',
  description: 'Learn how to output individual characters and store data values in memory using .FILL.',
  objectives: [
    'Use LD to load a value from memory into a register',
    'Use OUT to output a single character',
    'Use .FILL to store a value in memory',
    'Understand ASCII character codes',
  ],
  newInstructions: ['LD', 'OUT', '.FILL'],
  category: 'basics',
  code: `; ============================================================
; LESSON 2: Single Character Output
; ============================================================
; In Lesson 1, we printed a whole string with PUTS.
; Now let's learn to output single characters with OUT.
;
; In this lesson, you'll learn:
; - How to load data from memory with LD
; - How to output a single character with OUT
; - How to store values in memory with .FILL
; - How ASCII codes represent characters
;
; NEW INSTRUCTIONS:
;   LD DR, LABEL  - Load: DR = mem[LABEL] (load value from memory)
;   OUT           - Output character in R0 (TRAP x21)
;   .FILL value   - Store a 16-bit value at this memory location
; ============================================================

        .ORIG x3000

; ------------------------------------------------------------
; STEP 1: Output the letter 'A'
; ------------------------------------------------------------
; LD loads the VALUE stored at CHAR_A into R0.
; Unlike LEA which loads the address, LD loads the contents.
; 
; Compare:
;   LEA R0, CHAR_A  -> R0 = address where CHAR_A is stored
;   LD R0, CHAR_A   -> R0 = value stored at CHAR_A (which is x41)
        LD R0, CHAR_A       ; R0 = x0041 (ASCII code for 'A')

; OUT prints the character whose ASCII code is in R0.
; Unlike PUTS which prints a whole string, OUT prints ONE character.
        OUT                 ; Print 'A'

; ------------------------------------------------------------
; STEP 2: Output a newline
; ------------------------------------------------------------
; A newline character (ASCII x0A, or decimal 10) moves the
; cursor to the next line. Let's add one after our letter.
        LD R0, NEWLINE      ; R0 = x000A (newline character)
        OUT                 ; Print newline

; ------------------------------------------------------------
; STEP 3: Output multiple characters to spell "Hi!"
; ------------------------------------------------------------
        LD R0, CHAR_H       ; Load 'H'
        OUT                 ; Print 'H'
        
        LD R0, CHAR_LOWER_I ; Load 'i'
        OUT                 ; Print 'i'
        
        LD R0, CHAR_BANG    ; Load '!'
        OUT                 ; Print '!'
        
        LD R0, NEWLINE      ; Load newline
        OUT                 ; Print newline

; ------------------------------------------------------------
; DONE
; ------------------------------------------------------------
        HALT

; ------------------------------------------------------------
; DATA SECTION
; ------------------------------------------------------------
; .FILL stores a single 16-bit value in memory.
; You can use:
;   - Hexadecimal: x41 (the 'x' prefix means hex)
;   - Decimal: #65 (the '#' prefix means decimal)
;   - Character: Can also compute from ASCII table
;
; ASCII Quick Reference:
;   'A' = x41 = #65     'a' = x61 = #97
;   '0' = x30 = #48     ' ' = x20 = #32
;   Newline = x0A = #10
; ------------------------------------------------------------

CHAR_A      .FILL x41       ; 'A' in ASCII (hex notation)
CHAR_H      .FILL #72       ; 'H' in ASCII (decimal notation)
CHAR_LOWER_I .FILL x69      ; 'i' in ASCII
CHAR_BANG   .FILL x21       ; '!' in ASCII
NEWLINE     .FILL x0A       ; Newline character

        .END

; ============================================================
; TRY IT OUT!
; ============================================================
; 1. Assemble and run the program
; 2. You should see:
;    A
;    Hi!
; 3. Try adding more characters to spell your name!
; 4. Hint: Look up ASCII codes online or use:
;    'A'-'Z' = x41-x5A, 'a'-'z' = x61-x7A, '0'-'9' = x30-x39
; ============================================================
`,
};

export default lesson;
