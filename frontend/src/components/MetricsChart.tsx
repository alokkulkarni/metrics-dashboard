import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface SprintMetric {
  id: number
  sprintId: number
  velocity?: number
  completionRate?: number
  churnRate?: number
  qualityRate?: number
  defectLeakageRate?: number
  replanningRate?: number
  averageCycleTime?: number
  averageLeadTime?: number
  completedStoryPoints?: number
  totalStoryPoints?: number
  completedIssues?: number
  totalIssues?: number
  sprint?: {
    name?: string
    state?: string
    startDate?: string
    endDate?: string
  }
}

interface MetricsChartProps {
  sprintMetrics: SprintMetric[]
  chartType?: 'velocity' | 'completion' | 'quality' | 'time' | 'overview'
  className?: string
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  tertiary: '#F59E0B',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981'
}

const MetricsChart: React.FC<MetricsChartProps> = ({ 
  sprintMetrics, 
  chartType = 'overview',
  className = ''
}) => {
  // Sort sprints by start date for proper chronological order
  const sortedMetrics = React.useMemo(() => {
    return [...sprintMetrics]
      .filter(metric => metric.sprint?.state === 'closed' || metric.sprint?.state === 'active') // Include both closed and active sprints
      .sort((a, b) => {
        const aDate = a.sprint?.startDate ? new Date(a.sprint.startDate).getTime() : 0
        const bDate = b.sprint?.startDate ? new Date(b.sprint.startDate).getTime() : 0
        return aDate - bDate
      })
      .map(metric => ({
        ...metric,
        sprintName: metric.sprint?.name?.replace(/^.*Sprint\s*/, 'S') || `S${metric.sprintId}`,
        fullSprintName: metric.sprint?.name || `Sprint ${metric.sprintId}`
      }))
  }, [sprintMetrics])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.fullSprintName}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-blue-600">
              {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}${entry.name.includes('Rate') || entry.name.includes('Completion') ? '%' : entry.name.includes('Time') ? ' days' : ''}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Velocity and Story Points Chart
  const renderVelocityChart = () => {
    console.log('Rendering velocity chart with data:', sortedMetrics)
    
    if (sortedMetrics.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Velocity Data Available</h3>
          <p className="text-gray-500">
            No sprint data available for velocity chart.
          </p>
        </div>
      )
    }
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Velocity Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={sortedMetrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="sprintName" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="velocity"
              name="Velocity"
              stroke={COLORS.primary}
              fill={`${COLORS.primary}20`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="completedStoryPoints"
              name="Completed Story Points"
              stroke={COLORS.secondary}
              fill={`${COLORS.secondary}20`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Completion and Quality Rates Chart
  const renderCompletionChart = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Completion & Quality Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={sortedMetrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="sprintName" 
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            stroke="#666" 
            fontSize={12}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="completionRate"
            name="Completion Rate"
            stroke={COLORS.success}
            strokeWidth={3}
            dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="qualityRate"
            name="Quality Rate"
            stroke={COLORS.primary}
            strokeWidth={3}
            dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="churnRate"
            name="Churn Rate"
            stroke={COLORS.warning}
            strokeWidth={2}
            dot={{ fill: COLORS.warning, strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  // Quality Metrics Chart
  const renderQualityChart = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Quality Metrics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedMetrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="sprintName" 
            stroke="#666"
            fontSize={12}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="defectLeakageRate"
            name="Defect Rate"
            fill={COLORS.danger}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="replanningRate"
            name="Replanning Rate"
            fill={COLORS.warning}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  // Time Metrics Chart
  const renderTimeChart = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Time Metrics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={sortedMetrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="sprintName" 
            stroke="#666"
            fontSize={12}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="averageCycleTime"
            name="Avg Cycle Time"
            stroke={COLORS.primary}
            strokeWidth={3}
            dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="averageLeadTime"
            name="Avg Lead Time"
            stroke={COLORS.secondary}
            strokeWidth={3}
            dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  // Overview Dashboard with multiple small charts
  const renderOverviewChart = () => {
    // Calculate average metrics for pie charts
    const avgMetrics = React.useMemo(() => {
      if (sortedMetrics.length === 0) return null
      
      const totals = sortedMetrics.reduce(
        (acc, metric) => ({
          velocity: acc.velocity + (metric.velocity || 0),
          completionRate: acc.completionRate + (metric.completionRate || 0),
          qualityRate: acc.qualityRate + (metric.qualityRate || 100),
          churnRate: acc.churnRate + (metric.churnRate || 0),
          defectRate: acc.defectRate + (metric.defectLeakageRate || 0)
        }),
        { velocity: 0, completionRate: 0, qualityRate: 0, churnRate: 0, defectRate: 0 }
      )
      
      const count = sortedMetrics.length
      return {
        velocity: totals.velocity / count,
        completionRate: totals.completionRate / count,
        qualityRate: totals.qualityRate / count,
        churnRate: totals.churnRate / count,
        defectRate: totals.defectRate / count
      }
    }, [sortedMetrics])

    const performanceData = avgMetrics ? [
      { name: 'Completion Rate', value: avgMetrics.completionRate, color: COLORS.success },
      { name: 'Quality Rate', value: avgMetrics.qualityRate, color: COLORS.primary },
      { name: 'Issues', value: 100 - avgMetrics.completionRate, color: '#E5E7EB' }
    ] : []

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Metrics Overview</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Velocity Trend */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="text-md font-medium text-gray-800 mb-3">Velocity Trend</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sortedMetrics.slice(-8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="sprintName" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="velocity"
                  stroke={COLORS.primary}
                  fill={`${COLORS.primary}30`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="text-md font-medium text-gray-800 mb-3">Average Performance</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={performanceData.slice(0, 2)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {performanceData.slice(0, 2).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quality Trends */}
          <div className="bg-white p-4 rounded-lg border lg:col-span-2">
            <h4 className="text-md font-medium text-gray-800 mb-3">Quality & Process Metrics</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sortedMetrics.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="sprintName" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="churnRate" name="Churn %" fill={COLORS.warning} />
                <Bar dataKey="defectLeakageRate" name="Defect %" fill={COLORS.danger} />
                <Bar dataKey="replanningRate" name="Replan %" fill={COLORS.tertiary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  // Render appropriate chart based on type
  const renderChart = () => {
    try {
      switch (chartType) {
        case 'velocity':
          return renderVelocityChart()
        case 'completion':
          return renderCompletionChart()
        case 'quality':
          return renderQualityChart()
        case 'time':
          return renderTimeChart()
        case 'overview':
        default:
          return renderOverviewChart()
      }
    } catch (error) {
      console.error('Error rendering chart:', error)
      return (
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-1">Chart Rendering Error</h3>
          <p className="text-red-600">
            An error occurred while rendering the chart. Please try again.
          </p>
        </div>
      )
    }
  }

  if (sortedMetrics.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Chart Data Available</h3>
        <p className="text-gray-500">
          Complete at least 2 sprints with metrics to view trend charts.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow border ${className}`}>
      {renderChart()}
    </div>
  )
}

export default MetricsChart