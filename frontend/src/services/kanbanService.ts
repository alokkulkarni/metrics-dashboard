import api from './api'

export interface KanbanBoard {
  id: number
  jiraId: string
  name: string
  projectId: number
  projectKey: string
  projectName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface KanbanMetrics {
  id: number
  kanbanBoardId: number
  calculatedAt: string
  sprintPeriodStart?: string
  sprintPeriodEnd?: string
  totalIssues: number
  todoIssues: number
  inProgressIssues: number
  doneIssues: number
  blockedIssues: number
  flaggedIssues: number
  averageCycleTime?: number
  medianCycleTime?: number
  averageLeadTime?: number
  medianLeadTime?: number
  currentSprintThroughput?: number
  weeklyThroughput: number[]
  monthlyThroughput: number[]
  wipViolations: number
  flowEfficiency?: number
  averageAgeInProgress?: number
  oldestIssueAge?: number
  issueTypeBreakdown: Record<string, number>
  priorityBreakdown: Record<string, number>
  assigneeBreakdown: Record<string, number>
  columnMetrics: any[]
}

export interface KanbanMetricsDisplayData {
  boardInfo: {
    id: number
    name: string
    projectId: number
  }
  sprintInfo: {
    isSprintAligned: boolean
    sprintPeriodStart?: string
    sprintPeriodEnd?: string
    sprintDuration?: number
  }
  statusMetrics: {
    totalIssues: number
    todoIssues: number
    inProgressIssues: number
    doneIssues: number
    blockedIssues: number
    flaggedIssues: number
  }
  timeMetrics: {
    averageCycleTime?: number
    medianCycleTime?: number
    averageLeadTime?: number
    medianLeadTime?: number
    averageAgeInProgress?: number
    oldestIssueAge?: number
  }
  throughputMetrics: {
    currentSprintThroughput?: number
    weeklyThroughput: number[]
    monthlyThroughput: number[]
  }
  qualityMetrics: {
    wipViolations: number
    flowEfficiency?: number
    wipUtilization: any
  }
  breakdownMetrics: {
    issueTypeBreakdown: any
    priorityBreakdown: any
    assigneeBreakdown: any
  }
  columnMetrics: any
  calculatedAt: string
}

export interface KanbanMetricsSummary {
  totalBoards: number
  totalIssues: number
  averageCycleTime?: number
  averageLeadTime?: number
  totalWipViolations: number
  averageFlowEfficiency?: number
  totalWeeklyThroughput: number
  averageThroughput?: number
  boardsWithMetrics: Array<{
    boardId: number
    boardName: string
    lastCalculated: string
  }>
}

export const kanbanService = {
  // Get all Kanban metrics
  getKanbanMetrics: async (): Promise<KanbanMetricsDisplayData[]> => {
    const response = await api.get('/kanban-metrics')
    return response.data.data
  },

  // Get Kanban metrics summary
  getKanbanMetricsSummary: async (): Promise<KanbanMetricsSummary> => {
    const response = await api.get('/kanban-metrics/summary')
    return response.data.data
  },

  // Get metrics for a specific Kanban board
  getKanbanBoardMetrics: async (boardId: number): Promise<KanbanMetricsDisplayData> => {
    const response = await api.get(`/kanban-metrics/board/${boardId}`)
    return response.data.data
  },

  // Get metrics history for a Kanban board
  getKanbanBoardMetricsHistory: async (boardId: number, limit: number = 10): Promise<KanbanMetricsDisplayData[]> => {
    const response = await api.get(`/kanban-metrics/board/${boardId}/history?limit=${limit}`)
    return response.data.data
  },

  // Calculate metrics for a specific Kanban board
  calculateKanbanBoardMetrics: async (boardId: number): Promise<KanbanMetricsDisplayData> => {
    const response = await api.post(`/kanban-metrics/board/${boardId}/calculate`)
    return response.data.data
  },

  // Calculate metrics for all Kanban boards
  calculateAllKanbanMetrics: async (): Promise<{ calculatedBoards: number[], skippedBoards: number[] }> => {
    const response = await api.post('/kanban-metrics/calculate-all')
    return response.data.data
  },

  // Get formatted display for a Kanban board
  getKanbanBoardFormattedMetrics: async (boardId: number): Promise<{ formattedMetrics: string, rawMetrics: KanbanMetricsDisplayData }> => {
    const response = await api.get(`/kanban-metrics/board/${boardId}/display`)
    return response.data.data
  }
}

export default kanbanService
