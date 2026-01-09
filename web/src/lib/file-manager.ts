/**
 * File manager for handling file operations including:
 * - Browser storage (TanStack DB)
 * - File System Access API (Chrome/Edge)
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
  }
}

export interface FileManagerState {
  // Currently open file
  currentFileId: string | null
  currentFileName: string
  currentFileHandle: FileSystemFileHandle | null // For File System Access API
  
  // UI state
  isLoading: boolean
  hasUnsavedChanges: boolean
  
  // Feature detection
  supportsFileSystemAccess: boolean
}

const DEFAULT_FILE_NAME = 'untitled.asm'

export const fileManagerStore = new Store<FileManagerState>({
  currentFileId: null,
  currentFileName: DEFAULT_FILE_NAME,
  currentFileHandle: null,
  isLoading: false,
  hasUnsavedChanges: false,
  supportsFileSystemAccess: typeof window !== 'undefined' && 'showOpenFilePicker' in window,
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
 * Initialize file manager - check URL for shared content and set up change tracking
 */
export async function initFileManager() {
  fileManagerStore.setState((s) => ({ ...s, isLoading: true }))

  // Set up source code change tracking
  setOnSourceCodeChange(() => {
    fileManagerStore.setState((s) => ({ ...s, hasUnsavedChanges: true }))
  })

  try {
    // Check URL for shared content
    const urlParams = new URLSearchParams(window.location.search)
    const sharedContent = urlParams.get('code')
    
    if (sharedContent) {
      try {
        const decoded = atob(sharedContent)
        updateSourceCode(decoded, false)
        fileManagerStore.setState((s) => ({
          ...s,
          currentFileId: null,
          currentFileName: 'shared.asm',
          currentFileHandle: null,
          hasUnsavedChanges: true,
        }))
        // Clear URL without reload
        window.history.replaceState({}, '', window.location.pathname)
      } catch {
        console.error('Failed to decode shared content')
      }
    }
  } finally {
    fileManagerStore.setState((s) => ({ ...s, isLoading: false }))
  }
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
        hasUnsavedChanges: false,
      }))
    } catch (err) {
      // User cancelled or error
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
        hasUnsavedChanges: false,
      }))
    }
    
    input.click()
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
        hasUnsavedChanges: false,
      }))
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
