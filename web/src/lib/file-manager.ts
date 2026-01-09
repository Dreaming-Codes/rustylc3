/**
 * File manager for handling file operations including:
 * - Browser storage (TanStack DB)
 * - File System Access API (Chrome/Edge)
 * - Folder support
 * - Fallback download/upload
 * - URL sharing via base64
 */

import { Store } from '@tanstack/store'
import {
  createFile,
  updateFile,
  deleteFile,
  getFile,
} from './file-storage'
import { lc3Store, updateSourceCode, setOnSourceCodeChange } from './lc3-store'

// File System Access API types
declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle[]>
    showSaveFilePicker?: (options?: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<FileSystemDirectoryHandle>
  }
}

// Extended types for File System Access API
interface FSDirectoryHandle extends FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle & { kind: 'file' | 'directory'; name: string }>
}

export interface FolderFile {
  name: string
  path: string
  handle: FileSystemFileHandle
}

export interface OpenFolder {
  name: string
  handle: FileSystemDirectoryHandle
  files: FolderFile[]
}

export interface FileManagerState {
  // Currently open file
  currentFileId: string | null
  currentFileName: string
  currentFileHandle: FileSystemFileHandle | null
  currentFilePath: string | null // For folder files
  
  // Open folder state
  openFolder: OpenFolder | null
  
  // UI state
  isLoading: boolean
  hasUnsavedChanges: boolean
  isSidebarOpen: boolean
  
  // Feature detection
  supportsFileSystemAccess: boolean
  supportsDirectoryPicker: boolean
}

const DEFAULT_FILE_NAME = 'untitled.asm'

export const fileManagerStore = new Store<FileManagerState>({
  currentFileId: null,
  currentFileName: DEFAULT_FILE_NAME,
  currentFileHandle: null,
  currentFilePath: null,
  openFolder: null,
  isLoading: false,
  hasUnsavedChanges: false,
  isSidebarOpen: true,
  supportsFileSystemAccess: typeof window !== 'undefined' && 'showOpenFilePicker' in window,
  supportsDirectoryPicker: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
})

// File type options for File System Access API
const filePickerOptions = {
  types: [
    {
      description: 'LC-3 Assembly Files',
      accept: { 'text/plain': ['.asm', '.lc3'] },
    },
  ],
}

/**
 * Initialize file manager - set up change tracking
 */
export async function initFileManager() {
  fileManagerStore.setState((s) => ({ ...s, isLoading: true }))

  // Set up source code change tracking
  setOnSourceCodeChange(() => {
    fileManagerStore.setState((s) => ({ ...s, hasUnsavedChanges: true }))
  })

  fileManagerStore.setState((s) => ({ ...s, isLoading: false }))
}

/**
 * Load shared code from URL parameter
 */
export function loadSharedCode(code: string) {
  updateSourceCode(code, false)
  fileManagerStore.setState((s) => ({
    ...s,
    currentFileId: null,
    currentFileName: 'shared.asm',
    currentFileHandle: null,
    currentFilePath: null,
    hasUnsavedChanges: true,
  }))
}

/**
 * Create a new file
 */
export function newFile() {
  const defaultCode = `; LC-3 Assembly Program
; 

        .ORIG x3000

        ; Your code here
        HALT

        .END
`
  updateSourceCode(defaultCode, false)
  fileManagerStore.setState((s) => ({
    ...s,
    currentFileId: null,
    currentFileName: DEFAULT_FILE_NAME,
    currentFileHandle: null,
    currentFilePath: null,
    hasUnsavedChanges: false,
  }))
}

/**
 * Open file using File System Access API (if supported) or file input fallback
 */
export async function openFile() {
  const { supportsFileSystemAccess } = fileManagerStore.state

  if (supportsFileSystemAccess && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker(filePickerOptions)
      const file = await handle.getFile()
      const content = await file.text()

      updateSourceCode(content, false)
      fileManagerStore.setState((s) => ({
        ...s,
        currentFileId: null,
        currentFileName: file.name,
        currentFileHandle: handle,
        currentFilePath: null,
        hasUnsavedChanges: false,
      }))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to open file:', err)
      }
    }
  } else {
    // Fallback: use file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.asm,.lc3,.txt'
    
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const content = await file.text()
      updateSourceCode(content, false)
      fileManagerStore.setState((s) => ({
        ...s,
        currentFileId: null,
        currentFileName: file.name,
        currentFileHandle: null,
        currentFilePath: null,
        hasUnsavedChanges: false,
      }))
    }
    
    input.click()
  }
}

