import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Plus, Search, Filter, X, AlertTriangle } from 'lucide-react'
import { useBoards, useSyncBoards, useSyncStatus } from '../hooks/useBoards'
import { useKanbanMetrics } from '../hooks/useKanbanMetrics'
import LoadingSpinner from '../components/LoadingSpinner'

const Boards: React.FC = () => {
  const { data: boards, isLoading, error, refetch } = useBoards()
  const { data: kanbanMetrics } = useKanbanMetrics()
  const { data: syncStatus } = useSyncStatus()
  const { mutate: syncBoards, isPending: syncPending } = useSyncBoards()
  const autoSyncedRef = useRef(false)

  // Create a set of kanban board IDs that have metrics for quick lookup
  const kanbanBoardsWithMetrics = useMemo(() => {
    if (!kanbanMetrics) return new Set()
    return new Set(kanbanMetrics.map(metric => metric.boardInfo.id))
  }, [kanbanMetrics])

  // Filter state
  const [filters, setFilters] = useState({
    boardName: '',
    projectKey: '',
    status: 'all', // 'all', 'active', 'inactive'
    boardType: 'all' // 'all', 'scrum', 'kanban'
  })
  
  // Force update trigger for filtering
  const [filterUpdateKey, setFilterUpdateKey] = useState(0)

  // Get unique project keys for filter dropdown
  const uniqueProjectKeys = useMemo(() => {
    if (!boards) return []
    const keys = [...new Set(boards.map(board => board.project?.jiraProjectKey).filter(Boolean))]
    return keys.sort()
  }, [boards])

  // Filter boards based on current filters
  const filteredBoards = useMemo(() => {
    console.log('🔍 FILTERING: boards count:', boards?.length, 'filters:', JSON.stringify(filters), 'updateKey:', filterUpdateKey)
    if (!boards) return []
    
    const result = boards.filter(board => {
      // Board name filter
      if (filters.boardName && !board.name.toLowerCase().includes(filters.boardName.toLowerCase())) {
        console.log('❌ Name filter failed for:', board.name)
        return false
      }
      
      // Project key filter (only filter if a specific project is selected and not 'all' or empty)
      if (filters.projectKey && filters.projectKey !== '' && filters.projectKey !== 'all') {
        if (board.project?.jiraProjectKey !== filters.projectKey) {
          console.log('❌ Project filter failed for:', board.name, 'has:', board.project?.jiraProjectKey, 'wanted:', filters.projectKey)
          return false
        }
      }
      
      // Status filter
      if (filters.status === 'active' && !board.isActive) {
        console.log('❌ Status filter failed (wanted active):', board.name)
        return false
      }
      if (filters.status === 'inactive' && board.isActive) {
        console.log('❌ Status filter failed (wanted inactive):', board.name)
        return false
      }
      
      // Board type filter (only filter if a specific type is selected, not 'all')
      if (filters.boardType && filters.boardType !== 'all') {
        if (board.type !== filters.boardType) {
          console.log('❌ Type filter failed for:', board.name, 'has:', board.type, 'wanted:', filters.boardType)
          return false
        }
      }
      
      return true
    })
    
    console.log('🎯 FILTERED RESULT:', result.length, 'boards out of', boards?.length || 0)
    return result
  }, [boards, filters, filterUpdateKey])

  // Log when component re-renders with filtered boards
  useEffect(() => {
    console.log('📊 COMPONENT RENDER: filteredBoards count:', filteredBoards.length)
  }, [filteredBoards])

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      boardName: '',
      projectKey: '',
      status: 'all',
      boardType: 'all'
    })
    setFilterUpdateKey(prev => prev + 1)
  }

  // Check if any filters are active
  const hasActiveFilters = filters.boardName || filters.projectKey || filters.status !== 'all' || filters.boardType !== 'all'

  // Helper function to check if boards data needs syncing
  const shouldSyncBoards = (boardsData: any[]) => {
    if (!boardsData || boardsData.length === 0) return true // No boards exist
    
    // Check if any board data is outdated (older than 30 minutes)
    const thirtyMinutes = 30 * 60 * 1000
    const now = Date.now()
    
    const hasOutdatedBoards = boardsData.some(board => {
      const boardAge = now - new Date(board.updatedAt).getTime()
      return boardAge > thirtyMinutes
    })
    
    return hasOutdatedBoards
  }

  // Auto-trigger sync when boards data loads if sync is allowed
  useEffect(() => {
    if (boards && !autoSyncedRef.current && !syncPending && !isLoading && syncStatus?.canSync) {
      if (shouldSyncBoards(boards)) {
        autoSyncedRef.current = true
        syncBoards({}, {
          onSuccess: () => {
            refetch()
          },
          onError: () => {
            // Reset the flag so user can try again manually
            autoSyncedRef.current = false
          }
        })
      }
    }
  }, [boards, syncBoards, refetch, syncPending, isLoading, syncStatus?.canSync])

  const handleSync = () => {
    syncBoards({ forceSync: true }, {
      onSuccess: () => {
        refetch()
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-red-800">
          Error loading boards. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boards</h1>
          <p className="text-gray-600">Manage and monitor your Jira boards</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Sync Status Indicator */}
          {syncStatus?.lastSync && (
            <div className="text-sm text-gray-600">
              Last sync: {new Date(syncStatus.lastSync.endTime).toLocaleTimeString()}
            </div>
          )}
          
          <button
            onClick={handleSync}
            disabled={syncPending || !syncStatus?.canSync}
            className={`btn-secondary flex items-center space-x-2 ${
              !syncStatus?.canSync ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={!syncStatus?.canSync ? `Sync throttled. Please wait ${syncStatus?.timeRemaining || 0} minutes.` : ''}
          >
            <RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin' : ''}`} />
            <span>
              {syncPending 
                ? 'Syncing...' 
                : !syncStatus?.canSync 
                  ? `Wait ${syncStatus?.timeRemaining || 0}m` 
                  : 'Sync Boards'
              }
            </span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Board Name Filter */}
            <div className="flex-1 min-w-0">
              <label htmlFor="boardName" className="block text-sm font-medium text-gray-700 mb-1">
                Board Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="boardName"
                  type="text"
                  value={filters.boardName}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, boardName: e.target.value }))
                    setFilterUpdateKey(prev => prev + 1)
                  }}
                  placeholder="Search boards..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Project Key Filter */}
            <div className="flex-1 min-w-0">
              <label htmlFor="projectKey" className="block text-sm font-medium text-gray-700 mb-1">
                Project Key
              </label>
              <select
                id="projectKey"
                value={filters.projectKey}
                onChange={(e) => {
                  console.log('Project key filter changed to:', e.target.value)
                  setFilters(prev => ({ ...prev, projectKey: e.target.value }))
                  setFilterUpdateKey(prev => prev + 1)
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Projects</option>
                {uniqueProjectKeys.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-0">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, status: e.target.value }))
                  setFilterUpdateKey(prev => prev + 1)
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Boards</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Board Type Filter */}
            <div className="flex-1 min-w-0">
              <label htmlFor="boardType" className="block text-sm font-medium text-gray-700 mb-1">
                Board Type
              </label>
              <select
                id="boardType"
                value={filters.boardType}
                onChange={(e) => {
                  console.log('Board type filter changed to:', e.target.value)
                  setFilters(prev => ({ ...prev, boardType: e.target.value }))
                  setFilterUpdateKey(prev => prev + 1)
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Types</option>
                <option value="scrum">Scrum Boards</option>
                <option value="kanban">Kanban Boards</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Results Summary */}
        {boards && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredBoards.length} of {boards.length} boards
              {hasActiveFilters && (
                <span className="ml-2 inline-flex items-center space-x-1">
                  <Filter className="h-3 w-3" />
                  <span>Filtered</span>
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Boards Grid */}
      {filteredBoards && filteredBoards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" key={`grid-${filteredBoards.length}-${filters.boardType}-${filters.projectKey}-${filters.status}-${filters.boardName}`}>
          {filteredBoards.map((board) => {
            // Check if this kanban board has metrics
            const hasMetrics = board.type !== 'kanban' || kanbanBoardsWithMetrics.has(board.id)
            
            return (
            <div key={board.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {board.name}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      board.type === 'kanban' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {board.type === 'kanban' ? 'Kanban' : 'Scrum'}
                    </span>
                    {board.type === 'kanban' && !hasMetrics && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="h-3 w-3" />
                        No Metrics
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Project:</span> {board.project?.jiraProjectKey || 'N/A'}</p>
                    <p><span className="font-medium">Type:</span> {board.type}</p>
                    <p><span className="font-medium">Location:</span> {board.location}</p>
                    {board.type === 'scrum' ? (
                      <p><span className="font-medium">Sprints:</span> {board.totalSprintCount || 0} total, {board.activeSprintCount || 0} active</p>
                    ) : hasMetrics ? (
                      <p><span className="font-medium">Flow:</span> Continuous delivery</p>
                    ) : (
                      <p><span className="font-medium">Status:</span> <span className="text-yellow-600">No issues or metrics available</span></p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      board.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {board.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {board.type === 'kanban' && !hasMetrics && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                      Inactive Board
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Created {new Date(board.createdAt).toLocaleDateString()}
                  </span>
                  <Link 
                    to={board.type === 'kanban' ? `/kanban-boards/${board.id}` : `/boards/${board.id}`}
                    className={`text-sm px-3 py-1 rounded-md font-medium transition-colors ${
                      hasMetrics 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    }`}
                  >
                    {hasMetrics ? 'View Details' : 'Setup Metrics'}
                  </Link>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400">
            {hasActiveFilters ? <Filter className="h-full w-full" /> : <Plus className="h-full w-full" />}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {hasActiveFilters ? 'No boards match your filters' : 'No boards found'}
          </h3>
          <p className="mt-2 text-gray-600">
            {hasActiveFilters ? (
              <>Try adjusting your filters or <button onClick={clearFilters} className="text-blue-600 hover:text-blue-800 underline">clear all filters</button> to see all boards.</>
            ) : (
              'Get started by syncing your Jira boards.'
            )}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={handleSync}
              disabled={syncPending}
              className="mt-4 btn-primary"
            >
              {syncPending ? 'Syncing...' : 'Sync Boards'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Boards
