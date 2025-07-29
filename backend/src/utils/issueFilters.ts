/**
 * Utility functions for filtering issues in metrics calculations
 */

import { logger } from './logger';

/**
 * Sub-task type variations that should be excluded from sprint metrics
 */
export const SUB_TASK_TYPES = [
  'Sub-task',
  'Subtask', 
  'sub-task',
  'sub task',
  'Sub task',
  'SubTask',
  'SUBTASK',
  'SUB-TASK'
];

/**
 * Check if an issue is a sub-task type
 * @param issueType - The issue type to check
 * @returns true if the issue is a sub-task type
 */
export function isSubTask(issueType: string | null | undefined): boolean {
  if (!issueType) return false;
  
  const normalizedType = issueType.toLowerCase().trim();
  return SUB_TASK_TYPES.some(subType => 
    normalizedType === subType.toLowerCase().trim()
  );
}

/**
 * Filter out sub-tasks from an array of issues
 * @param issues - Array of issues to filter
 * @param logContext - Context for logging (e.g., 'Sprint 123', 'Board ABC')
 * @returns Filtered array without sub-tasks
 */
export function filterOutSubTasks<T extends { issueType?: string | null }>(
  issues: T[], 
  logContext: string = 'Unknown context'
): T[] {
  const originalCount = issues.length;
  const filteredIssues = issues.filter(issue => !isSubTask(issue.issueType));
  const filteredCount = originalCount - filteredIssues.length;
  
  if (filteredCount > 0) {
    logger.info(`${logContext} - Filtered out ${filteredCount} sub-tasks from ${originalCount} total issues`);
  }
  
  return filteredIssues;
}

/**
 * Types excluded from quality metrics calculations
 */
export const QUALITY_EXCLUDED_TYPES = ['Release', 'Sub-task', 'Spike', 'Bug'];

/**
 * Filter issues for quality metrics calculations
 * @param issues - Array of issues to filter
 * @returns Issues relevant for quality calculations
 */
export function filterForQualityMetrics<T extends { issueType?: string | null }>(
  issues: T[]
): T[] {
  return issues.filter(issue => 
    issue.issueType && !QUALITY_EXCLUDED_TYPES.includes(issue.issueType)
  );
}

/**
 * Defect issue types for quality calculations
 */
export const DEFECT_TYPES = ['Defect'];

/**
 * Filter issues to find defects
 * @param issues - Array of issues to filter
 * @returns Only defect issues
 */
export function filterDefectIssues<T extends { issueType?: string | null }>(
  issues: T[]
): T[] {
  return issues.filter(issue => 
    issue.issueType && DEFECT_TYPES.includes(issue.issueType)
  );
}
