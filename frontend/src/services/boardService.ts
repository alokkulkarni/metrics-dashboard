import api from './api'

export interface Board {
  id: number
  jiraId: string
  name: string
  type: string
  location: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  activeSprintCount?: number
  totalSprintCount?: number
  project?: {
    id: number
    jiraProjectKey: string
    name: string
  }
}

export interface BoardStats {
  total: number
  byType: Record<string, number>
}

export interface Sprint {
  id: number
  jiraId: number
  name: string
  state: string
  startDate: string
  endDate: string
  completeDate: string | null
  boardId: number
  createdAt: string
  updatedAt: string
}

export interface SprintMetricsData {
  id: number
  sprintId: number
  velocity: number
  churnRate: number
  completionRate: number
  teamMembers: string[]
  totalStoryPoints: number
  completedStoryPoints: number
  addedStoryPoints: number
  removedStoryPoints: number
  totalIssues: number
  completedIssues: number
  addedIssues: number
  removedIssues: number
  issueTypeBreakdown: Record<string, number>
  storyPointsBreakdown?: Record<string, number>
  averageCycleTime?: number
  averageLeadTime?: number
  scopeChangePercent: number
  defectLeakageRate: number
  qualityRate: number
  totalDefects: number
  completedDefects: number
  calculatedAt: string
  commentary?: string
  sprint?: Sprint
}

export interface BoardMetricsData {
  id: number
  boardId: number
  averageVelocity: number
  averageChurnRate: number
  averageCompletionRate: number
  totalSprints: number
  activeSprints: number
  completedSprints: number
  totalStoryPoints: number
  averageCycleTime?: number
  averageLeadTime?: number
  teamMembers: string[]
  predictedVelocity: number
  velocityTrend: 'up' | 'down' | 'stable'
  averageDefectLeakageRate: number
  averageQualityRate: number
  totalDefects: number
  calculatedAt: string
}

export interface BoardDetailsResponse {
  board: Board & {
    project: {
      id: number
      name: string
      key: string
    }
  }
  boardMetrics?: BoardMetricsData
  sprints: {
    all: Sprint[]
    active: Sprint[]
    completed: Sprint[]
    future: Sprint[]
    withMetrics: SprintMetricsData[]
    withoutMetrics: Sprint[]
  }
  summary: {
    totalSprints: number
    activeSprints: number
    completedSprints: number
    futureSprints: number
    sprintsWithMetrics: number
    sprintsWithoutMetrics: number
    hasMetrics: boolean
  }
}

export interface BoardMetrics {
  boardId: number
  boardName: string
  sprints: SprintMetricsData[]
  totalSprints: number
  averageVelocity: number
  completionRate: number
}

export interface BoardSummaryResponse {
  board: {
    id: number
    name: string
    type: string
    projectKey: string
    projectName: string
  }
  activeSprints: Array<{
    id: number
    name: string
    startDate: string
    endDate: string
    state: string
  }>
  metrics: {
    averageVelocity: string
    averageCompletionRate: string
    averageChurnRate: string
    totalStoryPoints: string
    averageCycleTime?: string
    averageLeadTime?: string
  }
  counts: {
    totalSprints: number
    activeSprints: number
    completedSprints: number
    totalIssues: number
  }
}

export const boardService = {
  // Get all boards
  getBoards: async (): Promise<Board[]> => {
    const response = await api.get('/boards')
    return response.data.data || []
  },

  // Get board statistics
  getBoardStats: async (): Promise<BoardStats> => {
    const response = await api.get('/boards')
    const boards = response.data.data || []
    
    // Calculate stats from the actual board data
    const total = boards.length
    const byType = boards.reduce((acc: Record<string, number>, board: Board) => {
      acc[board.type] = (acc[board.type] || 0) + 1
      return acc
    }, {})
    
    return { total, byType }
  },

  // Get board by ID
  getBoardById: async (boardId: string): Promise<Board> => {
    const response = await api.get(`/boards/${boardId}`)
    return response.data.data
  },

  // Sync all boards from Jira
  syncBoards: async (): Promise<void> => {
    await api.post('/sync')
  },

  // Sync a specific board from Jira
  syncBoard: async (boardId: string): Promise<void> => {
    await api.post('/sync', {
      boardIds: [parseInt(boardId)]
    })
  },

  // Get sprints for a board
  getBoardSprints: async (boardId: string): Promise<Sprint[]> => {
    const response = await api.get(`/boards/${boardId}/sprints`)
    return response.data.data || []
  },

  // Sync sprints for a board
  syncBoardSprints: async (boardId: string): Promise<void> => {
    await api.post(`/boards/${boardId}/sprints/sync`)
  },

  // Get detailed board information with metrics and sprints
  getBoardDetails: async (boardId: string): Promise<BoardDetailsResponse> => {
    const response = await api.get(`/boards/${boardId}/details`)
    return response.data.data
  },

  // Calculate metrics for a specific board
  calculateBoardMetrics: async (boardId: string): Promise<{ boardMetrics: BoardMetricsData; sprintMetrics: SprintMetricsData[] }> => {
    const response = await api.post(`/metrics/calculate/board/${boardId}`)
    return response.data.data
  },

  // Calculate metrics for all boards
  calculateAllMetrics: async (): Promise<{ processedBoards: number; totalSprints: number }> => {
    const response = await api.post('/metrics/calculate')
    return response.data.data
  },
}

export const metricsService = {
  // Get all boards summary
  getAllBoardsSummary: async (): Promise<BoardSummaryResponse[]> => {
    const response = await api.get('/metrics/boards/summary')
    return response.data.data || []
  },

  // Get metrics for a specific board
  getBoardMetrics: async (boardId: string): Promise<BoardMetrics> => {
    const response = await api.get(`/metrics/boards/${boardId}`)
    return response.data.data
  },

  // Get metrics for a specific sprint
  getSprintMetrics: async (sprintId: string): Promise<SprintMetricsData> => {
    const response = await api.get(`/metrics/sprints/${sprintId}`)
    return response.data.data
  },

  // Get all sprint metrics
  getAllSprintMetrics: async (): Promise<SprintMetricsData[]> => {
    const response = await api.get('/metrics/sprints')
    return response.data.data || []
  },
}
