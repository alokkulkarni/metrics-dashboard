import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface ScrumBoardSummary {
  board: {
    id: number
    name: string
    projectKey: string
    projectName: string
  }
  counts: {
    totalSprints: number
    activeSprints: number
    completedSprints: number
  }
  metrics: {
    averageVelocity: string
    averageCycleTime?: string
    averageLeadTime?: string
    averageChurnRate?: string
    averageCompletionRate?: string
  }
  activeSprints?: Array<{
    startDate?: string
    endDate?: string
  }>
}

interface KanbanBoardMetrics {
  boardInfo: {
    id: number
    name: string
    projectId: number
  }
  statusMetrics: {
    totalIssues: number
  }
  timeMetrics: {
    averageCycleTime?: number
    averageLeadTime?: number
  }
  qualityMetrics: {
    flowEfficiency?: number
    wipViolations?: number
  }
}

interface BoardPerformanceTableProps {
  scrumBoards?: ScrumBoardSummary[]
  kanbanBoards?: KanbanBoardMetrics[]
}

type SortDirection = 'asc' | 'desc' | null
type ScrumSortField = 'name' | 'project' | 'status' | 'sprints' | 'velocity' | 'cycleTime' | 'leadTime' | 'churnRate' | 'completionRate'
type KanbanSortField = 'name' | 'project' | 'totalIssues' | 'cycleTime' | 'leadTime' | 'flowEfficiency' | 'wipViolations'