/**
 * Open a folder using File System Access API
 */
export async function openFolder() {
  if (!window.showDirectoryPicker) {
    console.error('Directory picker not supported')
    return
  }

  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    const files = await scanDirectory(dirHandle)
    
    fileManagerStore.setState((s) => ({
      ...s,
      openFolder: {
        name: dirHandle.name,
        handle: dirHandle,
        files,
      },
      isSidebarOpen: true,
    }))

    // Open first .asm file if any
    const firstAsm = files.find(f => f.name.endsWith('.asm') || f.name.endsWith('.lc3'))
    if (firstAsm) {
      await openFolderFile(firstAsm.path)
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Failed to open folder:', err)
    }
  }
}

/**
 * Scan directory for .asm and .lc3 files
 */
async function scanDirectory(dirHandle: FileSystemDirectoryHandle, basePath = ''): Promise<FolderFile[]> {
  const files: FolderFile[] = []
  
  // Cast to extended type for values() method
  const dir = dirHandle as FSDirectoryHandle
  
  for await (const entry of dir.values()) {
    const path = basePath ? `${basePath}/${entry.name}` : entry.name
    
    if (entry.kind === 'file') {
      if (entry.name.endsWith('.asm') || entry.name.endsWith('.lc3')) {
        files.push({
          name: entry.name,
          path,
          handle: entry as FileSystemFileHandle,
        })
      }
    } else if (entry.kind === 'directory') {
      // Recursively scan subdirectories
      const subFiles = await scanDirectory(entry as FileSystemDirectoryHandle, path)
      files.push(...subFiles)
    }
  }
  
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Refresh the open folder
 */
export async function refreshFolder() {
  const { openFolder } = fileManagerStore.state
  if (!openFolder) return

  const files = await scanDirectory(openFolder.handle)
  fileManagerStore.setState((s) => ({
    ...s,
    openFolder: s.openFolder ? { ...s.openFolder, files } : null,
  }))
}

/**
 * Close the open folder
 */
export function closeFolder() {
  fileManagerStore.setState((s) => ({
    ...s,
    openFolder: null,
  }))
}

/**
 * Open a file from the open folder
 */
export async function openFolderFile(path: string) {
  const { openFolder } = fileManagerStore.state
  if (!openFolder) return

  const fileInfo = openFolder.files.find(f => f.path === path)
  if (!fileInfo) return

  try {
    const file = await fileInfo.handle.getFile()
    const content = await file.text()

    updateSourceCode(content, false)
    fileManagerStore.setState((s) => ({
      ...s,
      currentFileId: null,
      currentFileName: fileInfo.name,
      currentFileHandle: fileInfo.handle,
      currentFilePath: path,
      hasUnsavedChanges: false,
    }))
  } catch (err) {
    console.error('Failed to open file:', err)
  }
}

/**
 * Create a new file in the open folder
 */
export async function createFileInFolder(fileName: string) {
  const { openFolder } = fileManagerStore.state
  if (!openFolder) return

  // Ensure .asm extension
  if (!fileName.endsWith('.asm') && !fileName.endsWith('.lc3')) {
    fileName += '.asm'
  }

  try {
    const handle = await openFolder.handle.getFileHandle(fileName, { create: true })
    const writable = await handle.createWritable()
    const defaultContent = `; ${fileName}
; 

        .ORIG x3000

        ; Your code here
        HALT

        .END
`
    await writable.write(defaultContent)
    await writable.close()

    // Refresh folder and open the new file
    await refreshFolder()
    await openFolderFile(fileName)
  } catch (err) {
    console.error('Failed to create file:', err)
  }
}

/**
 * Delete a file from the open folder
 */
export async function deleteFileInFolder(path: string) {
  const { openFolder, currentFilePath } = fileManagerStore.state
  if (!openFolder) return

  try {
    // Find parent directory and file name
    const parts = path.split('/')
    const fileName = parts.pop()!
    
    let dirHandle = openFolder.handle
    for (const part of parts) {
      dirHandle = await dirHandle.getDirectoryHandle(part)
    }
    
    await dirHandle.removeEntry(fileName)
    await refreshFolder()

    // If we deleted the current file, create a new one
    if (currentFilePath === path) {
      newFile()
    }
  } catch (err) {
    console.error('Failed to delete file:', err)
  }
}

/**
 * Save file - uses File System Access API if available and file was opened from disk,
 * otherwise saves to browser storage
 */
export async function saveCurrentFile() {
  const { currentFileHandle, currentFileId, currentFileName } = fileManagerStore.state
  const content = lc3Store.state.sourceCode

  // If we have a file handle, save directly to disk
  if (currentFileHandle) {
    try {
      const writable = await currentFileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      fileManagerStore.setState((s) => ({ ...s, hasUnsavedChanges: false }))
      return
    } catch (err) {
      console.error('Failed to save to file handle:', err)
      // Fall through to browser storage
    }
  }

  // Save to browser storage
  if (currentFileId) {
    // Update existing file
    updateFile(currentFileId, { content })
  } else {
    // Create new file
    const file = createFile(currentFileName, content)
    fileManagerStore.setState((s) => ({
      ...s,
      currentFileId: file.id,
    }))
  }

  fileManagerStore.setState((s) => ({ ...s, hasUnsavedChanges: false }))
}

/**
 * Save file as - always prompts for new location/name
 */
export async function saveFileAs() {
  const { supportsFileSystemAccess } = fileManagerStore.state
  const content = lc3Store.state.sourceCode
  const currentName = fileManagerStore.state.currentFileName

  if (supportsFileSystemAccess && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: currentName,
        ...filePickerOptions,
      })
      
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()

      fileManagerStore.setState((s) => ({
        ...s,
        currentFileId: null,
        currentFileName: handle.name,
        currentFileHandle: handle,
        currentFilePath: null,
        hasUnsavedChanges: false,
      }))
      
      // Refresh folder if open
      await refreshFolder()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to save file:', err)
      }
    }
  } else {
    // Fallback: download file
    downloadFile(content, currentName)
  }
}

