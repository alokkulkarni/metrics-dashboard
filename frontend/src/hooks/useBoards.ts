import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardService } from '../services/boardService'

export const useBoards = () => {
  return useQuery({
    queryKey: ['boards'],
    queryFn: boardService.getBoards,
  })
}

export const useBoardStats = () => {
  return useQuery({
    queryKey: ['boards', 'stats'],
    queryFn: boardService.getBoardStats,
  })
}

export const useBoard = (boardId: string) => {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => boardService.getBoardById(boardId),
    enabled: !!boardId,
  })
}

export const useBoardSprints = (boardId: string) => {
  return useQuery({
    queryKey: ['boards', boardId, 'sprints'],
    queryFn: () => boardService.getBoardSprints(boardId),
    enabled: !!boardId,
  })
}

export const useSyncBoards = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: boardService.syncBoards,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['boards', 'stats'] })
      // Invalidate all board details and sprint data to refresh issue type breakdowns
      queryClient.invalidateQueries({ queryKey: ['boards'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'sprints'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'boards'] })
    },
  })
}

export const useSyncBoard = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: boardService.syncBoard,
    onSuccess: (_, boardId) => {
      // Invalidate specific board data
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'details'] })
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'sprints'] })
      // Also invalidate the boards list and stats
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['boards', 'stats'] })
      // Invalidate metrics that might be affected
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'sprints'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'boards'] })
    },
  })
}

export const useSyncBoardSprints = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: boardService.syncBoardSprints,
    onSuccess: (_, boardId) => {
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'sprints'] })
    },
  })
}

export const useBoardDetails = (boardId: string) => {
  return useQuery({
    queryKey: ['boards', boardId, 'details'],
    queryFn: () => boardService.getBoardDetails(boardId),
    enabled: !!boardId,
  })
}

export const useCalculateBoardMetrics = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: boardService.calculateBoardMetrics,
    onSuccess: (_, boardId) => {
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'details'] })
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'sprints'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'sprints'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'boards'] })
    },
  })
}

export const useCalculateAllMetrics = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: boardService.calculateAllMetrics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['boards'], type: 'all' })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'sprints'] })
      queryClient.invalidateQueries({ queryKey: ['metrics', 'boards'] })
    },
  })
}
