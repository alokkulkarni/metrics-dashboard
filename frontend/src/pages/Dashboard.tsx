import React from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, Users, Clock, RefreshCw, AlertCircle, Calculator, Timer, Zap } from 'lucide-react'
import { useBoardStats, useBoards, useSyncBoards, useCalculateAllMetrics } from '../hooks/useBoards'
import { useAllBoardsSummary } from '../hooks/useMetrics'
import MetricCard from '../components/MetricCard'
import LoadingSpinner from '../components/LoadingSpinner'

const Dashboard: React.FC = () => {
  const { data: boardStats, isLoading: statsLoading, error: statsError } = useBoardStats()
  const { data: boards, isLoading: boardsLoading, error: boardsError } = useBoards()
  const { data: boardsSummary, isLoading: summaryLoading, error: summaryError } = useAllBoardsSummary()
  const { mutate: syncBoards, isPending: syncPending } = useSyncBoards()
  const { mutate: calculateMetrics, isPending: calculatingMetrics } = useCalculateAllMetrics()

  // Track if we've already auto-synced to prevent duplicates
  const autoSyncedRef = React.useRef(false)
  const autoCalculatedRef = React.useRef(false)

  // Helper function to check if boards data should be synced
  const shouldSyncBoards = React.useCallback(() => {
    if (!boards || !Array.isArray(boards) || boards.length === 0) return true
    
    // Check if any board is older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    return boards.some(board => {
      const lastSynced = board.updatedAt ? new Date(board.updatedAt) : new Date(0)
      return lastSynced < thirtyMinutesAgo
    })
  }, [boards])

  // Helper function to check if metrics need calculation
  const shouldCalculateMetrics = React.useCallback(() => {
    if (!boardsSummary || !Array.isArray(boardsSummary) || boardsSummary.length === 0) return true
    
    // Check if any board summary is missing key metrics
    return boardsSummary.some(summary => 
      !summary.metrics || 
      summary.metrics.averageVelocity === undefined || 
      summary.metrics.totalStoryPoints === undefined
    )
  }, [boardsSummary])

  // Auto-sync boards when component loads if needed
  React.useEffect(() => {
    if (!autoSyncedRef.current && !syncPending && !boardsLoading && shouldSyncBoards()) {
      autoSyncedRef.current = true
      syncBoards()
    }
  }, [syncBoards, syncPending, boardsLoading, shouldSyncBoards])

  // Auto-calculate metrics when component loads if needed
  React.useEffect(() => {
    if (!autoCalculatedRef.current && !calculatingMetrics && !summaryLoading && shouldCalculateMetrics()) {
      autoCalculatedRef.current = true
      calculateMetrics()
    }
  }, [calculateMetrics, calculatingMetrics, summaryLoading, shouldCalculateMetrics])

  const isLoading = statsLoading || boardsLoading || summaryLoading
  const hasError = statsError || boardsError || summaryError

  // Calculate aggregate metrics
  const aggregateMetrics = React.useMemo(() => {
    if (!boardsSummary || !Array.isArray(boardsSummary)) return null

    const totalSprints = boardsSummary.reduce((sum, item) => {
      return sum + (item.counts?.totalSprints || 0)
    }, 0)
    
    const averageVelocity = boardsSummary.length > 0 
      ? boardsSummary.reduce((sum, item) => {
          const velocity = parseFloat(item.metrics?.averageVelocity || '0')
          return sum + velocity
        }, 0) / boardsSummary.length 
      : 0

    const totalStoryPoints = boardsSummary.reduce((sum, item) => {
      return sum + parseFloat(item.metrics?.totalStoryPoints || '0')
    }, 0)

    const totalBoards = boardsSummary.length
    const activeBoards = boardsSummary.filter(item => 
      (item.counts?.activeSprints || 0) > 0
    ).length

    const averageCompletionRate = boardsSummary.length > 0 
      ? boardsSummary.reduce((sum, item) => {
          const completionRate = parseFloat(item.metrics?.averageCompletionRate || '0')
          return sum + completionRate
        }, 0) / boardsSummary.length 
      : 0

    // Calculate cycle time and lead time averages
    const boardsWithCycleTime = boardsSummary.filter(item => 
      item.metrics?.averageCycleTime && parseFloat(item.metrics.averageCycleTime) > 0
    )
    const averageCycleTime = boardsWithCycleTime.length > 0 
      ? boardsWithCycleTime.reduce((sum, item) => {
          return sum + parseFloat(item.metrics?.averageCycleTime || '0')
        }, 0) / boardsWithCycleTime.length 
      : 0

    const boardsWithLeadTime = boardsSummary.filter(item => 
      item.metrics?.averageLeadTime && parseFloat(item.metrics.averageLeadTime) > 0
    )
    const averageLeadTime = boardsWithLeadTime.length > 0 
      ? boardsWithLeadTime.reduce((sum, item) => {
          return sum + parseFloat(item.metrics?.averageLeadTime || '0')
        }, 0) / boardsWithLeadTime.length 
      : 0

    return {
      totalSprints,
      totalBoards,
      activeBoards,
      averageVelocity: Math.round(averageVelocity * 10) / 10,
      totalStoryPoints: Math.round(totalStoryPoints * 10) / 10,
      completionRate: Math.round(averageCompletionRate * 10) / 10,
      averageCycleTime: Math.round(averageCycleTime * 10) / 10,
      averageLeadTime: Math.round(averageLeadTime * 10) / 10,
    }
  }, [boardsSummary])

  const handleSync = () => {
    syncBoards()
  }

  const handleCalculateMetrics = () => {
    calculateMetrics()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your Jira metrics and performance</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCalculateMetrics}
              disabled={calculatingMetrics}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50"
            >
              <Calculator className={`h-4 w-4 ${calculatingMetrics ? 'animate-pulse' : ''}`} />
              <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}</span>
            </button>
            <button
              onClick={handleSync}
              disabled={syncPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin' : ''}`} />
              <span>{syncPending ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Unable to load dashboard data</h3>
              <p className="text-sm text-red-600 mt-1">
                Please check your Jira connection and try syncing data again.
              </p>
            </div>
          </div>
        </div>

        {/* Fallback metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-gray-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Boards</p>
                <p className="text-2xl font-bold text-gray-400">--</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-gray-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sprints</p>
                <p className="text-2xl font-bold text-gray-400">--</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-gray-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Velocity</p>
                <p className="text-2xl font-bold text-gray-400">--</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-gray-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-400">--</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your Jira metrics and performance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCalculateMetrics}
            disabled={calculatingMetrics}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50"
          >
            <Calculator className={`h-4 w-4 ${calculatingMetrics ? 'animate-pulse' : ''}`} />
            <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}</span>
          </button>
          <button
            onClick={handleSync}
            disabled={syncPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin' : ''}`} />
            <span>{syncPending ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <MetricCard
          title="Total Boards"
          value={boardStats?.total || 0}
          icon={<BarChart3 className="h-6 w-6" />}
          metricKey="totalBoards"
        />
        <MetricCard
          title="Active Sprints"
          value={aggregateMetrics?.totalSprints || 0}
          icon={<TrendingUp className="h-6 w-6" />}
          metricKey="activeSprints"
        />
        <MetricCard
          title="Average Velocity"
          value={aggregateMetrics?.averageVelocity || 0}
          icon={<Users className="h-6 w-6" />}
          metricKey="averageVelocity"
        />
        <MetricCard
          title="Completion Rate"
          value={`${aggregateMetrics?.completionRate || 0}%`}
          icon={<Clock className="h-6 w-6" />}
          metricKey="averageCompletionRate"
        />
        <MetricCard
          title="Cycle Time"
          value={aggregateMetrics?.averageCycleTime ? `${aggregateMetrics.averageCycleTime} days` : 'N/A'}
          icon={<Timer className="h-6 w-6" />}
          metricKey="averageCycleTime"
        />
        <MetricCard
          title="Lead Time"
          value={aggregateMetrics?.averageLeadTime ? `${aggregateMetrics.averageLeadTime} days` : 'N/A'}
          icon={<Zap className="h-6 w-6" />}
          metricKey="averageLeadTime"
        />
      </div>

      {/* Board Types */}
      {boardStats?.byType && Object.keys(boardStats.byType).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Boards by Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(boardStats.byType).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm font-medium text-gray-600 capitalize">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board Performance Summary */}
      {boardsSummary && boardsSummary.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Board Performance Summary</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Board
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sprints
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Velocity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cycle Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {boardsSummary
                  .sort((a, b) => {
                    // First sort by active status (active boards first)
                    const aIsActive = (a.counts?.activeSprints || 0) > 0;
                    const bIsActive = (b.counts?.activeSprints || 0) > 0;
                    
                    if (aIsActive !== bIsActive) {
                      return bIsActive ? 1 : -1; // Active boards first
                    }
                    
                    // For active boards with multiple sprints, sort by the most recent sprint start date
                    if (aIsActive && bIsActive && a.activeSprints && b.activeSprints) {
                      // Get the most recent sprint start date for each board
                      const aLatestSprint = a.activeSprints[0]; // Already sorted by backend
                      const bLatestSprint = b.activeSprints[0]; // Already sorted by backend
                      
                      if (aLatestSprint && bLatestSprint) {
                        const aStartDate = aLatestSprint.startDate ? new Date(aLatestSprint.startDate).getTime() : 0;
                        const bStartDate = bLatestSprint.startDate ? new Date(bLatestSprint.startDate).getTime() : 0;
                        
                        if (aStartDate !== bStartDate) {
                          return bStartDate - aStartDate; // Most recent start date first
                        }
                        
                        // If start dates are same, sort by end date
                        const aEndDate = aLatestSprint.endDate ? new Date(aLatestSprint.endDate).getTime() : 0;
                        const bEndDate = bLatestSprint.endDate ? new Date(bLatestSprint.endDate).getTime() : 0;
                        
                        if (aEndDate !== bEndDate) {
                          return aEndDate - bEndDate; // Earliest end date first
                        }
                      }
                    }
                    
                    // Then sort by project key
                    const aProjectKey = a.board.projectKey || '';
                    const bProjectKey = b.board.projectKey || '';
                    
                    if (aProjectKey !== bProjectKey) {
                      return aProjectKey.localeCompare(bProjectKey);
                    }
                    
                    // Finally sort by board name within the same project
                    return (a.board.name || '').localeCompare(b.board.name || '');
                  })
                  .map((item) => {
                  const isActive = (item.counts?.activeSprints || 0) > 0;
                  return (
                    <tr key={item.board.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          to={`/boards/${item.board.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {item.board.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.board.projectKey}</div>
                          <div className="text-gray-500 text-xs">{item.board.projectName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.counts?.totalSprints || 0}</div>
                          <div className="text-gray-500 text-xs">
                            {item.counts?.activeSprints || 0} active, {item.counts?.completedSprints || 0} completed
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(item.metrics?.averageVelocity || '0').toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.metrics?.averageCycleTime 
                          ? `${parseFloat(item.metrics.averageCycleTime).toFixed(1)} days`
                          : 'N/A'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.metrics?.averageLeadTime 
                          ? `${parseFloat(item.metrics.averageLeadTime).toFixed(1)} days`
                          : 'N/A'
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!boards?.length && !boardsSummary?.length && !boardStats?.total && (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Click "Sync Data" to fetch your Jira boards and metrics.
          </p>
          <div className="mt-6">
            <button
              onClick={handleSync}
              disabled={syncPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 disabled:opacity-50 mx-auto"
            >
              <RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin' : ''}`} />
              <span>{syncPending ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
