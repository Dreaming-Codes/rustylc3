import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react'
import { useStore } from '@tanstack/react-store'
import { useCallback, useEffect, useRef } from 'react'
import type * as Monaco from 'monaco-editor'
import {
  lc3Store,
  updateSourceCode,
  toggleBreakpoint,
} from '@/lib/lc3-store'

// LC3 Language configuration
const LC3_LANGUAGE_ID = 'lc3'

const LC3_MONARCH_TOKENS: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  ignoreCase: true,

  keywords: [
    'ADD', 'AND', 'BR', 'BRn', 'BRz', 'BRp', 'BRnz', 'BRnp', 'BRzp', 'BRnzp',
    'JMP', 'JSR', 'JSRR', 'LD', 'LDI', 'LDR', 'LEA', 'NOT', 'RET', 'RTI',
    'ST', 'STI', 'STR', 'TRAP', 'GETC', 'OUT', 'PUTS', 'IN', 'PUTSP', 'HALT',
  ],

  directives: ['.ORIG', '.END', '.FILL', '.BLKW', '.STRINGZ', '.EXTERNAL', '.GLOBAL'],

  registers: ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'],

  tokenizer: {
    root: [
      // Comments
      [/;.*$/, 'comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // unterminated string
      [/"/, 'string', '@string'],

      // Directives
      [/\.[a-zA-Z]+/, {
        cases: {
          '@directives': 'keyword.directive',
          '@default': 'identifier',
        },
      }],

      // Registers
      [/[rR][0-7]/, 'variable.register'],

      // Hex numbers
      [/[xX][0-9a-fA-F]+/, 'number.hex'],

      // Decimal numbers
      [/#?-?[0-9]+/, 'number'],

      // Keywords/instructions
      [/[a-zA-Z_][a-zA-Z0-9_]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],

      // Labels (at beginning of line followed by instruction/directive)
      [/^[a-zA-Z_][a-zA-Z0-9_]*(?=\s)/, 'type.identifier'],

      // Whitespace
      [/\s+/, 'white'],

      // Operators
      [/,/, 'delimiter'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
  },
}

const LC3_LANGUAGE_CONFIG: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: ';',
  },
  brackets: [],
  autoClosingPairs: [
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '"', close: '"' },
  ],
}

// Theme for LC3
const LC3_THEME: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'keyword.directive', foreground: 'C586C0', fontStyle: 'bold' },
    { token: 'variable.register', foreground: '9CDCFE' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'number.hex', foreground: 'B5CEA8' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'string.escape', foreground: 'D7BA7D' },
    { token: 'type.identifier', foreground: '4EC9B0' },
    { token: 'identifier', foreground: 'DCDCAA' },
    { token: 'delimiter', foreground: 'D4D4D4' },
  ],
  colors: {
    'editor.background': '#0a0a0a',
    'editor.foreground': '#D4D4D4',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#C6C6C6',
    'editor.selectionBackground': '#264F78',
    'editor.lineHighlightBackground': '#1a1a1a',
    'editorCursor.foreground': '#AEAFAD',
    'editorGutter.background': '#0a0a0a',
  },
}

// Current line decoration style
const CURRENT_LINE_DECORATION: Monaco.editor.IModelDecorationOptions = {
  isWholeLine: true,
  className: 'current-line-highlight',
  glyphMarginClassName: 'current-line-glyph',
}

const BREAKPOINT_DECORATION: Monaco.editor.IModelDecorationOptions = {
  isWholeLine: false,
  glyphMarginClassName: 'breakpoint-glyph',
}

export function LC3Editor() {
  const sourceCode = useStore(lc3Store, (s) => s.sourceCode)
  const diagnostics = useStore(lc3Store, (s) => s.diagnostics)
  const pc = useStore(lc3Store, (s) => s.pc)
  const pcToLine = useStore(lc3Store, (s) => s.pcToLine)
  const breakpoints = useStore(lc3Store, (s) => s.breakpoints)

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null)

  // Setup language before mount
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    // Register LC3 language
    monaco.languages.register({ id: LC3_LANGUAGE_ID })
    monaco.languages.setMonarchTokensProvider(LC3_LANGUAGE_ID, LC3_MONARCH_TOKENS)
    monaco.languages.setLanguageConfiguration(LC3_LANGUAGE_ID, LC3_LANGUAGE_CONFIG)

    // Register theme
    monaco.editor.defineTheme('lc3-dark', LC3_THEME)
  }, [])

  // Editor mounted
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Create decorations collection
    decorationsRef.current = editor.createDecorationsCollection([])

    // Handle glyph margin clicks for breakpoints
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber
        if (lineNumber) {
          toggleBreakpoint(lineNumber)
        }
      }
    })
  }, [])

  // Update decorations when PC or breakpoints change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !decorationsRef.current) return

    const decorations: Monaco.editor.IModelDeltaDecoration[] = []

    // Current line highlight
    const currentLine = pcToLine.get(pc)
    if (currentLine) {
      decorations.push({
        range: new monacoRef.current.Range(currentLine, 1, currentLine, 1),
        options: CURRENT_LINE_DECORATION,
      })
    }

    // Breakpoints
    for (const line of breakpoints) {
      decorations.push({
        range: new monacoRef.current.Range(line, 1, line, 1),
        options: BREAKPOINT_DECORATION,
      })
    }

    decorationsRef.current.set(decorations)
  }, [pc, pcToLine, breakpoints])

  // Update diagnostics/markers
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return

    const model = editorRef.current.getModel()
    if (!model) return

    const markers: Monaco.editor.IMarkerData[] = diagnostics.map((d) => ({
      severity:
        d.severity === 'error'
          ? monacoRef.current!.MarkerSeverity.Error
          : d.severity === 'warning'
            ? monacoRef.current!.MarkerSeverity.Warning
            : monacoRef.current!.MarkerSeverity.Info,
      message: d.message,
      startLineNumber: d.startLineNumber,
      startColumn: d.startColumn,
      endLineNumber: d.endLineNumber,
      endColumn: d.endColumn,
    }))

    monacoRef.current.editor.setModelMarkers(model, 'lc3', markers)
  }, [diagnostics])

  // Handle content changes
  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateSourceCode(value)
    }
  }, [])

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-zinc-800">
      <Editor
        height="100%"
        defaultLanguage={LC3_LANGUAGE_ID}
        theme="lc3-dark"
        value={sourceCode}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          glyphMargin: true,
          folding: false,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 4,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          automaticLayout: true,
          tabSize: 8,
          insertSpaces: true,
          wordWrap: 'off',
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  )
}
