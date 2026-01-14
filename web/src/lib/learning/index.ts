/**
 * LC-3 Learning Examples
 * A progressive course teaching all LC-3 assembly instructions
 */

export * from './types';

import type { LearningExample } from './types';

import lesson01 from './lesson01';
import lesson02 from './lesson02';
import lesson03 from './lesson03';
import lesson04 from './lesson04';
import lesson05 from './lesson05';
import lesson06 from './lesson06';
import lesson07 from './lesson07';
import lesson08 from './lesson08';
import lesson09 from './lesson09';
import lesson10 from './lesson10';
import lesson11 from './lesson11';
import lesson12 from './lesson12';
import lesson13 from './lesson13';
import lesson14 from './lesson14';
import lesson15 from './lesson15';
import lesson16 from './lesson16';
import lesson17 from './lesson17';
import lesson18 from './lesson18';

/**
 * All learning examples in order
 */
export const LEARNING_EXAMPLES: LearningExample[] = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
  lesson07,
  lesson08,
  lesson09,
  lesson10,
  lesson11,
  lesson12,
  lesson13,
  lesson14,
  lesson15,
  lesson16,
  lesson17,
  lesson18,
];

/**
 * Get a lesson by ID
 */
export function getLessonById(id: string): LearningExample | undefined {
  return LEARNING_EXAMPLES.find((lesson) => lesson.id === id);
}

/**
 * Get a lesson by number
 */
export function getLessonByNumber(num: number): LearningExample | undefined {
  return LEARNING_EXAMPLES.find((lesson) => lesson.lessonNumber === num);
}

/**
 * Get the next lesson
 */
export function getNextLesson(currentId: string): LearningExample | undefined {
  const currentIndex = LEARNING_EXAMPLES.findIndex((l) => l.id === currentId);
  if (currentIndex === -1 || currentIndex === LEARNING_EXAMPLES.length - 1) {
    return undefined;
  }
  return LEARNING_EXAMPLES[currentIndex + 1];
}

/**
 * Get the previous lesson
 */
export function getPreviousLesson(currentId: string): LearningExample | undefined {
  const currentIndex = LEARNING_EXAMPLES.findIndex((l) => l.id === currentId);
  if (currentIndex <= 0) {
    return undefined;
  }
  return LEARNING_EXAMPLES[currentIndex - 1];
}

/**
 * Get lessons by category
 */
export function getLessonsByCategory(category: string): LearningExample[] {
  return LEARNING_EXAMPLES.filter((lesson) => lesson.category === category);
}

/**
 * Get total number of lessons
 */
export function getTotalLessons(): number {
  return LEARNING_EXAMPLES.length;
}
