import React, { useState, useMemo } from 'react'
import { TrendingUp, Users, X } from 'lucide-react'
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { SprintMetricsData } from '../services/boardService'

interface TrendsVisualizationProps {
  sprintMetrics: SprintMetricsData[]
  boardName: string
  onClose: () => void
}

interface ChartDataPoint {
  sprintName: string
  sprintId: number
  velocity: number
  completionRate: number
  churnRate: number
  qualityRate: number
  defectLeakageRate: number
  averageCycleTime: number | null
  averageLeadTime: number | null
  replanningRate: number
  team?: string
  isActive: boolean
  startDate: string
}

// Extract team name from sprint name (common patterns)
const extractTeamFromSprintName = (sprintName: string): string => {
  // Common patterns: "Team Alpha - Sprint 1", "Alpha Sprint 1", "Sprint 1 - Team Alpha"
  const patterns = [
    /^(.+?)\s*-\s*Sprint/i,           // "Team Alpha - Sprint 1"
    /^(.+?)\s+Sprint/i,               // "Alpha Sprint 1"
    /Sprint\s+\d+\s*-\s*(.+)$/i,     // "Sprint 1 - Team Alpha"
    /^(\w+)\s*\d+/i,                  // "Alpha1", "TeamAlpha1"
  ]
  
  for (const pattern of patterns) {
    const match = sprintName.match(pattern)
    if (match && match[1]) {
      const team = match[1].trim()
      // Filter out common sprint-related words
      if (!['sprint', 'iteration', 'pi', 'release'].includes(team.toLowerCase())) {
        return team
      }
    }
  }
  
  // Fallback: try to find team identifiers in the name
  const words = sprintName.split(/[\s\-_]+/)
  for (const word of words) {
    if (word.length > 2 && !word.match(/^\d+$/) && !['sprint', 'iteration', 'pi', 'release'].includes(word.toLowerCase())) {
      return word
    }
  }
  
  return 'Default'
}