/**
 * Download file (fallback for browsers without File System Access API)
 */
function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  
  fileManagerStore.setState((s) => ({ ...s, hasUnsavedChanges: false }))
}

/**
 * Open a stored file from browser storage
 */
export function openStoredFile(id: string) {
  const file = getFile(id)
  if (!file) return

  updateSourceCode(file.content, false)
  fileManagerStore.setState((s) => ({
    ...s,
    currentFileId: file.id,
    currentFileName: file.name,
    currentFileHandle: null,
    currentFilePath: null,
    hasUnsavedChanges: false,
  }))
}

/**
 * Delete a stored file from browser storage
 */
export function deleteStoredFile(id: string) {
  deleteFile(id)
  
  const { currentFileId } = fileManagerStore.state
  
  // If we deleted the current file, reset to new file
  if (currentFileId === id) {
    newFile()
  }
}

/**
 * Rename current file
 */
export function renameCurrentFile(newName: string) {
  const { currentFileId } = fileManagerStore.state
  
  fileManagerStore.setState((s) => ({
    ...s,
    currentFileName: newName,
    hasUnsavedChanges: true,
  }))

  // If it's a stored file, update it
  if (currentFileId) {
    updateFile(currentFileId, { name: newName })
  }
}

/**
 * Toggle sidebar visibility
 */
export function toggleSidebar() {
  fileManagerStore.setState((s) => ({ ...s, isSidebarOpen: !s.isSidebarOpen }))
}

/**
 * Share current file via URL
 */
export function shareFile(): string {
  const content = lc3Store.state.sourceCode
  const encoded = btoa(content)
  const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`
  
  // Copy to clipboard
  navigator.clipboard.writeText(url).catch(() => {
    // Fallback: show prompt
    prompt('Copy this URL to share:', url)
  })
  
  return url
}

/**
 * Mark file as having unsaved changes
 */
export function markUnsaved() {
  fileManagerStore.setState((s) => ({ ...s, hasUnsavedChanges: true }))
}
