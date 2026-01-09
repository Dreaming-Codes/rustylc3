import { useStore } from '@tanstack/react-store'
import { useLiveQuery } from '@tanstack/react-db'
import { useState, useCallback } from 'react'
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FilePlus,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  HardDrive,
  X,
} from 'lucide-react'
import {
  fileManagerStore,
  openFolder,
  closeFolder,
  openFolderFile,
  createFileInFolder,
  deleteFileInFolder,
  refreshFolder,
  openStoredFile,
  deleteStoredFile,
} from '@/lib/file-manager'
import { filesCollection } from '@/lib/file-storage'
import type { StoredFile } from '@/lib/file-storage'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function FileBrowser() {
  const openFolderState = useStore(fileManagerStore, (s) => s.openFolder)
  const currentFilePath = useStore(fileManagerStore, (s) => s.currentFilePath)
  const currentFileId = useStore(fileManagerStore, (s) => s.currentFileId)
  const supportsDirectoryPicker = useStore(fileManagerStore, (s) => s.supportsDirectoryPicker)

  // Live query for stored files
  const { data: storedFiles } = useLiveQuery((q) =>
    q.from({ file: filesCollection })
     .orderBy(({ file }) => file.updatedAt, 'desc')
     .select(({ file }) => ({
       id: file.id,
       name: file.name,
       content: file.content,
       createdAt: file.createdAt,
       updatedAt: file.updatedAt,
     }))
  )

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [browserExpanded, setBrowserExpanded] = useState(true)
  const [folderExpanded, setFolderExpanded] = useState(true)

  const toggleDir = useCallback((dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(dir)) {
        next.delete(dir)
      } else {
        next.add(dir)
      }
      return next
    })
  }, [])

  const handleCreateFile = useCallback(async () => {
    if (newFileName.trim()) {
      await createFileInFolder(newFileName.trim())
      setNewFileName('')
      setIsCreatingFile(false)
    }
  }, [newFileName])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCreateFile()
      } else if (e.key === 'Escape') {
        setIsCreatingFile(false)
        setNewFileName('')
      }
    },
    [handleCreateFile]
  )

  // Group folder files by directory
  const groupedFiles = openFolderState?.files.reduce(
    (acc, file) => {
      const parts = file.path.split('/')
      if (parts.length === 1) {
        // Root level file
        acc.root.push(file)
      } else {
        // Nested file
        const dir = parts.slice(0, -1).join('/')
        if (!acc.dirs[dir]) {
          acc.dirs[dir] = []
        }
        acc.dirs[dir].push(file)
      }
      return acc
    },
    { root: [], dirs: {} } as {
      root: typeof openFolderState.files
      dirs: Record<string, typeof openFolderState.files>
    }
  )

  const files = (storedFiles ?? []) as StoredFile[]

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col border-r border-zinc-800 bg-zinc-950/50">
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Open Folder Section */}
            {supportsDirectoryPicker && (
              <div className="mb-3">
                {openFolderState ? (
                  <>
                    {/* Folder header */}
                    <div className="mb-1 flex items-center justify-between">
                      <button
                        onClick={() => setFolderExpanded(!folderExpanded)}
                        className="flex flex-1 items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                      >
                        {folderExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <FolderOpen className="h-3.5 w-3.5 text-yellow-500" />
                        <span className="truncate">{openFolderState.name}</span>
                      </button>
                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsCreatingFile(true)}
                              className="h-5 w-5 p-0 text-zinc-500 hover:text-zinc-300"
                            >
                              <FilePlus className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>New File</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => refreshFolder()}
                              className="h-5 w-5 p-0 text-zinc-500 hover:text-zinc-300"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Refresh</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={closeFolder}
                              className="h-5 w-5 p-0 text-zinc-500 hover:text-zinc-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Close Folder</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* New file input */}
                    {isCreatingFile && (
                      <div className="mb-1 ml-4">
                        <input
                          type="text"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onBlur={() => {
                            if (!newFileName.trim()) {
                              setIsCreatingFile(false)
                            }
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder="filename.asm"
                          className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-100 outline-none focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    )}

                    {/* Folder contents */}
                    {folderExpanded && groupedFiles && (
                      <div className="ml-2 space-y-0.5">
                        {/* Root files */}
                        {groupedFiles.root.map((file) => (
                          <FileItem
                            key={file.path}
                            name={file.name}
                            path={file.path}
                            isActive={currentFilePath === file.path}
                            onClick={() => openFolderFile(file.path)}
                            onDelete={() => deleteFileInFolder(file.path)}
                          />
                        ))}

                        {/* Directories */}
                        {Object.entries(groupedFiles.dirs).map(([dir, dirFiles]) => (
                          <div key={dir}>
                            <button
                              onClick={() => toggleDir(dir)}
                              className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            >
                              {expandedDirs.has(dir) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <Folder className="h-3.5 w-3.5 text-yellow-600" />
                              <span>{dir.split('/').pop()}</span>
                            </button>
                            {expandedDirs.has(dir) && (
                              <div className="ml-4 space-y-0.5">
                                {dirFiles.map((file) => (
                                  <FileItem
                                    key={file.path}
                                    name={file.name}
                                    path={file.path}
                                    isActive={currentFilePath === file.path}
                                    onClick={() => openFolderFile(file.path)}
                                    onDelete={() => deleteFileInFolder(file.path)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {openFolderState.files.length === 0 && (
                          <div className="px-2 py-1 text-xs text-zinc-600 italic">
                            No .asm files found
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openFolder}
                    className="w-full gap-2 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Open Folder
                  </Button>
                )}
              </div>
            )}

            {/* Divider */}
            {supportsDirectoryPicker && files.length > 0 && (
              <div className="my-2 border-t border-zinc-800" />
            )}

            {/* Browser Storage Section */}
            {files.length > 0 && (
              <div>
                <button
                  onClick={() => setBrowserExpanded(!browserExpanded)}
                  className="mb-1 flex w-full items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  {browserExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                  <span>Browser Storage</span>
                  <span className="ml-auto text-zinc-600">{files.length}</span>
                </button>

                {browserExpanded && (
                  <div className="ml-2 space-y-0.5">
                    {files.map((file) => (
                      <FileItem
                        key={file.id}
                        name={file.name}
                        path={file.id}
                        isActive={currentFileId === file.id}
                        onClick={() => openStoredFile(file.id)}
                        onDelete={() => deleteStoredFile(file.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!openFolderState && files.length === 0 && (
              <div className="py-4 text-center text-xs text-zinc-600">
                <File className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
                <p>No files yet</p>
                <p className="mt-1">Save a file or open a folder</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

interface FileItemProps {
  name: string
  path: string
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}

function FileItem({ name, isActive, onClick, onDelete }: FileItemProps) {
  const displayName = name || 'Untitled'
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Delete "${displayName}"?`)) {
      onDelete()
    }
  }
  
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded px-1 py-0.5 text-xs cursor-pointer',
        isActive
          ? 'bg-blue-500/20 text-blue-200'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      )}
      onClick={onClick}
    >
      <FileCode className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
      <span className="flex-1 truncate">{displayName}</span>
      <button
        type="button"
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded opacity-0 hover:bg-red-500/20 group-hover:opacity-100"
        onClick={handleDelete}
      >
        <Trash2 className="h-3 w-3 text-red-500" />
      </button>
    </div>
  )
}
