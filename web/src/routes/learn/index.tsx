import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Code2,
  Filter,
  RotateCcw,
  Play,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import {
  LEARNING_EXAMPLES,
  CATEGORIES,
  getLessonById,
  getNextLesson,
  getPreviousLesson,
  getTotalLessons,
  type LearningCategory,
} from '@/lib/learning'
import {
  markLessonComplete,
  isLessonComplete,
  getCompletedCount,
  resetProgress,
} from '@/lib/learning-progress'
import { loadExampleCode } from '@/lib/file-manager'

export const Route = createFileRoute('/learn/')({
  component: LearnPage,
})

function LearnPage() {
  const navigate = useNavigate()
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    LEARNING_EXAMPLES[0]?.id ?? ''
  )
  const [categoryFilter, setCategoryFilter] = useState<LearningCategory | 'all'>('all')
  // Force re-render when progress changes
  const [, setProgressVersion] = useState(0)
  const forceUpdate = useCallback(() => setProgressVersion(v => v + 1), [])
  
  const selectedLesson = getLessonById(selectedLessonId)
  const nextLesson = selectedLesson ? getNextLesson(selectedLessonId) : undefined
  const prevLesson = selectedLesson ? getPreviousLesson(selectedLessonId) : undefined
  
  const completedCount = getCompletedCount()
  const totalLessons = getTotalLessons()
  const progressPercent = Math.round((completedCount / totalLessons) * 100)

  // Filter lessons by category
  const filteredLessons = categoryFilter === 'all'
    ? LEARNING_EXAMPLES
    : LEARNING_EXAMPLES.filter((l) => l.category === categoryFilter)

  const handleOpenInIDE = () => {
    if (!selectedLesson) return
    
    // Mark as complete when opening in IDE
    markLessonComplete(selectedLesson.id)
    
    // Load the code into the IDE
    const filename = `lesson${String(selectedLesson.lessonNumber).padStart(2, '0')}.asm`
    loadExampleCode(selectedLesson.code, filename)
    
    // Navigate to IDE
    navigate({ to: '/', search: { code: undefined } })
  }

  const handleMarkComplete = () => {
    if (selectedLesson) {
      markLessonComplete(selectedLesson.id)
      forceUpdate()
    }
  }

  const handleResetProgress = () => {
    if (confirm('Are you sure you want to reset all progress?')) {
      resetProgress()
      forceUpdate()
    }
  }

  const handleNextLesson = () => {
    if (nextLesson) {
      setSelectedLessonId(nextLesson.id)
    }
  }

  const handlePrevLesson = () => {
    if (prevLesson) {
      setSelectedLessonId(prevLesson.id)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && nextLesson) {
        setSelectedLessonId(nextLesson.id)
      } else if (e.key === 'ArrowLeft' && prevLesson) {
        setSelectedLessonId(prevLesson.id)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextLesson, prevLesson])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-zinc-400 hover:text-zinc-100"
            asChild
          >
            <Link to="/" search={{ code: undefined }}>
              <ChevronLeft className="h-4 w-4" />
              <span>Back to IDE</span>
            </Link>
          </Button>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <h1 className="text-lg font-semibold text-zinc-100">
              LC-3 <span className="text-blue-400">Learning</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>Progress:</span>
            <Badge variant="outline" className="font-mono">
              {completedCount}/{totalLessons} ({progressPercent}%)
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetProgress}
            className="gap-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden p-2 gap-2">
        {/* Lesson list sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2">
          <Card className="border-zinc-800 bg-zinc-950/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-300">
                  Lessons
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <Filter className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">
                        {categoryFilter === 'all' ? 'All' : CATEGORIES.find(c => c.id === categoryFilter)?.label}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem
                      onClick={() => setCategoryFilter('all')}
                      className="text-zinc-300 focus:bg-zinc-800"
                    >
                      All Categories
                    </DropdownMenuItem>
                    {CATEGORIES.map((cat) => (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        className="text-zinc-300 focus:bg-zinc-800"
                      >
                        {cat.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-2 space-y-1">
                  {filteredLessons.map((lesson) => {
                    const isComplete = isLessonComplete(lesson.id)
                    const isSelected = lesson.id === selectedLessonId
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md transition-colors',
                          'flex items-center gap-2',
                          isSelected
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        <span className={cn(
                          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs',
                          isComplete
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-700 text-zinc-400'
                        )}>
                          {isComplete ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            lesson.lessonNumber
                          )}
                        </span>
                        <span className="truncate text-sm">{lesson.title}</span>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Lesson content */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {selectedLesson ? (
            <>
              {/* Lesson header */}
              <Card className="border-zinc-800 bg-zinc-950/50 flex-shrink-0">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          Lesson {selectedLesson.lessonNumber}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className="text-xs bg-zinc-800"
                        >
                          {CATEGORIES.find(c => c.id === selectedLesson.category)?.label}
                        </Badge>
                        {isLessonComplete(selectedLesson.id) && (
                          <Badge className="text-xs bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                        {selectedLesson.title}
                      </h2>
                      <p className="text-sm text-zinc-400 mb-3">
                        {selectedLesson.description}
                      </p>
                      
                      {/* Objectives */}
                      <div className="mb-3">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase mb-1">
                          What you'll learn:
                        </h3>
                        <ul className="text-sm text-zinc-400 space-y-0.5">
                          {selectedLesson.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* New instructions */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-zinc-500">New instructions:</span>
                        {selectedLesson.newInstructions.map((instr) => (
                          <Badge 
                            key={instr} 
                            variant="outline" 
                            className="text-xs font-mono text-blue-400 border-blue-400/30"
                          >
                            {instr}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        onClick={handleOpenInIDE}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Open in IDE
                      </Button>
                      {!isLessonComplete(selectedLesson.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMarkComplete}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Code viewer */}
              <Card className="border-zinc-800 bg-zinc-950/50 flex-1 overflow-hidden flex flex-col">
                <CardHeader className="flex-shrink-0 pb-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-zinc-500" />
                    <CardTitle className="text-sm font-medium text-zinc-300">
                      Code
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <pre className="p-4 text-sm font-mono text-zinc-300 whitespace-pre overflow-x-auto">
                      <code>
                        {selectedLesson.code.split('\n').map((line, i) => (
                          <div key={i} className="flex">
                            <span className="w-12 flex-shrink-0 text-zinc-600 select-none text-right pr-4">
                              {i + 1}
                            </span>
                            <span className={cn(
                              line.trim().startsWith(';') 
                                ? 'text-green-500' 
                                : line.trim().startsWith('.')
                                  ? 'text-purple-400'
                                  : ''
                            )}>
                              {highlightLine(line)}
                            </span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevLesson}
                  disabled={!prevLesson}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {prevLesson ? prevLesson.title : 'Previous'}
                </Button>
                <span className="text-xs text-zinc-500">
                  Use ← → arrow keys to navigate
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextLesson}
                  disabled={!nextLesson}
                  className="gap-2"
                >
                  {nextLesson ? nextLesson.title : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Card className="border-zinc-800 bg-zinc-950/50 flex-1 flex items-center justify-center">
              <p className="text-zinc-500">Select a lesson to begin</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * Simple syntax highlighting for LC-3 assembly
 */
function highlightLine(line: string): React.ReactNode {
  // Comments are already handled in the parent
  if (line.trim().startsWith(';')) {
    return line
  }
  
  // Split by semicolon to separate code from inline comments
  const commentIndex = line.indexOf(';')
  if (commentIndex === -1) {
    return highlightCode(line)
  }
  
  const code = line.substring(0, commentIndex)
  const comment = line.substring(commentIndex)
  
  return (
    <>
      {highlightCode(code)}
      <span className="text-green-500">{comment}</span>
    </>
  )
}

function highlightCode(code: string): React.ReactNode {
  // Highlight instructions pattern
  const instructionPattern = /\b(ADD|AND|NOT|BR[nzp]*|JMP|JSR|JSRR|RET|RTI|LD|LDI|LDR|LEA|ST|STI|STR|TRAP|HALT|GETC|OUT|PUTS|IN|PUTSP)\b/gi
  
  // Simple approach: just return the code with basic highlighting
  // For a more sophisticated solution, you'd parse tokens
  const parts: React.ReactNode[] = []
  let remaining = code
  let key = 0
  
  // Check for label at start of line
  const labelMatch = remaining.match(/^([A-Z_][A-Z0-9_]*)/i)
  if (labelMatch && !remaining.trim().startsWith('.')) {
    const label = labelMatch[1]
    // Check if it's not an instruction
    if (!instructionPattern.test(label)) {
      parts.push(<span key={key++} className="text-yellow-400">{label}</span>)
      remaining = remaining.substring(label.length)
    }
  }
  
  // Just return the rest without complex parsing for now
  parts.push(<span key={key++}>{remaining}</span>)
  
  return parts.length === 1 ? code : parts
}
