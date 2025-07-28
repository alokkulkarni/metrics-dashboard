import React, { useEffect, useState } from 'react'
import { Users, ArrowUpDown } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { logger } from '../utils/logger'

interface ResourceSprint {
  sprintId: number
  sprintName: string
  boardName: string
  projectName: string
  projectKey: string
  state: string
  startDate: string
  endDate: string
  assignedTickets: number
  reportedTickets: number
  totalTickets: number
  issueTypes: Record<string, number>
  allocationPercentage?: number
  isOverlapping?: boolean
}

interface OverlappingSprint {
  sprintName: string
  startDate?: string
  endDate?: string
  boardName: string
  ticketCount: number
  allocationPercentage: number
}

interface ResourceSpreadData {
  resourceName: string
  roles: string[]
  roleDisplay: string
  roleColor: string
  sprints: ResourceSprint[]
  totalSprints: number
  activeSprints: number
  totalTickets: number
  assignedTickets: number
  reportedTickets: number
  commonIssueTypes: string[]
  overlappingSprints: OverlappingSprint[]
  lastActivityDate?: string
  lastActivitySprint?: string
  lastActivitySprintState?: string
  lastActivityType?: string
  isActive?: boolean
}

const ResourceSpread: React.FC = () => {
  const [activeResources, setActiveResources] = useState<ResourceSpreadData[]>([])
  const [inactiveResources, setInactiveResources] = useState<ResourceSpreadData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'sprints' | 'tickets' | 'lastActivity'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filter, setFilter] = useState('')
  const [activeSprintsFilter, setActiveSprintsFilter] = useState<'all' | 'moreThanOne' | 'hasActive'>('all')
  const [projectKeyFilter, setProjectKeyFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')

  useEffect(() => {
    fetchResourceData()
  }, [])

  const fetchResourceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch enhanced resource data from new endpoint
      const resourceResponse = await fetch('/api/resources/spread')
      const resourceData = await resourceResponse.json()

      if (!resourceData.success) {
        throw new Error('Failed to fetch resource data')
      }

      const { activeResources: active, inactiveResources: inactive } = resourceData.data
      setActiveResources(active || [])
      setInactiveResources(inactive || [])
    } catch (err) {
      logger.error('Error fetching resource data:', err)
      setError('Failed to load resource data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: 'name' | 'sprints' | 'tickets' | 'lastActivity') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const currentResources = activeTab === 'active' ? activeResources : inactiveResources

  // Helper function to check if a user is an automation user (case-insensitive)
  const isAutomationUser = (name: string) => {
    if (!name) return false;
    const normalizedName = name.toLowerCase().trim();
    return normalizedName === 'automation for jira' || 
           normalizedName === 'automation for jira' ||
           normalizedName.includes('automation for jira');
  };

  const filteredAndSortedResources = currentResources
    .filter((resource: ResourceSpreadData) => {
      // Hide automation users - robust filtering (case-insensitive)
      if (isAutomationUser(resource.resourceName)) {
        return false;
      }
      
      // Name filter
      const nameMatch = resource.resourceName.toLowerCase().includes(filter.toLowerCase())
      
      // Active sprints filter (only applicable to active tab)
      let activeSprintsMatch = true
      if (activeTab === 'active') {
        switch (activeSprintsFilter) {
          case 'moreThanOne':
            activeSprintsMatch = resource.activeSprints > 1
            break
          case 'hasActive':
            activeSprintsMatch = resource.activeSprints > 0
            break
          case 'all':
          default:
            activeSprintsMatch = true
            break
        }
      }
      
      // Project key filter
      const projectKeyMatch = projectKeyFilter === '' || 
        resource.sprints.some((sprint: ResourceSprint) => 
          sprint.projectKey.toLowerCase().includes(projectKeyFilter.toLowerCase())
        )
      
      return nameMatch && activeSprintsMatch && projectKeyMatch
    })
    .sort((a: ResourceSpreadData, b: ResourceSpreadData) => {
      // For active resources: prioritize those with active sprints
      if (activeTab === 'active') {
        const aHasActive = a.activeSprints > 0
        const bHasActive = b.activeSprints > 0
        
        if (aHasActive && !bHasActive) return -1
        if (!aHasActive && bHasActive) return 1
      }
      
      // Sort by selected criteria
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.resourceName.localeCompare(b.resourceName)
          break
        case 'sprints':
          comparison = a.totalSprints - b.totalSprints
          break
        case 'tickets':
          comparison = a.totalTickets - b.totalTickets
          break
        case 'lastActivity':
          // Sort by last activity date (null dates go to end)
          if (!a.lastActivityDate && !b.lastActivityDate) return 0
          if (!a.lastActivityDate) return 1
          if (!b.lastActivityDate) return -1
          comparison = new Date(a.lastActivityDate).getTime() - new Date(b.lastActivityDate).getTime()
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-red-800">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resource Spread</h1>
            <p className="text-gray-600">Team member assignments across boards and sprints</p>
          </div>
        </div>
        <button
          onClick={fetchResourceData}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {activeResources.length + inactiveResources.length}
            </div>
            <div className="text-sm font-medium text-gray-500">
              <span 
                title="Total number of unique users found in Jira, including both active and inactive team members"
                className="cursor-help underline decoration-dotted"
              >
                Total Resources
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {activeResources.filter((r: ResourceSpreadData) => r.activeSprints > 1).length}
            </div>
            <div className="text-sm font-medium text-gray-500">
              <span 
                title="Number of resources currently working on more than 1 active sprint simultaneously"
                className="cursor-help underline decoration-dotted"
              >
                Multi-Sprint Resources
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {activeResources.reduce((sum: number, r: ResourceSpreadData) => sum + r.totalTickets, 0)}
            </div>
            <div className="text-sm font-medium text-gray-500">
              <span 
                title="Total number of tickets (assigned + reported) by all active team members"
                className="cursor-help underline decoration-dotted"
              >
                Total Tickets Assigned
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="space-y-4">
          <div className="flex items-center space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search resources..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {activeTab === 'active' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Active Sprints:</label>
                <select
                  title="Filter by active sprints"
                  value={activeSprintsFilter}
                  onChange={(e) => setActiveSprintsFilter(e.target.value as 'all' | 'moreThanOne' | 'hasActive')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Resources</option>
                  <option value="hasActive">Has Active Sprints</option>
                  <option value="moreThanOne">More than 1 Active</option>
                </select>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Project:</label>
              <input
                type="text"
                placeholder="Filter by project key..."
                value={projectKeyFilter}
                onChange={(e) => setProjectKeyFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Showing {filteredAndSortedResources.length} of {currentResources.length} resources
          </div>
        </div>
      </div>

      {/* Resource Type Tabs */}
      <div className="bg-white shadow border rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Resources
              <span className="ml-2 bg-blue-100 text-blue-600 py-1 px-2 rounded-full text-xs">
                {activeResources.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'inactive'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inactive Resources
              <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                {inactiveResources.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Resource Table */}
        <div className="p-6">
          {filteredAndSortedResources.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Resource Name</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('tickets')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Tickets & Types</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('sprints')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{activeTab === 'active' ? 'Assignments' : 'Last Activity Details'}</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastActivity')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Last Activity</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'active' ? 'Allocation & Status' : 'Historical Activity'}
                    </th>
                  </tr>
                </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedResources.map((resource) => (
                <tr key={resource.resourceName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {resource.resourceName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {resource.resourceName}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${resource.roleColor}`}
                          >
                            {resource.roleDisplay}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">
                        {resource.totalTickets} total tickets
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {resource.assignedTickets > 0 && (
                          <div>Assigned: {resource.assignedTickets}</div>
                        )}
                        {resource.reportedTickets > 0 && (
                          <div>Reported: {resource.reportedTickets}</div>
                        )}
                      </div>
                      {resource.commonIssueTypes.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Common types:</div>
                          <div className="flex flex-wrap gap-1">
                            {resource.commonIssueTypes.map((type) => (
                              <span 
                                key={type}
                                className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {activeTab === 'active' ? (
                        // Active tab: show current sprint assignments
                        resource.sprints.filter((sprint: ResourceSprint) => sprint.state === 'active').length > 0 ? (
                          resource.sprints.filter((sprint: ResourceSprint) => sprint.state === 'active').map((sprint: ResourceSprint) => (
                            <div key={sprint.sprintId} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">{sprint.sprintName}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">{sprint.projectKey}</span>
                                  <span 
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      sprint.state === 'active' ? 'bg-green-100 text-green-800' :
                                      sprint.state === 'closed' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {sprint.state}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex items-center space-x-4">
                                  <span>Start: {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'N/A'}</span>
                                  <span>End: {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span>Board: {sprint.boardName}</span>
                                  <span>Total: {sprint.totalTickets}</span>
                                  {sprint.assignedTickets > 0 && (
                                    <span>Assigned: {sprint.assignedTickets}</span>
                                  )}
                                  {sprint.reportedTickets > 0 && (
                                    <span>Reported: {sprint.reportedTickets}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No active sprint assignments</span>
                        )
                      ) : (
                        // Inactive tab: show last activity details
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-900">
                            Last worked on: {resource.totalTickets} tickets
                          </div>
                          {resource.lastActivityType && (
                            <div className="text-xs text-gray-600">
                              Role: {resource.lastActivityType === 'assigned' ? 'Assignee' : 'Reporter'}
                            </div>
                          )}
                          {resource.assignedTickets > 0 && (
                            <div className="text-xs text-gray-600">
                              Total assigned: {resource.assignedTickets}
                            </div>
                          )}
                          {resource.reportedTickets > 0 && (
                            <div className="text-xs text-gray-600">
                              Total reported: {resource.reportedTickets}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {resource.lastActivitySprint ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {resource.lastActivitySprint}
                          </div>
                          <div className="text-xs text-gray-500">
                            {resource.lastActivityDate ? 
                              new Date(resource.lastActivityDate).toLocaleDateString() : 
                              'N/A'
                            }
                          </div>
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              resource.lastActivitySprintState === 'active' ? 'bg-green-100 text-green-800' :
                              resource.lastActivitySprintState === 'closed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {resource.lastActivitySprintState}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No activity</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {activeTab === 'active' ? (
                      // Active tab: show allocation & status
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {resource.totalSprints} sprints
                          </span>
                          {resource.activeSprints > 0 && (
                            <span className="text-xs text-green-600">
                              ({resource.activeSprints} active)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Status: Currently Active
                        </div>
                      </div>
                    ) : (
                      // Inactive tab: show historical activity with last worked date
                      <div className="flex flex-col space-y-2">
                        <div className="text-sm font-medium text-gray-900">
                          Inactive User
                        </div>
                        <div className="text-xs text-gray-500">
                          Last worked: {resource.lastActivityDate ? 
                            new Date(resource.lastActivityDate).toLocaleDateString() : 
                            'Unknown'
                          }
                        </div>
                        {resource.totalTickets > 0 && (
                          <div className="text-xs text-gray-500">
                            {resource.totalTickets} historical tickets
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'active' 
              ? (filter ? 'Try adjusting your search terms.' : 'No active team members found.') 
              : (filter ? 'Try adjusting your search terms.' : 'No inactive team members found.')
            }
          </p>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

export default ResourceSpread
