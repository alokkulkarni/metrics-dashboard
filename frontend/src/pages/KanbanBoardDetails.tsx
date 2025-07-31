import React, { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Target, Clock, Users, Calculator, AlertTriangle, Activity, GitBranch } from 'lucide-react'
import { useKanbanBoardMetrics, useCalculateKanbanBoardMetrics } from '../hooks/useKanbanMetrics'
import { useBoards } from '../hooks/useBoards'
import MetricCard from '../components/MetricCard'
import LoadingSpinner from '../components/LoadingSpinner'

const KanbanBoardDetails: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const { data: kanbanMetrics, isLoading, error } = useKanbanBoardMetrics(parseInt(boardId!))
  const { data: boards } = useBoards()
  const { mutate: calculateMetrics, isPending: calculatingMetrics } = useCalculateKanbanBoardMetrics()
  const autoCalculatedRef = useRef(false)
  const calculationAttemptedRef = useRef(false)

  // Find the board info from the boards list
  const currentBoard = boards?.find(board => board.id === parseInt(boardId!))

  // Auto-trigger metrics calculation when board details load (only for boards with NO metrics)
  useEffect(() => {
    if (!kanbanMetrics && !isLoading && boardId && !autoCalculatedRef.current && !calculatingMetrics && !calculationAttemptedRef.current) {
      // Only auto-calculate if there are no metrics at all
      autoCalculatedRef.current = true
      calculationAttemptedRef.current = true
      calculateMetrics(parseInt(boardId), {
        onError: () => {
          console.warn('Auto-calculation failed for board', boardId)
        }
      })
    }
  }, [kanbanMetrics, isLoading, boardId, calculatingMetrics]) // Removed calculateMetrics from dependencies

  const handleCalculateMetrics = () => {
    if (boardId) {
      calculateMetrics(parseInt(boardId))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check if board exists but has no metrics
  const hasNoMetrics = error?.message?.includes('No metrics found') || (!isLoading && !kanbanMetrics)
  
  if (hasNoMetrics && currentBoard) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/boards" className="p-2 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentBoard.name}</h1>
              <p className="text-gray-600">
                Kanban Board • Project ID: {currentBoard.project?.jiraProjectKey || 'N/A'}
              </p>
            </div>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              Kanban
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              No Metrics
            </span>
          </div>
          <button
            onClick={handleCalculateMetrics}
            disabled={calculatingMetrics}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 disabled:opacity-50"
          >
            <Calculator className={`h-4 w-4 ${calculatingMetrics ? 'animate-pulse' : ''}`} />
            <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}</span>
          </button>
        </div>

        {/* No Metrics Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No Metrics Available</h3>
              <p className="text-yellow-700 mb-4">
                This Kanban board currently has no calculated metrics. This could be because:
              </p>
              <ul className="list-disc list-inside text-yellow-700 space-y-1 mb-4">
                <li>No issues have been processed through this board yet</li>
                <li>The board was recently created and hasn't been analyzed</li>
                <li>Issues exist but lack the required workflow transitions for metric calculation</li>
                <li>The board is inactive or not being used</li>
              </ul>
              <p className="text-yellow-700">
                Click "Calculate Metrics" above to analyze this board and generate metrics if issues are available.
              </p>
            </div>
          </div>
        </div>

        {/* Board Information */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Board Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-600">Board Name:</span>
              <span className="ml-2 text-gray-900">{currentBoard.name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Project:</span>
              <span className="ml-2 text-gray-900">{currentBoard.project?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Project Key:</span>
              <span className="ml-2 text-gray-900">{currentBoard.project?.jiraProjectKey || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Board Type:</span>
              <span className="ml-2 text-gray-900">{currentBoard.type}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Location:</span>
              <span className="ml-2 text-gray-900">{currentBoard.location || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                currentBoard.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {currentBoard.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle actual errors (board not found, network issues, etc.)
  if (error && !hasNoMetrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/boards" className="p-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Board Not Found</h1>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-800">
            Unable to load board details. The board may not exist or there was an error loading the data.
          </div>
        </div>
      </div>
    )
  }

  // Handle case where we have no kanbanMetrics but also no current board info
  if (!kanbanMetrics && !currentBoard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/boards" className="p-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Board Not Found</h1>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-800">Kanban board not found.</div>
        </div>
      </div>
    )
  }

  // Handle the case where we have no kanban metrics data regardless of error status
  if (!kanbanMetrics) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/boards" className="p-2 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentBoard?.name || 'Kanban Board'}</h1>
              <p className="text-gray-600">
                Kanban Board • Project ID: {currentBoard?.project?.jiraProjectKey || 'N/A'}
              </p>
            </div>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              Kanban
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              No Metrics
            </span>
          </div>
          <button
            onClick={handleCalculateMetrics}
            disabled={calculatingMetrics}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 disabled:opacity-50"
          >
            <Calculator className={`h-4 w-4 ${calculatingMetrics ? 'animate-pulse' : ''}`} />
            <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}</span>
          </button>
        </div>

        {/* No Metrics Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No Metrics Available</h3>
              <p className="text-yellow-700 mb-4">
                This Kanban board currently has no calculated metrics. This could be because:
              </p>
              <ul className="list-disc list-inside text-yellow-700 space-y-1 mb-4">
                <li>No issues have been processed through this board yet</li>
                <li>The board was recently created and hasn't been analyzed</li>
                <li>Issues exist but lack the required workflow transitions for metric calculation</li>
                <li>The board is inactive or not being used</li>
              </ul>
              <p className="text-yellow-700 mb-4">
                You can calculate metrics for this board by clicking the "Calculate Metrics" button above.
                This will analyze all issues and their workflow history to generate comprehensive metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // At this point, we have valid kanban metrics
  if (!kanbanMetrics) {
    console.error('CRITICAL: kanbanMetrics is null/undefined at destructuring point!')
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/boards" className="p-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Data Loading Error</h1>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-800">Critical error: kanbanMetrics is null at destructuring point</div>
        </div>
      </div>
    )
  }
  
  const { boardInfo, statusMetrics, timeMetrics, throughputMetrics, qualityMetrics, breakdownMetrics } = kanbanMetrics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/boards" className="p-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{boardInfo.name}</h1>
            <p className="text-gray-600">
              Kanban Board • Project ID: {boardInfo.projectId}
            </p>
          </div>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            Kanban
          </span>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCalculateMetrics}
            disabled={calculatingMetrics}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 disabled:opacity-50"
          >
            <Calculator className={`h-4 w-4 ${calculatingMetrics ? 'animate-pulse' : ''}`} />
            <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Status Metrics */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Issue Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <MetricCard
            title="Total Issues"
            value={statusMetrics.totalIssues}
            icon={<Target className="h-6 w-6" />}
          />
          <MetricCard
            title="To Do"
            value={statusMetrics.todoIssues}
            icon={<Clock className="h-6 w-6" />}
          />
          <MetricCard
            title="In Progress"
            value={statusMetrics.inProgressIssues}
            icon={<Activity className="h-6 w-6" />}
          />
          <MetricCard
            title="Done"
            value={statusMetrics.doneIssues}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <MetricCard
            title="Blocked"
            value={statusMetrics.blockedIssues}
            icon={<AlertTriangle className="h-6 w-6" />}
          />
          <MetricCard
            title="Flagged"
            value={statusMetrics.flaggedIssues}
            icon={<AlertTriangle className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Time Metrics */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Avg Cycle Time"
            value={timeMetrics.averageCycleTime ? `${parseFloat(String(timeMetrics.averageCycleTime)).toFixed(1)} days` : 'N/A'}
            icon={<Clock className="h-6 w-6" />}
          />
          <MetricCard
            title="Median Cycle Time"
            value={timeMetrics.medianCycleTime ? `${parseFloat(String(timeMetrics.medianCycleTime)).toFixed(1)} days` : 'N/A'}
            icon={<Clock className="h-6 w-6" />}
          />
          <MetricCard
            title="Avg Lead Time"
            value={timeMetrics.averageLeadTime ? `${parseFloat(String(timeMetrics.averageLeadTime)).toFixed(1)} days` : 'N/A'}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <MetricCard
            title="Median Lead Time"
            value={timeMetrics.medianLeadTime ? `${parseFloat(String(timeMetrics.medianLeadTime)).toFixed(1)} days` : 'N/A'}
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Quality and Flow Metrics */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quality & Flow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Flow Efficiency"
            value={qualityMetrics.flowEfficiency ? `${parseFloat(String(qualityMetrics.flowEfficiency)).toFixed(1)}%` : 'N/A'}
            icon={<Activity className="h-6 w-6" />}
          />
          <MetricCard
            title="WIP Violations"
            value={qualityMetrics.wipViolations}
            icon={<AlertTriangle className="h-6 w-6" />}
          />
          <MetricCard
            title="Avg Age in Progress"
            value={timeMetrics.averageAgeInProgress ? `${parseFloat(String(timeMetrics.averageAgeInProgress)).toFixed(1)} days` : 'N/A'}
            icon={<Clock className="h-6 w-6" />}
          />
          <MetricCard
            title="Oldest Issue Age"
            value={timeMetrics.oldestIssueAge ? `${parseFloat(String(timeMetrics.oldestIssueAge)).toFixed(1)} days` : 'N/A'}
            icon={<AlertTriangle className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Throughput Metrics */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Throughput Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Current Sprint Throughput"
            value={throughputMetrics.currentSprintThroughput || 'N/A'}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <MetricCard
            title="Weekly Throughput"
            value={throughputMetrics.weeklyThroughput.length > 0 ? 
              `${throughputMetrics.weeklyThroughput[throughputMetrics.weeklyThroughput.length - 1]} last week` : 'N/A'}
            icon={<GitBranch className="h-6 w-6" />}
          />
          <MetricCard
            title="Monthly Throughput"
            value={throughputMetrics.monthlyThroughput.length > 0 ? 
              `${throughputMetrics.monthlyThroughput[throughputMetrics.monthlyThroughput.length - 1]} last month` : 'N/A'}
            icon={<Users className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Issue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Type Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue Types</h3>
          <div className="space-y-3">
            {Object.entries(breakdownMetrics.issueTypeBreakdown).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">{type}</span>
                <span className="text-sm font-medium text-gray-900">{String(count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="space-y-3">
            {Object.entries(breakdownMetrics.priorityBreakdown).map(([priority, count]) => (
              <div key={priority} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">{priority}</span>
                <span className="text-sm font-medium text-gray-900">{String(count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assignee Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignee Distribution</h3>
          <div className="space-y-3">
            {Object.entries(breakdownMetrics.assigneeBreakdown).map(([assignee, count]) => (
              <div key={assignee} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{assignee || 'Unassigned'}</span>
                <span className="text-sm font-medium text-gray-900">{String(count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Last Calculated */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Last calculated:</span> {new Date(kanbanMetrics!.calculatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default KanbanBoardDetails
