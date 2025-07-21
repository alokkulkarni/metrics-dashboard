import { useQuery } from '@tanstack/react-query'
import { metricsService, BoardSummaryResponse, SprintMetricsData } from '../services/boardService'

export const useAllBoardsSummary = () => {
  return useQuery<BoardSummaryResponse[]>({
    queryKey: ['metrics', 'boards', 'summary'],
    queryFn: metricsService.getAllBoardsSummary,
  })
}

export const useBoardMetrics = (boardId: string) => {
  return useQuery({
    queryKey: ['metrics', 'boards', boardId],
    queryFn: () => metricsService.getBoardMetrics(boardId),
    enabled: !!boardId,
  })
}

export const useSprintMetrics = (sprintId: string) => {
  return useQuery({
    queryKey: ['metrics', 'sprints', sprintId],
    queryFn: () => metricsService.getSprintMetrics(sprintId),
    enabled: !!sprintId,
  })
}

export const useAllSprintMetrics = () => {
  return useQuery<SprintMetricsData[]>({
    queryKey: ['metrics', 'sprints'],
    queryFn: metricsService.getAllSprintMetrics,
  })
}