const TrendsVisualization: React.FC<TrendsVisualizationProps> = ({
  sprintMetrics,
  boardName,
  onClose
}) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['velocity', 'completionRate'])

  // Process data and extract teams
  const { chartData, teams } = useMemo(() => {
    const processedData: ChartDataPoint[] = sprintMetrics
      .filter(sprint => sprint.sprint) // Only sprints with sprint data
      .map(sprint => {
        const team = extractTeamFromSprintName(sprint.sprint!.name)
        
        // Helper function to safely convert values to numbers, handling null/undefined/NaN
        const safeNumber = (value: any): number => {
          if (value === null || value === undefined) return 0
          const num = Number(value)
          return isNaN(num) ? 0 : num
        }
        
        // Helper function to safely convert values to numbers, allowing null for optional fields
        const safeOptionalNumber = (value: any): number | null => {
          if (value === null || value === undefined) return null
          const num = Number(value)
          return isNaN(num) ? null : num
        }
        
        return {
          sprintName: sprint.sprint!.name,
          sprintId: sprint.sprintId,
          velocity: safeNumber(sprint.velocity),
          completionRate: safeNumber(sprint.completionRate),
          churnRate: safeNumber(sprint.churnRate),
          qualityRate: safeNumber(sprint.qualityRate),
          defectLeakageRate: safeNumber(sprint.defectLeakageRate),
          averageCycleTime: safeOptionalNumber(sprint.averageCycleTime),
          averageLeadTime: safeOptionalNumber(sprint.averageLeadTime),
          replanningRate: safeNumber(sprint.replanningRate),
          team,
          isActive: sprint.sprint!.state === 'active',
          startDate: sprint.sprint!.startDate
        }
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    const uniqueTeams = Array.from(new Set(processedData.map(d => d.team))).sort()

    return {
      chartData: processedData,
      teams: uniqueTeams
    }
  }, [sprintMetrics])

  // Filter data by selected team
  const filteredData = useMemo(() => {
    if (selectedTeam === 'all') return chartData
    return chartData.filter(d => d.team === selectedTeam)
  }, [chartData, selectedTeam])

  const metricOptions = [
    { key: 'velocity', label: 'Velocity', color: '#3B82F6', type: 'line' },
    { key: 'completionRate', label: 'Completion Rate (%)', color: '#10B981', type: 'area' },
    { key: 'churnRate', label: 'Churn Rate (%)', color: '#F59E0B', type: 'line' },
    { key: 'qualityRate', label: 'Quality Rate (%)', color: '#06B6D4', type: 'area' },
    { key: 'defectLeakageRate', label: 'Defect Rate (%)', color: '#EF4444', type: 'line' },
    { key: 'averageCycleTime', label: 'Cycle Time (days)', color: '#8B5CF6', type: 'line' },
    { key: 'averageLeadTime', label: 'Lead Time (days)', color: '#EC4899', type: 'line' },
    { key: 'replanningRate', label: 'Replanning Rate (%)', color: '#F97316', type: 'line' },
  ]

  const handleMetricToggle = (metricKey: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">Team: {data.team || 'Unknown'}</p>
          <p className="text-sm text-gray-600">
            Status: <span className={`font-medium ${data.isActive ? 'text-green-600' : 'text-blue-600'}`}>
              {data.isActive ? 'Active' : 'Completed'}
            </span>
          </p>
          <div className="mt-2 space-y-1">
            {payload.map((entry: any, index: number) => {
              // Helper function to format values properly
              const formatValue = (value: any, metricName: string): string => {
                if (value === null || value === undefined) {
                  return 'N/A'
                }
                
                const num = Number(value)
                if (isNaN(num)) {
                  return '0'
                }
                
                // For percentages and rates, format to 1 decimal place
                if (metricName.includes('Rate') || metricName.includes('%')) {
                  return num.toFixed(1)
                }
                
                // For time metrics, format to 1 decimal place
                if (metricName.includes('Time')) {
                  return num.toFixed(1)
                }
                
                // For velocity, format to 1 decimal place
                return num.toFixed(1)
              }
              
              const formattedValue = formatValue(entry.value, entry.name)
              const unit = entry.name.includes('Rate') || entry.name.includes('%') ? '%' : 
                          entry.name.includes('Time') ? ' days' : ''
              
              return (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    {entry.name}:
                  </span>
                  <span className="text-sm font-medium ml-2 text-gray-900">
                    {formattedValue}{unit}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Sprint Trends - {boardName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close trends visualization"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          {/* Team Filter */}
          {teams.length > 1 && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Team:</label>
              </div>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select team for filtering"
                title="Team Filter"
              >
                <option value="all">All Teams ({chartData.length} sprints)</option>
                {teams.map(team => {
                  const teamSprintCount = chartData.filter(d => d.team === team).length
                  return (
                    <option key={team} value={team}>
                      {team} ({teamSprintCount} sprints)
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Metric Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Metrics to Display:
            </label>
            <div className="flex flex-wrap gap-2">
              {metricOptions.map(option => {
                const isSelected = selectedMetrics.includes(option.key)
                const baseClasses = "px-3 py-1 rounded-full text-xs font-medium transition-colors"
                const selectedClasses = isSelected 
                  ? "text-white shadow-sm" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                
                return (
                  <button
                    key={option.key}
                    onClick={() => handleMetricToggle(option.key)}
                    className={`${baseClasses} ${selectedClasses} ${
                      isSelected 
                        ? option.key === 'velocity' ? 'bg-blue-500' :
                          option.key === 'completionRate' ? 'bg-green-500' :
                          option.key === 'churnRate' ? 'bg-yellow-500' :
                          option.key === 'qualityRate' ? 'bg-cyan-500' :
                          option.key === 'defectLeakageRate' ? 'bg-red-500' :
                          option.key === 'averageCycleTime' ? 'bg-purple-500' :
                          option.key === 'averageLeadTime' ? 'bg-pink-500' :
                          option.key === 'replanningRate' ? 'bg-orange-500' : 'bg-gray-500'
                        : ''
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="p-6">
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Data Available</h3>
              <p className="text-gray-500">
                {selectedTeam === 'all' 
                  ? 'No sprint data available for visualization.'
                  : `No sprints found for team "${selectedTeam}".`
                }
              </p>
            </div>
          ) : (
            <div className="w-full h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="sprintName" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Reference line for active sprints */}
                  {filteredData.some(d => d.isActive) && (
                    <ReferenceLine 
                      x={filteredData.find(d => d.isActive)?.sprintName} 
                      stroke="#10B981" 
                      strokeDasharray="2 2"
                      label={{ value: "Active", position: "top" }}
                    />
                  )}

                  {/* Render selected metrics */}
                  {selectedMetrics.map(metricKey => {
                    const option = metricOptions.find(opt => opt.key === metricKey)
                    if (!option) return null

                    if (option.type === 'area') {
                      return (
                        <Area
                          key={metricKey}
                          type="monotone"
                          dataKey={metricKey}
                          stroke={option.color}
                          fill={option.color}
                          fillOpacity={0.1}
                          strokeWidth={2}
                          name={option.label}
                          connectNulls={false}
                        />
                      )
                    } else {
                      return (
                        <Line
                          key={metricKey}
                          type="monotone"
                          dataKey={metricKey}
                          stroke={option.color}
                          strokeWidth={2}
                          dot={{ fill: option.color, strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: option.color, strokeWidth: 2 }}
                          name={option.label}
                          connectNulls={false}
                        />
                      )
                    }
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary Stats */}
          {filteredData.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Sprints</div>
                <div className="text-2xl font-bold text-blue-900">{filteredData.length}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Active Sprints</div>
                <div className="text-2xl font-bold text-green-900">
                  {filteredData.filter(d => d.isActive).length}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Avg Velocity</div>
                <div className="text-2xl font-bold text-purple-900">
                  {(() => {
                    const validVelocities = filteredData
                      .map(d => d.velocity)
                      .filter(v => !isNaN(v) && v !== null && v !== undefined)
                    const avg = validVelocities.length > 0 
                      ? validVelocities.reduce((sum, v) => sum + v, 0) / validVelocities.length
                      : 0
                    return avg.toFixed(1)
                  })()}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Avg Completion</div>
                <div className="text-2xl font-bold text-orange-900">
                  {(() => {
                    const validCompletionRates = filteredData
                      .map(d => d.completionRate)
                      .filter(v => !isNaN(v) && v !== null && v !== undefined)
                    const avg = validCompletionRates.length > 0 
                      ? validCompletionRates.reduce((sum, v) => sum + v, 0) / validCompletionRates.length
                      : 0
                    return avg.toFixed(1)
                  })()}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrendsVisualization
