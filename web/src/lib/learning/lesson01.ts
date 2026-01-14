import type { LearningExample } from './types';

const lesson: LearningExample = {
  id: 'lesson-01',
  lessonNumber: 1,
  title: 'Hello World',
  description: 'Your first LC-3 program! Learn the basic structure of an assembly program and how to output text to the console.',
  objectives: [
    'Understand the basic structure of an LC-3 program',
    'Learn about .ORIG and .END directives',
    'Use LEA to load an address into a register',
    'Use PUTS to output a string',
    'Use HALT to stop the program',
  ],
  newInstructions: ['.ORIG', '.END', '.STRINGZ', 'LEA', 'PUTS', 'HALT'],
  category: 'basics',
  code: `; ============================================================
; LESSON 1: Hello World
; ============================================================
; Welcome to LC-3 Assembly! This is your first program.
; 
; In this lesson, you'll learn:
; - How an LC-3 program is structured
; - How to define where your program starts in memory
; - How to output text to the console
; - How to properly end your program
;
; NEW INSTRUCTIONS:
;   .ORIG xNNNN   - Set the starting address for the program
;   .END          - Mark the end of the source file
;   .STRINGZ "x"  - Store a null-terminated string in memory
;   LEA DR, LABEL - Load Effective Address: DR = address of LABEL
;   PUTS          - Output string at address in R0 (TRAP x22)
;   HALT          - Stop execution (TRAP x25)
; ============================================================

; ------------------------------------------------------------
; PROGRAM START
; ------------------------------------------------------------
; Every LC-3 program MUST begin with .ORIG
; This tells the assembler where to place the program in memory.
; x3000 is the standard starting address for user programs.
        .ORIG x3000

; ------------------------------------------------------------
; STEP 1: Load the address of our string into R0
; ------------------------------------------------------------
; LEA (Load Effective Address) puts the ADDRESS of HELLO_MSG
; into register R0. It does NOT load the contents - just the address.
; Think of it as getting a pointer to the data.
        LEA R0, HELLO_MSG   ; R0 = address of HELLO_MSG

; ------------------------------------------------------------
; STEP 2: Output the string
; ------------------------------------------------------------
; PUTS is a TRAP routine that prints characters starting at
; the address in R0, until it hits a null character (0).
; This is why we use .STRINGZ which adds a null terminator.
        PUTS                ; Print the string pointed to by R0

; ------------------------------------------------------------
; STEP 3: Stop the program
; ------------------------------------------------------------
; HALT stops the CPU. Without this, the CPU would continue
; executing whatever garbage is in memory after our program!
        HALT                ; Stop execution

; ------------------------------------------------------------
; DATA SECTION
; ------------------------------------------------------------
; .STRINGZ stores a string AND automatically adds a null
; terminator (0) at the end. This is required for PUTS to
; know where the string ends.
HELLO_MSG   .STRINGZ "Hello, World!"

; ------------------------------------------------------------
; PROGRAM END
; ------------------------------------------------------------
; .END tells the assembler this is the end of the source file.
; It does NOT stop execution - that's what HALT does!
        .END

; ============================================================
; TRY IT OUT!
; ============================================================
; 1. Click "Assemble" to compile the program
; 2. Click "Run" to execute it
; 3. Look at the Console panel to see "Hello, World!"
; 4. Try changing the message and running again!
; ============================================================
`,
};

export default lesson;
