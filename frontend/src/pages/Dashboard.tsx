import React from 'react'
import { BarChart3, TrendingUp, Users, Clock, RefreshCw, AlertCircle, Calculator, Timer, Zap, Activity, Target, GitBranch } from 'lucide-react'
import { useBoardStats, useBoards, useSyncBoards, useCalculateAllMetrics } from '../hooks/useBoards'
import { useAllBoardsSummary } from '../hooks/useMetrics'
import { useKanbanMetricsSummary, useCalculateAllKanbanMetrics, useKanbanMetrics } from '../hooks/useKanbanMetrics'
import MetricCard from '../components/MetricCard'
import LoadingSpinner from '../components/LoadingSpinner'
import BoardPerformanceTable from '../components/BoardPerformanceTable'

const Dashboard: React.FC = () => {
  const { data: boardStats, isLoading: statsLoading, error: statsError } = useBoardStats()
  const { data: boards, isLoading: boardsLoading, error: boardsError } = useBoards()
  const { data: boardsSummary, isLoading: summaryLoading, error: summaryError } = useAllBoardsSummary()
  const { data: kanbanSummary, isLoading: kanbanSummaryLoading, error: kanbanSummaryError } = useKanbanMetricsSummary()
  const { data: kanbanMetrics, isLoading: kanbanMetricsLoading, error: kanbanMetricsError } = useKanbanMetrics()
  const { mutate: syncBoards, isPending: syncPending } = useSyncBoards()
  const { mutate: calculateMetrics, isPending: calculatingMetrics } = useCalculateAllMetrics()
  const { mutate: calculateKanbanMetrics, isPending: calculatingKanbanMetrics } = useCalculateAllKanbanMetrics()

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

  const isLoading = statsLoading || boardsLoading || summaryLoading || kanbanSummaryLoading || kanbanMetricsLoading
  const hasError = statsError || boardsError || summaryError || kanbanSummaryError || kanbanMetricsError

  // Calculate Scrum aggregate metrics
  const scrumAggregateMetrics = React.useMemo(() => {
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

    // Calculate average churn rate
    const boardsWithChurnRate = boardsSummary.filter(item => 
      item.metrics?.averageChurnRate !== undefined && parseFloat(item.metrics.averageChurnRate) >= 0
    )
    const averageChurnRate = boardsWithChurnRate.length > 0 
      ? boardsWithChurnRate.reduce((sum, item) => {
          return sum + parseFloat(item.metrics?.averageChurnRate || '0')
        }, 0) / boardsWithChurnRate.length 
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
      averageChurnRate: Math.round(averageChurnRate * 10) / 10,
      averageCycleTime: Math.round(averageCycleTime * 10) / 10,
      averageLeadTime: Math.round(averageLeadTime * 10) / 10,
    }
  }, [boardsSummary])

    // Calculate Kanban aggregate metrics
  const kanbanAggregateMetrics = React.useMemo(() => {
    if (!kanbanSummary) return null

    return {
      totalBoards: kanbanSummary.totalBoards || 0,
      totalIssues: kanbanSummary.totalIssues || 0,
      averageCycleTime: kanbanSummary.averageCycleTime ? Math.round(kanbanSummary.averageCycleTime * 10) / 10 : undefined,
      averageLeadTime: kanbanSummary.averageLeadTime ? Math.round(kanbanSummary.averageLeadTime * 10) / 10 : undefined,
      totalWipViolations: kanbanSummary.totalWipViolations || 0,
      averageFlowEfficiency: kanbanSummary.averageFlowEfficiency ? Math.round(kanbanSummary.averageFlowEfficiency * 10) / 10 : undefined,
      totalThroughput: kanbanSummary.totalWeeklyThroughput || 0,
      averageThroughput: kanbanSummary.averageThroughput ? Math.round(kanbanSummary.averageThroughput * 10) / 10 : undefined,
    }
  }, [kanbanSummary])

  const handleSync = () => {
    syncBoards()
  }

  const handleCalculateMetrics = () => {
    calculateMetrics()
  }

  const handleCalculateKanbanMetrics = () => {
    calculateKanbanMetrics()
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
              <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Scrum Metrics'}</span>
            </button>
            <button
              onClick={handleCalculateKanbanMetrics}
              disabled={calculatingKanbanMetrics}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 disabled:opacity-50"
            >
              <Activity className={`h-4 w-4 ${calculatingKanbanMetrics ? 'animate-pulse' : ''}`} />
              <span>{calculatingKanbanMetrics ? 'Calculating...' : 'Calculate Kanban Metrics'}</span>
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
            <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Scrum Metrics'}</span>
          </button>
          <button
            onClick={handleCalculateKanbanMetrics}
            disabled={calculatingKanbanMetrics}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 disabled:opacity-50"
          >
            <Activity className={`h-4 w-4 ${calculatingKanbanMetrics ? 'animate-pulse' : ''}`} />
            <span>{calculatingKanbanMetrics ? 'Calculating...' : 'Calculate Kanban Metrics'}</span>
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

      {/* Overall Board Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Boards"
          value={boardStats?.total || 0}
          icon={<BarChart3 className="h-6 w-6" />}
          metricKey="totalBoards"
        />
        <MetricCard
          title="Scrum Boards"
          value={boardStats?.scrum || 0}
          icon={<TrendingUp className="h-6 w-6" />}
          metricKey="totalBoards"
        />
        <MetricCard
          title="Kanban Boards"
          value={boardStats?.kanban || 0}
          icon={<GitBranch className="h-6 w-6" />}
          metricKey="totalBoards"
        />
      </div>

      {/* Boards by Type */}
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

      {/* Scrum Boards Section */}
      {scrumAggregateMetrics && scrumAggregateMetrics.totalBoards > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scrum Boards - Aggregate Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
            <MetricCard
              title="Total Boards"
              value={scrumAggregateMetrics.totalBoards}
              icon={<BarChart3 className="h-6 w-6" />}
              metricKey="totalBoards"
            />
            <MetricCard
              title="Active Sprints"
              value={scrumAggregateMetrics.totalSprints}
              icon={<TrendingUp className="h-6 w-6" />}
              metricKey="activeSprints"
            />
            <MetricCard
              title="Average Velocity"
              value={scrumAggregateMetrics.averageVelocity}
              icon={<Users className="h-6 w-6" />}
              metricKey="averageVelocity"
            />
            <MetricCard
              title="Completion Rate"
              value={`${scrumAggregateMetrics.completionRate}%`}
              icon={<Clock className="h-6 w-6" />}
              metricKey="averageCompletionRate"
            />
            <MetricCard
              title="Average Churn Rate"
              value={`${scrumAggregateMetrics.averageChurnRate}%`}
              icon={<RefreshCw className="h-6 w-6" />}
              metricKey="averageChurnRate"
            />
            <MetricCard
              title="Average Cycle Time"
              value={scrumAggregateMetrics.averageCycleTime ? `${scrumAggregateMetrics.averageCycleTime} days` : 'N/A'}
              icon={<Timer className="h-6 w-6" />}
              metricKey="averageCycleTime"
            />
            <MetricCard
              title="Average Lead Time"
              value={scrumAggregateMetrics.averageLeadTime ? `${scrumAggregateMetrics.averageLeadTime} days` : 'N/A'}
              icon={<Zap className="h-6 w-6" />}
              metricKey="averageLeadTime"
            />
          </div>
        </div>
      )}

      {/* Kanban Boards Section */}
      {kanbanAggregateMetrics && kanbanAggregateMetrics.totalBoards > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kanban Boards - Aggregate Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <MetricCard
              title="Total Boards"
              value={kanbanAggregateMetrics.totalBoards}
              icon={<GitBranch className="h-6 w-6" />}
              metricKey="totalBoards"
            />
            <MetricCard
              title="Total Issues"
              value={kanbanAggregateMetrics.totalIssues}
              icon={<Target className="h-6 w-6" />}
              metricKey="issues"
            />
            <MetricCard
              title="Average Cycle Time"
              value={kanbanAggregateMetrics.averageCycleTime ? `${kanbanAggregateMetrics.averageCycleTime} days` : 'N/A'}
              icon={<Timer className="h-6 w-6" />}
              metricKey="cycleTime"
            />
            <MetricCard
              title="Average Lead Time"
              value={kanbanAggregateMetrics.averageLeadTime ? `${kanbanAggregateMetrics.averageLeadTime} days` : 'N/A'}
              icon={<Zap className="h-6 w-6" />}
              metricKey="leadTime"
            />
            <MetricCard
              title="WIP Violations"
              value={kanbanAggregateMetrics.totalWipViolations}
              icon={<AlertCircle className="h-6 w-6" />}
              metricKey="wipViolations"
            />
          </div>
          
          {/* Additional Kanban Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            <MetricCard
              title="Avg Throughput"
              value={kanbanAggregateMetrics.averageThroughput ? `${kanbanAggregateMetrics.averageThroughput}/week` : 'N/A'}
              icon={<TrendingUp className="h-6 w-6" />}
              metricKey="averageThroughput"
            />
            <MetricCard
              title="Flow Efficiency"
              value={kanbanAggregateMetrics.averageFlowEfficiency ? `${kanbanAggregateMetrics.averageFlowEfficiency}%` : 'N/A'}
              icon={<Activity className="h-6 w-6" />}
              metricKey="flowEfficiency"
            />
            <MetricCard
              title="Total Throughput"
              value={kanbanAggregateMetrics.totalThroughput}
              icon={<Users className="h-6 w-6" />}
              metricKey="throughput"
            />
          </div>
        </div>
      )}

      {/* Board Performance Summary - Unified Table with Tabs */}
      <BoardPerformanceTable 
        scrumBoards={boardsSummary || []}
        kanbanBoards={kanbanMetrics || []}
      />

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