const BoardPerformanceTable: React.FC<BoardPerformanceTableProps> = ({
  scrumBoards = [],
  kanbanBoards = []
}) => {
  const [activeTab, setActiveTab] = useState<'scrum' | 'kanban'>('scrum')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Sorting state
  const [scrumSortField, setScrumSortField] = useState<ScrumSortField | null>(null)
  const [scrumSortDirection, setScrumSortDirection] = useState<SortDirection>(null)
  const [kanbanSortField, setKanbanSortField] = useState<KanbanSortField | null>(null)
  const [kanbanSortDirection, setKanbanSortDirection] = useState<SortDirection>(null)

  // Sorting handlers
  const handleScrumSort = (field: ScrumSortField) => {
    if (scrumSortField === field) {
      // Cycle through: asc -> desc -> null
      if (scrumSortDirection === 'asc') {
        setScrumSortDirection('desc')
      } else if (scrumSortDirection === 'desc') {
        setScrumSortDirection(null)
        setScrumSortField(null)
      } else {
        setScrumSortDirection('asc')
      }
    } else {
      setScrumSortField(field)
      setScrumSortDirection('asc')
    }
  }

  const handleKanbanSort = (field: KanbanSortField) => {
    if (kanbanSortField === field) {
      // Cycle through: asc -> desc -> null
      if (kanbanSortDirection === 'asc') {
        setKanbanSortDirection('desc')
      } else if (kanbanSortDirection === 'desc') {
        setKanbanSortDirection(null)
        setKanbanSortField(null)
      } else {
        setKanbanSortDirection('asc')
      }
    } else {
      setKanbanSortField(field)
      setKanbanSortDirection('asc')
    }
  }

  // Sort icon component
  const SortIcon: React.FC<{ field: string; activeField: string | null; direction: SortDirection }> = ({ 
    field, 
    activeField, 
    direction 
  }) => {
    if (activeField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />
    }
    
    if (direction === 'asc') {
      return <ChevronUp className="h-4 w-4 text-blue-600" />
    } else if (direction === 'desc') {
      return <ChevronDown className="h-4 w-4 text-blue-600" />
    }
    
    return <ChevronsUpDown className="h-4 w-4 text-gray-400" />
  }

  // Sortable header component
  const SortableHeader: React.FC<{
    children: React.ReactNode
    field: ScrumSortField | KanbanSortField
    onClick: (field: any) => void
    activeField: string | null
    direction: SortDirection
    className?: string
  }> = ({ children, field, onClick, activeField, direction, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => onClick(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <SortIcon field={field} activeField={activeField} direction={direction} />
      </div>
    </th>
  )

  // Filter and sort Scrum boards
  const filteredScrumBoards = useMemo(() => {
    const filtered = scrumBoards.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      return (
        item.board.name.toLowerCase().includes(searchLower) ||
        item.board.projectKey.toLowerCase().includes(searchLower) ||
        item.board.projectName.toLowerCase().includes(searchLower)
      )
    })

    return filtered.sort((a, b) => {
      // If we have a sort field, use it
      if (scrumSortField && scrumSortDirection) {
        let aValue: any, bValue: any
        
        switch (scrumSortField) {
          case 'name':
            aValue = a.board.name || ''
            bValue = b.board.name || ''
            break
          case 'project':
            aValue = a.board.projectKey || ''
            bValue = b.board.projectKey || ''
            break
          case 'status':
            aValue = (a.counts?.activeSprints || 0) > 0 ? 1 : 0
            bValue = (b.counts?.activeSprints || 0) > 0 ? 1 : 0
            break
          case 'sprints':
            aValue = a.counts?.totalSprints || 0
            bValue = b.counts?.totalSprints || 0
            break
          case 'velocity':
            aValue = parseFloat(a.metrics?.averageVelocity || '0')
            bValue = parseFloat(b.metrics?.averageVelocity || '0')
            break
          case 'cycleTime':
            aValue = parseFloat(a.metrics?.averageCycleTime || '0')
            bValue = parseFloat(b.metrics?.averageCycleTime || '0')
            break
          case 'leadTime':
            aValue = parseFloat(a.metrics?.averageLeadTime || '0')
            bValue = parseFloat(b.metrics?.averageLeadTime || '0')
            break
          case 'churnRate':
            aValue = parseFloat(a.metrics?.averageChurnRate || '0')
            bValue = parseFloat(b.metrics?.averageChurnRate || '0')
            // Handle NaN values
            aValue = isNaN(aValue) ? 0 : aValue
            bValue = isNaN(bValue) ? 0 : bValue
            break
          case 'completionRate':
            aValue = parseFloat(a.metrics?.averageCompletionRate || '0')
            bValue = parseFloat(b.metrics?.averageCompletionRate || '0')
            break
          default:
            aValue = ''
            bValue = ''
        }
        
        if (typeof aValue === 'string') {
          const comparison = aValue.localeCompare(bValue)
          return scrumSortDirection === 'asc' ? comparison : -comparison
        } else {
          const comparison = aValue - bValue
          return scrumSortDirection === 'asc' ? comparison : -comparison
        }
      }

      // Default sorting (fallback when no sort is applied)
      // First sort by active status (active boards first)
      const aIsActive = (a.counts?.activeSprints || 0) > 0
      const bIsActive = (b.counts?.activeSprints || 0) > 0
      
      if (aIsActive !== bIsActive) {
        return bIsActive ? 1 : -1 // Active boards first
      }
      
      // For active boards with multiple sprints, sort by the most recent sprint start date
      if (aIsActive && bIsActive && a.activeSprints && b.activeSprints) {
        const aLatestSprint = a.activeSprints[0] // Already sorted by backend
        const bLatestSprint = b.activeSprints[0] // Already sorted by backend
        
        if (aLatestSprint && bLatestSprint) {
          const aStartDate = aLatestSprint.startDate ? new Date(aLatestSprint.startDate).getTime() : 0
          const bStartDate = bLatestSprint.startDate ? new Date(bLatestSprint.startDate).getTime() : 0
          
          if (aStartDate !== bStartDate) {
            return bStartDate - aStartDate // Most recent start date first
          }
          
          // If start dates are same, sort by end date
          const aEndDate = aLatestSprint.endDate ? new Date(aLatestSprint.endDate).getTime() : 0
          const bEndDate = bLatestSprint.endDate ? new Date(bLatestSprint.endDate).getTime() : 0
          
          if (aEndDate !== bEndDate) {
            return aEndDate - bEndDate // Earliest end date first
          }
        }
      }
      
      // Then sort by project key
      const aProjectKey = a.board.projectKey || ''
      const bProjectKey = b.board.projectKey || ''
      
      if (aProjectKey !== bProjectKey) {
        return aProjectKey.localeCompare(bProjectKey)
      }
      
      // Finally sort by board name within the same project
      return (a.board.name || '').localeCompare(b.board.name || '')
    })
  }, [scrumBoards, searchTerm, scrumSortField, scrumSortDirection])

  // Filter and sort Kanban boards
  const filteredKanbanBoards = useMemo(() => {
    const filtered = kanbanBoards.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      return (
        item.boardInfo.name.toLowerCase().includes(searchLower) ||
        item.boardInfo.projectId.toString().includes(searchLower)
      )
    })

    return filtered.sort((a, b) => {
      // If we have a sort field, use it
      if (kanbanSortField && kanbanSortDirection) {
        let aValue: any, bValue: any
        
        switch (kanbanSortField) {
          case 'name':
            aValue = a.boardInfo.name || ''
            bValue = b.boardInfo.name || ''
            break
          case 'project':
            aValue = a.boardInfo.projectId || 0
            bValue = b.boardInfo.projectId || 0
            break
          case 'totalIssues':
            aValue = a.statusMetrics?.totalIssues || 0
            bValue = b.statusMetrics?.totalIssues || 0
            break
          case 'cycleTime':
            aValue = a.timeMetrics?.averageCycleTime || 0
            bValue = b.timeMetrics?.averageCycleTime || 0
            break
          case 'leadTime':
            aValue = a.timeMetrics?.averageLeadTime || 0
            bValue = b.timeMetrics?.averageLeadTime || 0
            break
          case 'flowEfficiency':
            aValue = a.qualityMetrics?.flowEfficiency || 0
            bValue = b.qualityMetrics?.flowEfficiency || 0
            break
          case 'wipViolations':
            aValue = a.qualityMetrics?.wipViolations || 0
            bValue = b.qualityMetrics?.wipViolations || 0
            break
          default:
            aValue = ''
            bValue = ''
        }
        
        if (typeof aValue === 'string') {
          const comparison = aValue.localeCompare(bValue)
          return kanbanSortDirection === 'asc' ? comparison : -comparison
        } else {
          const comparison = aValue - bValue
          return kanbanSortDirection === 'asc' ? comparison : -comparison
        }
      }

      // Default sorting (fallback when no sort is applied)
      // Sort by project key first
      const aProjectKey = a.boardInfo?.projectId || 0
      const bProjectKey = b.boardInfo?.projectId || 0
      
      if (aProjectKey !== bProjectKey) {
        return aProjectKey - bProjectKey
      }
      
      // Then sort by board name within the same project
      return (a.boardInfo?.name || '').localeCompare(b.boardInfo?.name || '')
    })
  }, [kanbanBoards, searchTerm, kanbanSortField, kanbanSortDirection])

  const clearSearch = () => {
    setSearchTerm('')
  }

  const currentBoardCount = activeTab === 'scrum' ? filteredScrumBoards.length : filteredKanbanBoards.length
  const totalBoardCount = activeTab === 'scrum' ? scrumBoards.length : kanbanBoards.length

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Board Performance Summary</h2>
        
        {/* Tab buttons */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setActiveTab('scrum')
              setSearchTerm('')
              // Reset sorting when switching tabs
              setKanbanSortField(null)
              setKanbanSortDirection(null)
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'scrum'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Scrum Boards ({scrumBoards.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('kanban')
              setSearchTerm('')
              // Reset sorting when switching tabs
              setScrumSortField(null)
              setScrumSortDirection(null)
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'kanban'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Kanban Boards ({kanbanBoards.length})
          </button>
        </div>
      </div>

      {/* Search box */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={`Search ${activeTab} boards...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        {searchTerm && (
          <p className="mt-2 text-sm text-gray-600">
            Showing {currentBoardCount} of {totalBoardCount} {activeTab} boards
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {activeTab === 'scrum' ? (
                <>
                  <SortableHeader 
                    field="name" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Board
                  </SortableHeader>
                  <SortableHeader 
                    field="project" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Project
                  </SortableHeader>
                  <SortableHeader 
                    field="status" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Status
                  </SortableHeader>
                  <SortableHeader 
                    field="sprints" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Sprints
                  </SortableHeader>
                  <SortableHeader 
                    field="velocity" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Avg Velocity
                  </SortableHeader>
                  <SortableHeader 
                    field="cycleTime" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Avg Cycle Time
                  </SortableHeader>
                  <SortableHeader 
                    field="leadTime" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Avg Lead Time
                  </SortableHeader>
                  <SortableHeader 
                    field="churnRate" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Avg Churn Rate
                  </SortableHeader>
                  <SortableHeader 
                    field="completionRate" 
                    onClick={handleScrumSort}
                    activeField={scrumSortField}
                    direction={scrumSortDirection}
                  >
                    Avg Completion Rate
                  </SortableHeader>
                </>
              ) : (
                <>
                  <SortableHeader 
                    field="name" 
                    onClick={handleKanbanSort}
                    activeField={kanbanSortField}
                    direction={kanbanSortDirection}
                  >
                    Board
                  </SortableHeader>
                  <SortableHeader 
                    field="project" 
                    onClick={handleKanbanSort}
                    activeField={kanbanSortField}
                    direction={kanbanSortDirection}
                  >
                    Project
                  </SortableHeader>
                  <SortableHeader 
                    field="totalIssues" 
                    onClick={handleKanbanSort}
                    activeField={kanbanSortField}
                    direction={kanbanSortDirection}
                  >
                    Total Issues
                  </SortableHeader>
                  <SortableHeader 
                    field="flowEfficiency" 
                    onClick={handleKanbanSort}
                    activeField={kanbanSortField}
                    direction={kanbanSortDirection}
                  >
                    Flow Efficiency
                  </SortableHeader>
                  <SortableHeader 
                    field="wipViolations" 
                    onClick={handleKanbanSort}
                    activeField={kanbanSortField}
                    direction={kanbanSortDirection}
                  >
                    WIP Violations
                  </SortableHeader>
                  <SortableHeader 
                    field="cycleTime" 
                    onClick={handleKanbanSort}
                    activeField={kanbanSortField}
                    direction={kanbanSortDirection}
                  >
                    Avg Cycle Time
                  </SortableHeader>
                  <SortableHeader 
                    field="leadTime" 
                    onClick={handleKanbanSort}
                    activeField={kanbanSortField}
                    direction={kanbanSortDirection}
                  >
                    Avg Lead Time
                  </SortableHeader>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activeTab === 'scrum' ? (
              filteredScrumBoards.length > 0 ? (
                filteredScrumBoards.map((item) => {
                  const isActive = (item.counts?.activeSprints || 0) > 0
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.metrics?.averageChurnRate 
                          ? (() => {
                              const churnValue = parseFloat(item.metrics.averageChurnRate);
                              return isNaN(churnValue) ? '0.0%' : `${churnValue.toFixed(1)}%`;
                            })()
                          : '0.0%'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.metrics?.averageCompletionRate 
                          ? `${parseFloat(item.metrics.averageCompletionRate).toFixed(1)}%`
                          : 'N/A'
                        }
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
                    {searchTerm ? 'No scrum boards match your search.' : 'No scrum boards available.'}
                  </td>
                </tr>
              )
            ) : (
              filteredKanbanBoards.length > 0 ? (
                filteredKanbanBoards.map((item) => (
                  <tr key={item.boardInfo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        to={`/kanban-boards/${item.boardInfo.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {item.boardInfo.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">Project ID: {item.boardInfo.projectId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.statusMetrics?.totalIssues || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.qualityMetrics?.flowEfficiency 
                        ? `${parseFloat(item.qualityMetrics.flowEfficiency.toString()).toFixed(1)}%`
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.qualityMetrics?.wipViolations || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.timeMetrics?.averageCycleTime 
                        ? `${parseFloat(item.timeMetrics.averageCycleTime.toString()).toFixed(1)} days`
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.timeMetrics?.averageLeadTime 
                        ? `${parseFloat(item.timeMetrics.averageLeadTime.toString()).toFixed(1)} days`
                        : 'N/A'
                      }
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    {searchTerm ? 'No kanban boards match your search.' : 'No kanban boards available.'}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BoardPerformanceTable
