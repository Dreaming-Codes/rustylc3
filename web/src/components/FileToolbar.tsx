import { useStore } from '@tanstack/react-store'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  File,
  FolderOpen,
  Save,
  Share2,
  ChevronDown,
  FilePlus,
  HardDrive,
} from 'lucide-react'
import {
  fileManagerStore,
  openFile,
  openFolder,
  saveCurrentFile,
  saveFileAs,
  newFile,
  shareFile,
  renameCurrentFile,
} from '@/lib/file-manager'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

export function FileToolbar() {
  const currentFileName = useStore(fileManagerStore, (s) => s.currentFileName)
  const hasUnsavedChanges = useStore(fileManagerStore, (s) => s.hasUnsavedChanges)
  const currentFileHandle = useStore(fileManagerStore, (s) => s.currentFileHandle)
  const supportsFileSystemAccess = useStore(fileManagerStore, (s) => s.supportsFileSystemAccess)
  const supportsDirectoryPicker = useStore(fileManagerStore, (s) => s.supportsDirectoryPicker)
  const currentFileId = useStore(fileManagerStore, (s) => s.currentFileId)

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

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
    const url = shareFile()
    toast.success('Share link copied to clipboard!', {
      description: 'Anyone with this link can view your code',
      action: {
        label: 'Open',
        onClick: () => window.open(url, '_blank'),
      },
    })
  }, [])

  const handleSave = useCallback(async () => {
    await saveCurrentFile()
    toast.success('File saved')
  }, [])

  const handleSaveAs = useCallback(() => {
    saveFileAs()
  }, [])

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
              <File className="mr-2 h-4 w-4" />
              Open File...
            </DropdownMenuItem>
            {supportsDirectoryPicker && (
              <DropdownMenuItem onClick={openFolder}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Folder...
              </DropdownMenuItem>
            )}
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
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
