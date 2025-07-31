import React, { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Target, Clock, Users, Calculator, AlertTriangle, RefreshCw } from 'lucide-react'
import { useBoardDetails, useCalculateBoardMetrics, useSyncBoard } from '../hooks/useBoards'
import MetricCard from '../components/MetricCard'
import MetricTooltip from '../components/MetricTooltip'
import { METRIC_DEFINITIONS } from '../constants/metricDefinitions'
import LoadingSpinner from '../components/LoadingSpinner'
import '../styles/BoardDetails.css'

const BoardDetails: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const { data: boardDetails, isLoading, error } = useBoardDetails(boardId!)
  const { mutate: calculateMetrics, isPending: calculatingMetrics } = useCalculateBoardMetrics()
  const { mutate: syncBoard, isPending: syncPending } = useSyncBoard()
  const autoCalculatedRef = useRef(false)

  // Helper function to check if metrics need updating
  const shouldUpdateMetrics = (boardMetrics: any, summary: any) => {
    if (!boardMetrics) return true // No metrics exist
    
    // Check if metrics are outdated (older than 1 hour)
    const metricsAge = Date.now() - new Date(boardMetrics.calculatedAt).getTime()
    const oneHour = 60 * 60 * 1000
    if (metricsAge > oneHour) return true
    
    // Check if there are sprints without metrics
    if (summary.sprintsWithoutMetrics > 0) return true
    
    return false
  }

  // Auto-trigger metrics calculation when board details load
  useEffect(() => {
    if (boardDetails && boardId && !autoCalculatedRef.current && !calculatingMetrics) {
      const { boardMetrics, summary } = boardDetails
      
      if (shouldUpdateMetrics(boardMetrics, summary)) {
        autoCalculatedRef.current = true
        calculateMetrics(boardId, {
          onError: () => {
            // Reset the flag so user can try again manually
            autoCalculatedRef.current = false
          }
        })
      }
    }
  }, [boardDetails, boardId, calculatingMetrics]) // Removed calculateMetrics from dependencies

  const handleCalculateMetrics = () => {
    if (boardId) {
      calculateMetrics(boardId)
    }
  }

  const handleSyncBoard = () => {
    if (boardId) {
      syncBoard({ boardId, options: { bypassThrottle: true } }) // Individual board sync can bypass throttling
    }
  }

  // Helper function to calculate trend comparison with previous sprint
  const calculateTrend = (sprints: any[], currentIndex: number, metricKey: string) => {
    if (currentIndex >= sprints.length - 1) return { trend: 'neutral', symbol: '' }
    
    const currentValue = parseFloat(String(sprints[currentIndex][metricKey] || '0'))
    const previousValue = parseFloat(String(sprints[currentIndex + 1][metricKey] || '0'))
    
    if (previousValue === 0) return { trend: 'neutral', symbol: '' }
    
    const difference = currentValue - previousValue
    const percentChange = (difference / previousValue) * 100
    
    // For metrics where higher is better (velocity, completion rate, quality rate)
    const higherIsBetter = ['velocity', 'completionRate', 'qualityRate'].includes(metricKey)
    // For metrics where lower is better (churn rate, defect leakage rate, cycle time, lead time, replanning rate)
    const lowerIsBetter = ['churnRate', 'defectLeakageRate', 'averageCycleTime', 'averageLeadTime', 'replanningRate'].includes(metricKey)
    
    if (Math.abs(percentChange) < 5) {
      return { trend: 'neutral', symbol: '➡️' }
    }
    
    if (difference > 0) {
      // Value increased
      if (higherIsBetter) {
        return { trend: 'positive', symbol: '📈' }
      } else if (lowerIsBetter) {
        return { trend: 'negative', symbol: '📉' }
      }
    } else {
      // Value decreased
      if (higherIsBetter) {
        return { trend: 'negative', symbol: '📉' }
      } else if (lowerIsBetter) {
        return { trend: 'positive', symbol: '📈' }
      }
    }
    
    return { trend: 'neutral', symbol: '➡️' }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !boardDetails) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-red-800">Board not found or error loading board details.</div>
      </div>
    )
  }

  const { board, boardMetrics, sprints, summary } = boardDetails

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/boards" className="p-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
            <p className="text-gray-600">
              {board.type} • Project: {board.project.name} ({board.project.key})
            </p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            board.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {board.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleCalculateMetrics}
            disabled={calculatingMetrics}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50"
          >
            <Calculator className={`h-4 w-4 ${calculatingMetrics ? 'animate-pulse' : ''}`} />
            <span>{calculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}</span>
          </button>
          <button
            onClick={handleSyncBoard}
            disabled={syncPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin' : ''}`} />
            <span>{syncPending ? 'Syncing...' : 'Sync Board'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sprints"
          value={summary.totalSprints}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <MetricCard
          title="Active Sprints"
          value={summary.activeSprints}
          icon={<Clock className="h-6 w-6" />}
        />
        <MetricCard
          title="Completed Sprints"
          value={summary.completedSprints}
          icon={<Target className="h-6 w-6" />}
        />
        <MetricCard
          title="Future Sprints"
          value={summary.futureSprints}
          icon={<Users className="h-6 w-6" />}
        />
      </div>

      {/* Board Metrics */}
      {boardMetrics ? (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Board Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{parseFloat(String(boardMetrics.averageVelocity || '0')).toFixed(1)}</div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-blue-700">
                <span>Average Velocity</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.averageVelocity.title}
                  definition={METRIC_DEFINITIONS.averageVelocity.definition}
                  calculation={METRIC_DEFINITIONS.averageVelocity.calculation}
                  example={METRIC_DEFINITIONS.averageVelocity.example}
                />
              </div>
              <div className="text-xs text-blue-600 mt-1">Story Points/Sprint</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">{parseFloat(String(boardMetrics.averageCompletionRate || '0')).toFixed(1)}%</div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-green-700">
                <span>Completion Rate</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.averageCompletionRate.title}
                  definition={METRIC_DEFINITIONS.averageCompletionRate.definition}
                  calculation={METRIC_DEFINITIONS.averageCompletionRate.calculation}
                  example={METRIC_DEFINITIONS.averageCompletionRate.example}
                />
              </div>
              <div className="text-xs text-green-600 mt-1">Sprint Success</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-900">
                {(() => {
                  const churnValue = parseFloat(String(boardMetrics.averageChurnRate || '0'));
                  return isNaN(churnValue) ? '0.0' : churnValue.toFixed(1);
                })()}%
              </div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-orange-700">
                <span>Average Churn Rate</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.averageChurnRate.title}
                  definition={METRIC_DEFINITIONS.averageChurnRate.definition}
                  calculation={METRIC_DEFINITIONS.averageChurnRate.calculation}
                  example={METRIC_DEFINITIONS.averageChurnRate.example}
                />
              </div>
              <div className="text-xs text-orange-600 mt-1">Scope Change</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-900">{parseFloat(String(boardMetrics.averageDefectLeakageRate || '0')).toFixed(1)}%</div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-red-700">
                <span>Defect Rate</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.averageDefectLeakageRate.title}
                  definition={METRIC_DEFINITIONS.averageDefectLeakageRate.definition}
                  calculation={METRIC_DEFINITIONS.averageDefectLeakageRate.calculation}
                  example={METRIC_DEFINITIONS.averageDefectLeakageRate.example}
                />
              </div>
              <div className="text-xs text-red-600 mt-1">Avg Defects</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-900">{parseFloat(String(boardMetrics.averageQualityRate || '100')).toFixed(1)}%</div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-emerald-700">
                <span>Quality Rate</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.averageQualityRate.title}
                  definition={METRIC_DEFINITIONS.averageQualityRate.definition}
                  calculation={METRIC_DEFINITIONS.averageQualityRate.calculation}
                  example={METRIC_DEFINITIONS.averageQualityRate.example}
                />
              </div>
              <div className="text-xs text-emerald-600 mt-1">Avg Quality</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
              <div className={`flex items-center justify-center space-x-2 ${
                boardMetrics.velocityTrend === 'up' ? 'text-green-600' :
                boardMetrics.velocityTrend === 'down' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                <span className="text-2xl font-bold">
                  {boardMetrics.velocityTrend === 'up' ? '↗' : 
                   boardMetrics.velocityTrend === 'down' ? '↘' : '→'}
                </span>
                <span className="text-lg font-semibold capitalize">{boardMetrics.velocityTrend}</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-gray-700">
                <span>Velocity Trend</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.velocityTrend.title}
                  definition={METRIC_DEFINITIONS.velocityTrend.definition}
                  calculation={METRIC_DEFINITIONS.velocityTrend.calculation}
                  example={METRIC_DEFINITIONS.velocityTrend.example}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {boardMetrics.velocityTrend === 'up' ? 'Improving' :
                 boardMetrics.velocityTrend === 'down' ? 'Declining' : 'Steady'}
              </div>
            </div>
          </div>
          
          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="text-xl font-bold text-purple-900">{parseFloat(String(boardMetrics.totalStoryPoints || '0')).toFixed(0)}</div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-purple-700">
                <span>Total Points</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.totalStoryPoints.title}
                  definition={METRIC_DEFINITIONS.totalStoryPoints.definition}
                  calculation={METRIC_DEFINITIONS.totalStoryPoints.calculation}
                  example={METRIC_DEFINITIONS.totalStoryPoints.example}
                />
              </div>
              <div className="text-xs text-purple-600 mt-1">All Sprints</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
              <div className="text-xl font-bold text-indigo-900">{parseFloat(String(boardMetrics.predictedVelocity || '0')).toFixed(1)}</div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-indigo-700">
                <span>Predicted Velocity</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.predictedVelocity.title}
                  definition={METRIC_DEFINITIONS.predictedVelocity.definition}
                  calculation={METRIC_DEFINITIONS.predictedVelocity.calculation}
                  example={METRIC_DEFINITIONS.predictedVelocity.example}
                />
              </div>
              <div className="text-xs text-indigo-600 mt-1">Next Sprint</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="text-xl font-bold text-orange-900">
                {boardMetrics.averageCycleTime 
                  ? parseFloat(String(boardMetrics.averageCycleTime)).toFixed(1) 
                  : 'N/A'
                }
              </div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-orange-700">
                <span>Cycle Time</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.averageCycleTime.title}
                  definition={METRIC_DEFINITIONS.averageCycleTime.definition}
                  calculation={METRIC_DEFINITIONS.averageCycleTime.calculation}
                  example={METRIC_DEFINITIONS.averageCycleTime.example}
                />
              </div>
              <div className="text-xs text-orange-600 mt-1">Days (Avg)</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border border-cyan-200">
              <div className="text-xl font-bold text-cyan-900">
                {boardMetrics.averageLeadTime 
                  ? parseFloat(String(boardMetrics.averageLeadTime)).toFixed(1) 
                  : 'N/A'
                }
              </div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-cyan-700">
                <span>Lead Time</span>
                <MetricTooltip
                  title={METRIC_DEFINITIONS.averageLeadTime.title}
                  definition={METRIC_DEFINITIONS.averageLeadTime.definition}
                  calculation={METRIC_DEFINITIONS.averageLeadTime.calculation}
                  example={METRIC_DEFINITIONS.averageLeadTime.example}
                />
              </div>
              <div className="text-xs text-cyan-600 mt-1">Days (Avg)</div>
            </div>
          </div>
          
          {boardMetrics.teamMembers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Team Members:</h3>
              <div className="flex flex-wrap gap-2">
                {boardMetrics.teamMembers.map((member, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {member}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">No board metrics available</h3>
              <p className="text-sm text-yellow-600 mt-1">
                Click "Calculate Metrics" to generate performance metrics for this board.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Metrics */}
      {sprints.withMetrics.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sprint Metrics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {/* Single header row - All metrics */}
                <tr>
                  <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Sprint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Velocity</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.velocity.title}
                        definition={METRIC_DEFINITIONS.velocity.definition}
                        calculation={METRIC_DEFINITIONS.velocity.calculation}
                        example={METRIC_DEFINITIONS.velocity.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Completion</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.completionRate.title}
                        definition={METRIC_DEFINITIONS.completionRate.definition}
                        calculation={METRIC_DEFINITIONS.completionRate.calculation}
                        example={METRIC_DEFINITIONS.completionRate.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Story Points</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.storyPoints.title}
                        definition={METRIC_DEFINITIONS.storyPoints.definition}
                        calculation={METRIC_DEFINITIONS.storyPoints.calculation}
                        example={METRIC_DEFINITIONS.storyPoints.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Issues</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.issues.title}
                        definition={METRIC_DEFINITIONS.issues.definition}
                        calculation={METRIC_DEFINITIONS.issues.calculation}
                        example={METRIC_DEFINITIONS.issues.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Churn</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.churnRate.title}
                        definition={METRIC_DEFINITIONS.churnRate.definition}
                        calculation={METRIC_DEFINITIONS.churnRate.calculation}
                        example={METRIC_DEFINITIONS.churnRate.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Quality</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.qualityRate.title}
                        definition={METRIC_DEFINITIONS.qualityRate.definition}
                        calculation={METRIC_DEFINITIONS.qualityRate.calculation}
                        example={METRIC_DEFINITIONS.qualityRate.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Defects</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.defectLeakageRate.title}
                        definition={METRIC_DEFINITIONS.defectLeakageRate.definition}
                        calculation={METRIC_DEFINITIONS.defectLeakageRate.calculation}
                        example={METRIC_DEFINITIONS.defectLeakageRate.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Replanning</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.replanningRate.title}
                        definition={METRIC_DEFINITIONS.replanningRate.definition}
                        calculation={METRIC_DEFINITIONS.replanningRate.calculation}
                        example={METRIC_DEFINITIONS.replanningRate.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Cycle Time</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.cycleTime.title}
                        definition={METRIC_DEFINITIONS.cycleTime.definition}
                        calculation={METRIC_DEFINITIONS.cycleTime.calculation}
                        example={METRIC_DEFINITIONS.cycleTime.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Lead Time</span>
                      <MetricTooltip
                        title={METRIC_DEFINITIONS.leadTime.title}
                        definition={METRIC_DEFINITIONS.leadTime.definition}
                        calculation={METRIC_DEFINITIONS.leadTime.calculation}
                        example={METRIC_DEFINITIONS.leadTime.example}
                        className="text-gray-400"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...sprints.withMetrics].sort((a, b) => {
                  // Sort active sprints first, then closed sprints
                  const aIsActive = a.sprint?.state === 'active' ? 1 : 0;
                  const bIsActive = b.sprint?.state === 'active' ? 1 : 0;
                  if (aIsActive !== bIsActive) return bIsActive - aIsActive;
                  
                  // For both active and non-active sprints, sort by start date first (most recent first), then by end date
                  const aStartDate = a.sprint?.startDate ? new Date(a.sprint.startDate).getTime() : 0;
                  const bStartDate = b.sprint?.startDate ? new Date(b.sprint.startDate).getTime() : 0;
                  
                  // If start dates are different, sort by start date (newest first)
                  if (aStartDate !== bStartDate) {
                    return bStartDate - aStartDate;
                  }
                  
                  // If start dates are the same, sort by end date (earliest first for active, newest first for completed)
                  const aEndDate = a.sprint?.endDate || a.sprint?.completeDate ? 
                    new Date(a.sprint.endDate || a.sprint.completeDate!).getTime() : 0;
                  const bEndDate = b.sprint?.endDate || b.sprint?.completeDate ? 
                    new Date(b.sprint.endDate || b.sprint.completeDate!).getTime() : 0;
                  
                  if (aIsActive && bIsActive) {
                    // For active sprints, sort by earliest end date first
                    return aEndDate - bEndDate;
                  } else {
                    // For completed sprints, sort by newest end date first
                    return bEndDate - aEndDate;
                  }
                }).map((sprintMetric, index, sortedSprints) => {
                  const isActive = sprintMetric.sprint?.state === 'active';
                  const baseBgClass = isActive 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400' 
                    : 'hover:bg-gray-50';
                  const commentaryBgClass = isActive 
                    ? 'bg-gradient-to-r from-green-25 to-emerald-25 border-l-4 border-green-400' 
                    : 'bg-gray-50 hover:bg-gray-100';
                  
                  // Calculate trends for each metric
                  const velocityTrend = calculateTrend(sortedSprints, index, 'velocity')
                  const completionTrend = calculateTrend(sortedSprints, index, 'completionRate')
                  const churnTrend = calculateTrend(sortedSprints, index, 'churnRate')
                  const qualityTrend = calculateTrend(sortedSprints, index, 'qualityRate')
                  const defectTrend = calculateTrend(sortedSprints, index, 'defectLeakageRate')
                  const replanningTrend = calculateTrend(sortedSprints, index, 'replanningRate')
                  const cycleTrend = calculateTrend(sortedSprints, index, 'averageCycleTime')
                  const leadTrend = calculateTrend(sortedSprints, index, 'averageLeadTime')
                  
                  return (
                    <React.Fragment key={sprintMetric.id}>
                      {/* First Row - All Metrics */}
                      <tr className={baseBgClass}>
                        {/* Sprint Name - spans both rows */}
                        <td rowSpan={2} className="px-6 py-4 whitespace-nowrap border-r border-gray-200 align-top">
                          <div className="flex items-center">
                            <div>
                              <div className={`font-medium ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                                {sprintMetric.sprint?.name || `Sprint ${sprintMetric.sprintId}`}
                              </div>
                              <div className={`text-sm ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                                ID: {sprintMetric.sprintId}
                              </div>
                              <div className="mt-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  isActive ? 'bg-green-100 text-green-800' :
                                  sprintMetric.sprint?.state === 'closed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isActive ? 'active' : (sprintMetric.sprint?.state || 'unknown')}
                                </span>
                              </div>
                              {/* Sprint Dates */}
                              <div className={`mt-2 text-xs ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                {sprintMetric.sprint?.startDate && (
                                  <div className="flex justify-between">
                                    <span>Start:</span>
                                    <span className="font-medium">
                                      {new Date(sprintMetric.sprint.startDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                )}
                                {(sprintMetric.sprint?.endDate || sprintMetric.sprint?.completeDate) && (
                                  <div className="flex justify-between">
                                    <span>{isActive ? 'Est. End:' : 'End:'}</span>
                                    <span className="font-medium">
                                      {new Date(
                                        (isActive 
                                          ? (sprintMetric.sprint.endDate || sprintMetric.sprint.completeDate)
                                          : (sprintMetric.sprint.completeDate || sprintMetric.sprint.endDate)) as string
                                      ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Velocity */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {parseFloat(String(sprintMetric.velocity || '0')).toFixed(1)}
                            </span>
                            {velocityTrend.symbol && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  velocityTrend.trend === 'up' ? 'bg-green-100 text-green-700' :
                                  velocityTrend.trend === 'down' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${velocityTrend.trend}`}
                              >
                                {velocityTrend.symbol}
                              </span>
                            )}
                            <div className="velocity-bar">
                              <div
                                className="velocity-bar-fill"
                                style={{ 
                                  width: `${Math.min((parseFloat(String(sprintMetric.velocity || '0')) / Math.max(parseFloat(String(boardMetrics?.averageVelocity || '1')), 1)) * 100, 150)}%` 
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        {/* Completion Rate */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {parseFloat(String(sprintMetric.completionRate || '0')).toFixed(1)}%
                            </span>
                            {completionTrend.symbol && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  completionTrend.trend === 'up' ? 'bg-green-100 text-green-700' :
                                  completionTrend.trend === 'down' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${completionTrend.trend}`}
                              >
                                {completionTrend.symbol}
                              </span>
                            )}
                            <div className="completion-rate-bar">
                              <div
                                className={`completion-rate-bar-fill ${
                                  parseFloat(String(sprintMetric.completionRate || '0')) >= 80 ? 'high' : 
                                  parseFloat(String(sprintMetric.completionRate || '0')) >= 60 ? 'medium' : 'low'
                                }`}
                                style={{ 
                                  width: `${Math.min(parseFloat(String(sprintMetric.completionRate || '0')), 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        {/* Story Points */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                            <div>
                              <span className="font-medium">{parseFloat(String(sprintMetric.completedStoryPoints || '0')).toFixed(1)}</span>
                              <span className={isActive ? 'text-green-600' : 'text-gray-500'}> / {parseFloat(String(sprintMetric.totalStoryPoints || '0')).toFixed(1)}</span>
                            </div>
                            {sprintMetric.storyPointsBreakdown && Object.keys(sprintMetric.storyPointsBreakdown).length > 0 && (
                              <div className={`text-xs mt-1 ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                {Object.entries(sprintMetric.storyPointsBreakdown).map(([size, points]) => (
                                  <div key={size} className="flex justify-between">
                                    <span>{size.replace(' (0-3)', ' (S)').replace(' (3-5)', ' (M)').replace(' (>5)', ' (L)')}:</span>
                                    <span className="font-medium">{parseFloat(String(points || '0')).toFixed(1)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Issues */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                            <div>
                              <span className="font-medium">{sprintMetric.completedIssues}</span>
                              <span className={isActive ? 'text-green-600' : 'text-gray-500'}> / {sprintMetric.totalIssues}</span>
                            </div>
                            {sprintMetric.issueTypeBreakdown && Object.keys(sprintMetric.issueTypeBreakdown).length > 0 && (
                              <div className={`text-xs mt-1 ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                {Object.entries(sprintMetric.issueTypeBreakdown).map(([type, count]) => (
                                  <div key={type} className="flex justify-between">
                                    <span>{type}:</span>
                                    <span className="font-medium">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Churn Rate */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {(() => {
                                const churnValue = parseFloat(String(sprintMetric.churnRate || '0'));
                                return isNaN(churnValue) ? '0.0' : churnValue.toFixed(1);
                              })()}%
                            </span>
                            {churnTrend.symbol && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  churnTrend.trend === 'up' ? 'bg-red-100 text-red-700' :
                                  churnTrend.trend === 'down' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${churnTrend.trend}`}
                              >
                                {churnTrend.symbol}
                              </span>
                            )}
                            {(() => {
                              const churnValue = parseFloat(String(sprintMetric.churnRate || '0'));
                              return !isNaN(churnValue) && churnValue > 20;
                            })() && (
                              <span className="text-red-500 text-xs">⚠</span>
                            )}
                          </div>
                        </td>
                        {/* Quality Rate */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {parseFloat(String(sprintMetric.qualityRate || '100')).toFixed(1)}%
                            </span>
                            {qualityTrend.symbol && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  qualityTrend.trend === 'up' ? 'bg-green-100 text-green-700' :
                                  qualityTrend.trend === 'down' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${qualityTrend.trend}`}
                              >
                                {qualityTrend.symbol}
                              </span>
                            )}
                            {parseFloat(String(sprintMetric.qualityRate || '100')) < 90 && (
                              <span className="text-yellow-500 text-xs">⚠</span>
                            )}
                          </div>
                        </td>
                        {/* Defect Leakage Rate */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {parseFloat(String(sprintMetric.defectLeakageRate || '0')).toFixed(1)}%
                            </span>
                            {defectTrend.symbol && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  defectTrend.trend === 'up' ? 'bg-red-100 text-red-700' :
                                  defectTrend.trend === 'down' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${defectTrend.trend}`}
                              >
                                {defectTrend.symbol}
                              </span>
                            )}
                            {parseFloat(String(sprintMetric.defectLeakageRate || '0')) > 10 && (
                              <span className="text-red-500 text-xs">⚠</span>
                            )}
                          </div>
                        </td>
                        {/* Replanning Rate */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {parseFloat(String(sprintMetric.replanningRate || '0')).toFixed(1)}%
                            </span>
                            {replanningTrend.symbol && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  replanningTrend.trend === 'up' ? 'bg-red-100 text-red-700' :
                                  replanningTrend.trend === 'down' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${replanningTrend.trend}`}
                              >
                                {replanningTrend.symbol}
                              </span>
                            )}
                            {parseFloat(String(sprintMetric.replanningRate || '0')) > 15 && (
                              <span className="text-yellow-500 text-xs">⚠</span>
                            )}
                          </div>
                          {sprintMetric.replanningCount > 0 && (
                            <div className={`text-xs mt-1 ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                              {sprintMetric.replanningCount} items moved
                            </div>
                          )}
                        </td>
                        {/* Cycle Time */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {sprintMetric.averageCycleTime 
                                ? `${parseFloat(String(sprintMetric.averageCycleTime)).toFixed(1)} days`
                                : 'N/A'
                              }
                            </span>
                            {cycleTrend.symbol && sprintMetric.averageCycleTime && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  cycleTrend.trend === 'up' ? 'bg-red-100 text-red-700' :
                                  cycleTrend.trend === 'down' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${cycleTrend.trend}`}
                              >
                                {cycleTrend.symbol}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Lead Time */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
                              {sprintMetric.averageLeadTime 
                                ? `${parseFloat(String(sprintMetric.averageLeadTime)).toFixed(1)} days`
                                : 'N/A'
                              }
                            </span>
                            {leadTrend.symbol && sprintMetric.averageLeadTime && (
                              <span 
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                  leadTrend.trend === 'up' ? 'bg-red-100 text-red-700' :
                                  leadTrend.trend === 'down' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                                title={`Trend vs previous sprint: ${leadTrend.trend}`}
                              >
                                {leadTrend.symbol}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Second Row - Performance Commentary Only */}
                      <tr className={commentaryBgClass}>
                        <td colSpan={11} className="px-6 py-3">
                          <div className="w-full">
                            {sprintMetric.commentary ? (
                              <div className={`text-sm p-3 rounded-lg border-l-4 ${
                                sprintMetric.commentary.includes('excellent') || sprintMetric.commentary.includes('great') ? 
                                  'bg-green-50 border-green-400 text-green-800' :
                                sprintMetric.commentary.includes('warning') || sprintMetric.commentary.includes('attention') ?
                                  'bg-yellow-50 border-yellow-400 text-yellow-800' :
                                sprintMetric.commentary.includes('concern') || sprintMetric.commentary.includes('critical') ?
                                  'bg-red-50 border-red-400 text-red-800' :
                                  'bg-blue-50 border-blue-400 text-blue-800'
                              }`}>
                                {sprintMetric.commentary}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic">
                                No commentary available
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sprints without metrics */}
      {sprints.withoutMetrics.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sprints Without Metrics ({sprints.withoutMetrics.length})
          </h2>
          <div className="space-y-3">
            {sprints.withoutMetrics.map((sprint) => (
              <div key={sprint.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <h3 className="font-medium text-gray-900">{sprint.name}</h3>
                  <p className="text-sm text-gray-600">
                    State: <span className="capitalize">{sprint.state}</span>
                    {sprint.startDate && ` • Started: ${new Date(sprint.startDate).toLocaleDateString()}`}
                    {sprint.endDate && ` • Ends: ${new Date(sprint.endDate).toLocaleDateString()}`}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  sprint.state === 'active' ? 'bg-green-100 text-green-800' :
                  sprint.state === 'closed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {sprint.state}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Click "Calculate Metrics" to generate metrics for these sprints.
          </div>
        </div>
      )}

      {/* All Sprints List */}
      {sprints.all.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Sprints ({sprints.all.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-green-700 mb-2">Active ({sprints.active.length})</h3>
              {sprints.active.map((sprint) => (
                <div key={sprint.id} className="mb-2 p-2 bg-green-50 rounded text-sm">
                  {sprint.name}
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-700 mb-2">Completed ({sprints.completed.length})</h3>
              {sprints.completed.slice(0, 5).map((sprint) => (
                <div key={sprint.id} className="mb-2 p-2 bg-blue-50 rounded text-sm">
                  {sprint.name}
                </div>
              ))}
              {sprints.completed.length > 5 && (
                <div className="text-xs text-gray-500">... and {sprints.completed.length - 5} more</div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Future ({sprints.future.length})</h3>
              {sprints.future.map((sprint) => (
                <div key={sprint.id} className="mb-2 p-2 bg-gray-50 rounded text-sm">
                  {sprint.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sprints.all.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sprints found</h3>
          <p className="mt-1 text-sm text-gray-500">
            This board doesn't have any sprints yet.
          </p>
        </div>
      )}
    </div>
  )
}

export default BoardDetails
