import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kanbanService } from '../services/kanbanService'

// Hook to get all Kanban metrics
export const useKanbanMetrics = () => {
  return useQuery({
    queryKey: ['kanban-metrics'],
    queryFn: kanbanService.getKanbanMetrics,
  })
}

// Hook to get Kanban metrics summary
export const useKanbanMetricsSummary = () => {
  return useQuery({
    queryKey: ['kanban-metrics', 'summary'],
    queryFn: kanbanService.getKanbanMetricsSummary,
  })
}

// Hook to get metrics for a specific Kanban board
export const useKanbanBoardMetrics = (boardId: number) => {
  return useQuery({
    queryKey: ['kanban-metrics', 'board', boardId],
    queryFn: () => kanbanService.getKanbanBoardMetrics(boardId),
    enabled: !!boardId,
  })
}

// Hook to get metrics history for a Kanban board
export const useKanbanBoardMetricsHistory = (boardId: number, limit: number = 10) => {
  return useQuery({
    queryKey: ['kanban-metrics', 'board', boardId, 'history', limit],
    queryFn: () => kanbanService.getKanbanBoardMetricsHistory(boardId, limit),
    enabled: !!boardId,
  })
}

// Hook to calculate metrics for a specific Kanban board
export const useCalculateKanbanBoardMetrics = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: kanbanService.calculateKanbanBoardMetrics,
    onSuccess: (_, boardId) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['kanban-metrics', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['kanban-metrics', 'board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['kanban-metrics', 'board', boardId, 'history'] })
    },
  })
}

// Hook to calculate metrics for all Kanban boards
export const useCalculateAllKanbanMetrics = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: kanbanService.calculateAllKanbanMetrics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['kanban-metrics', 'summary'] })
      // Invalidate all board-specific queries
      queryClient.invalidateQueries({ queryKey: ['kanban-metrics', 'board'] })
    },
  })
}

// Hook to get formatted metrics for a Kanban board
export const useKanbanBoardFormattedMetrics = (boardId: number) => {
  return useQuery({
    queryKey: ['kanban-metrics', 'board', boardId, 'formatted'],
    queryFn: () => kanbanService.getKanbanBoardFormattedMetrics(boardId),
    enabled: !!boardId,
  })
}

export default {
  useKanbanMetrics,
  useKanbanMetricsSummary,
  useKanbanBoardMetrics,
  useKanbanBoardMetricsHistory,
  useCalculateKanbanBoardMetrics,
  useCalculateAllKanbanMetrics,
  useKanbanBoardFormattedMetrics,
}
