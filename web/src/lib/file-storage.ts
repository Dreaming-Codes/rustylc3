/**
 * File storage using TanStack DB with localStorage persistence.
 */

import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db'

export type StoredFile = {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

// Create a collection with localStorage persistence
export const filesCollection = createCollection(
  localStorageCollectionOptions<StoredFile, string>({
    storageKey: 'lc3-ide-files',
    getKey: (item) => item.id,
  })
)

export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createFile(name: string, content: string): StoredFile {
  const now = Date.now()
  const file: StoredFile = {
    id: generateFileId(),
    name,
    content,
    createdAt: now,
    updatedAt: now,
  }
  filesCollection.insert(file)
  return file
}

export function updateFile(id: string, updates: Partial<Pick<StoredFile, 'name' | 'content'>>): void {
  filesCollection.update(id, (draft) => {
    if (updates.name !== undefined) draft.name = updates.name
    if (updates.content !== undefined) draft.content = updates.content
    draft.updatedAt = Date.now()
  })
}

export function deleteFile(id: string): void {
  filesCollection.delete(id)
}

export function getFile(id: string): StoredFile | undefined {
  return filesCollection.state.get(id)
}

export function getAllFiles(): StoredFile[] {
  const files = Array.from(filesCollection.state.values())
  // Sort by updatedAt descending (most recent first)
  return files.sort((a, b) => b.updatedAt - a.updatedAt)
}
