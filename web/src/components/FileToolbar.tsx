import { useStore } from '@tanstack/react-store'
import { useLiveQuery } from '@tanstack/react-db'
import { useState, useCallback } from 'react'
import {
  File,
  FolderOpen,
  Save,
  Share2,
  ChevronDown,
  Trash2,
  FilePlus,
  Check,
  HardDrive,
} from 'lucide-react'
import {
  fileManagerStore,
  openFile,
  saveCurrentFile,
  saveFileAs,
  newFile,
  openStoredFile,
  deleteStoredFile,
  shareFile,
  renameCurrentFile,
} from '@/lib/file-manager'
import { filesCollection } from '@/lib/file-storage'
import type { StoredFile } from '@/lib/file-storage'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function FileToolbar() {
  const currentFileName = useStore(fileManagerStore, (s) => s.currentFileName)
  const hasUnsavedChanges = useStore(fileManagerStore, (s) => s.hasUnsavedChanges)
  const currentFileId = useStore(fileManagerStore, (s) => s.currentFileId)
  const currentFileHandle = useStore(fileManagerStore, (s) => s.currentFileHandle)
  const supportsFileSystemAccess = useStore(fileManagerStore, (s) => s.supportsFileSystemAccess)

  // Live query for stored files
  const { data: storedFiles } = useLiveQuery((q) =>
    q.from({ file: filesCollection })
     .orderBy(({ file }) => file.updatedAt, 'desc')
     .select(({ file }) => file)
  )

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [shareTooltip, setShareTooltip] = useState('Share')

  const handleRenameStart = useCallback(() => {
    setRenameValue(currentFileName)
    setIsRenaming(true)
  }, [currentFileName])

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim()) {
      renameCurrentFile(renameValue.trim())
    }
    setIsRenaming(false)
  }, [renameValue])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRenameSubmit()
      } else if (e.key === 'Escape') {
        setIsRenaming(false)
      }
    },
    [handleRenameSubmit]
  )

  const handleShare = useCallback(() => {
    shareFile()
    setShareTooltip('Copied!')
    setTimeout(() => setShareTooltip('Share'), 2000)
  }, [])

  const handleSave = useCallback(() => {
    saveCurrentFile()
  }, [])

  const handleSaveAs = useCallback(() => {
    saveFileAs()
  }, [])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const files = (storedFiles ?? []) as StoredFile[]

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* File dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-zinc-400 hover:text-zinc-100"
            >
              <File className="h-4 w-4" />
              <span className="hidden sm:inline">File</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={newFile}>
              <FilePlus className="mr-2 h-4 w-4" />
              New File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openFile}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Open...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
              {!supportsFileSystemAccess && !currentFileId && (
                <span className="ml-auto text-xs text-zinc-500">to browser</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveAs}>
              <Save className="mr-2 h-4 w-4" />
              Save As...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleRenameStart}>
              Rename...
            </DropdownMenuItem>

            {/* Stored files section */}
            {files.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-2 text-zinc-500">
                  <HardDrive className="h-3.5 w-3.5" />
                  Browser Storage
                </DropdownMenuLabel>
                {files.slice(0, 5).map((file) => (
                  <DropdownMenuItem
                    key={file.id}
                    onClick={() => openStoredFile(file.id)}
                    className="group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {file.id === currentFileId && (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      )}
                      <span className={cn(file.id !== currentFileId && 'ml-5.5')}>
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">
                        {formatDate(file.updatedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteStoredFile(file.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Current file name */}
        <div className="flex items-center gap-1 px-2">
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="w-32 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <button
              onClick={handleRenameStart}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              {currentFileName}
              {hasUnsavedChanges && (
                <span className="ml-1 text-yellow-500">*</span>
              )}
            </button>
          )}
          {currentFileHandle && (
            <Tooltip>
              <TooltipTrigger>
                <HardDrive className="h-3 w-3 text-zinc-600" />
              </TooltipTrigger>
              <TooltipContent>Linked to local file</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{shareTooltip}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
