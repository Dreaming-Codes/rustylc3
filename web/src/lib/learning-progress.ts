/**
 * Learning progress tracking using TanStack DB with localStorage persistence.
 * Tracks which lessons the user has completed.
 */

import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db'

export type LessonProgress = {
  lessonId: string
  completedAt: number
}

// Create a collection with localStorage persistence
export const progressCollection = createCollection(
  localStorageCollectionOptions<LessonProgress, string>({
    storageKey: 'lc3-learning-progress',
    getKey: (item) => item.lessonId,
  })
)

/**
 * Mark a lesson as completed
 */
export function markLessonComplete(lessonId: string): void {
  // Check if already completed
  if (progressCollection.state.has(lessonId)) {
    return
  }
  
  progressCollection.insert({
    lessonId,
    completedAt: Date.now(),
  })
}

/**
 * Check if a lesson is completed
 */
export function isLessonComplete(lessonId: string): boolean {
  return progressCollection.state.has(lessonId)
}

/**
 * Get all completed lesson IDs
 */
export function getCompletedLessons(): string[] {
  return Array.from(progressCollection.state.keys())
}

/**
 * Get the number of completed lessons
 */
export function getCompletedCount(): number {
  return progressCollection.state.size
}

/**
 * Reset all progress
 */
export function resetProgress(): void {
  const lessonIds = Array.from(progressCollection.state.keys())
  for (const id of lessonIds) {
    progressCollection.delete(id)
  }
}
