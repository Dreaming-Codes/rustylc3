/**
 * Types for the learning examples system
 */

export type LearningCategory = 
  | 'basics' 
  | 'arithmetic' 
  | 'memory' 
  | 'control-flow' 
  | 'io' 
  | 'subroutines' 
  | 'advanced';

export interface LearningExample {
  id: string;
  lessonNumber: number;
  title: string;
  description: string;
  objectives: string[];
  newInstructions: string[];
  category: LearningCategory;
  code: string;
}

export interface CategoryInfo {
  id: LearningCategory;
  label: string;
  description: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'basics', label: 'Basics', description: 'Program structure and output' },
  { id: 'arithmetic', label: 'Arithmetic', description: 'Math and bitwise operations' },
  { id: 'memory', label: 'Memory', description: 'Loading and storing data' },
  { id: 'control-flow', label: 'Control Flow', description: 'Branching and loops' },
  { id: 'io', label: 'Input/Output', description: 'User interaction' },
  { id: 'subroutines', label: 'Subroutines', description: 'Functions and procedures' },
  { id: 'advanced', label: 'Advanced', description: 'Stack and complex patterns' },
];
