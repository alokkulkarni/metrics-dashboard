import React, { useEffect, useState } from 'react'
import { Users, ArrowUpDown, Filter } from 'lucide-react'
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
  ticketCount: number
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
  sprints: ResourceSprint[]
  totalSprints: number
  activeSprints: number
  totalTickets: number
  commonIssueTypes: string[]
  overlappingSprints: OverlappingSprint[]
  lastActivityDate?: string
  lastActivitySprint?: string
  lastActivitySprintState?: string
}

const ResourceSpread: React.FC = () => {
  const [resources, setResources] = useState<ResourceSpreadData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'sprints' | 'tickets' | 'lastActivity'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filter, setFilter] = useState('')
  const [activeSprintsFilter, setActiveSprintsFilter] = useState<'all' | 'moreThanOne' | 'hasActive'>('all')
  const [projectKeyFilter, setProjectKeyFilter] = useState('')

  useEffect(() => {
    fetchResourceData()
  }, [])

  const fetchResourceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all sprint metrics to get team members and issue data
      const sprintResponse = await fetch('/api/metrics/sprints')
      const sprintData = await sprintResponse.json()

      if (!sprintData.success) {
        throw new Error('Failed to fetch resource data')
      }

      const sprints = sprintData.data || []

      // Create a map to collect all resources and their sprint assignments
      const resourceMap = new Map<string, ResourceSpreadData>()

      // Process sprint metrics to extract team members and their ticket assignments
      sprints.forEach((sprintMetric: any) => {
        if (sprintMetric.teamMembers && sprintMetric.sprint) {
          // Parse team members if it's a string, otherwise use as array
          let teamMembers: string[] = []
          try {
            if (typeof sprintMetric.teamMembers === 'string') {
              teamMembers = JSON.parse(sprintMetric.teamMembers)
            } else if (Array.isArray(sprintMetric.teamMembers)) {
              teamMembers = sprintMetric.teamMembers
            }
          } catch (e) {
            logger.warn('Failed to parse team members for sprint:', sprintMetric.sprint.name)
            return
          }

          // Calculate tickets per team member for this sprint
          const totalTicketsInSprint = sprintMetric.totalIssues || 0
          const ticketsPerMember = teamMembers.length > 0 ? Math.floor(totalTicketsInSprint / teamMembers.length) : 0

          teamMembers.forEach((member: string) => {
            if (!member || member.trim() === '') return

            if (!resourceMap.has(member)) {
              resourceMap.set(member, {
                resourceName: member,
                sprints: [],
                totalSprints: 0,
                activeSprints: 0,
                totalTickets: 0,
                commonIssueTypes: [],
                overlappingSprints: []
              })
            }

            const resource = resourceMap.get(member)!
            
            // Check if sprint is already added
            const existingSprint = resource.sprints.find(s => s.sprintId === sprintMetric.sprint.id)
            if (!existingSprint) {
              const isActive = sprintMetric.sprint.state === 'active'
              resource.sprints.push({
                sprintId: sprintMetric.sprint.id,
                sprintName: sprintMetric.sprint.name,
                boardName: sprintMetric.sprint.board.name,
                projectName: sprintMetric.sprint.board.project?.name || 'Unknown',
                projectKey: sprintMetric.sprint.board.project?.jiraProjectKey || 'Unknown',
                state: sprintMetric.sprint.state,
                startDate: sprintMetric.sprint.startDate,
                endDate: sprintMetric.sprint.endDate,
                ticketCount: ticketsPerMember,
                issueTypes: sprintMetric.issueTypeBreakdown || {}
              })
              
              if (isActive) {
                resource.activeSprints++
              }
              
              resource.totalTickets += ticketsPerMember
            }
          })
        }
      })

      // Calculate allocation percentages and common issue types for each resource
      resourceMap.forEach((resource) => {
        resource.totalSprints = resource.sprints.length
        
            })

      // Calculate allocation percentages and common issue types for each resource
      resourceMap.forEach((resource) => {
        resource.totalSprints = resource.sprints.length
        
        // Sort sprints: active first, then by start date (most recent first)
        resource.sprints.sort((a, b) => {
          // Active sprints first
          if (a.state === 'active' && b.state !== 'active') return -1
          if (b.state === 'active' && a.state !== 'active') return 1
          
          // Then sort by start date (most recent first)
          const aStart = a.startDate ? new Date(a.startDate).getTime() : 0
          const bStart = b.startDate ? new Date(b.startDate).getTime() : 0
          
          if (aStart !== bStart) {
            return bStart - aStart // Most recent start date first
          }
          
          // If start dates are the same, sort by end date
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0
          return bEnd - aEnd
        })

        // Initialize overlapping sprints as empty - overlap detection temporarily disabled
        resource.overlappingSprints = []

        // Calculate last activity date and sprint
        const completedSprints = resource.sprints.filter(s => s.state === 'closed')
        const activeSprints = resource.sprints.filter(s => s.state === 'active')
        
        let lastActivitySprint = null
        let lastActivityDate = null
        let lastActivitySprintState = null
        
        if (activeSprints.length > 0) {
          // If there are active sprints, use the most recent one
          lastActivitySprint = activeSprints[0]
          lastActivityDate = new Date().toISOString() // Current date for active sprint
          lastActivitySprintState = 'active'
        } else if (completedSprints.length > 0) {
          // Use the most recently completed sprint
          const mostRecentCompleted = completedSprints.sort((a, b) => {
            const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0
            const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0
            return bEnd - aEnd
          })[0]
          
          lastActivitySprint = mostRecentCompleted
          lastActivityDate = mostRecentCompleted.endDate
          lastActivitySprintState = 'closed'
        }
        
        if (lastActivitySprint) {
          resource.lastActivityDate = lastActivityDate || undefined
          resource.lastActivitySprint = lastActivitySprint.sprintName
          resource.lastActivitySprintState = lastActivitySprintState || undefined
        }

        // Calculate most common issue types across all sprints
        const issueTypeCount = new Map<string, number>()
        resource.sprints.forEach(sprint => {
          Object.entries(sprint.issueTypes).forEach(([type, count]) => {
            issueTypeCount.set(type, (issueTypeCount.get(type) || 0) + count)
          })
        })

        // Get top 3 most common issue types
        resource.commonIssueTypes = Array.from(issueTypeCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type)
      })

      const resourceList = Array.from(resourceMap.values())
      setResources(resourceList)
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

  const filteredAndSortedResources = resources
    .filter(resource => {
      // Hide "Automation for jira" resource
      if (resource.resourceName === 'Automation for jira') {
        return false
      }
      
      // Name filter
      const nameMatch = resource.resourceName.toLowerCase().includes(filter.toLowerCase())
      
      // Active sprints filter
      let activeSprintsMatch = true
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
      
      // Project key filter
      const projectKeyMatch = projectKeyFilter === '' || 
        resource.sprints.some(sprint => 
          sprint.projectKey.toLowerCase().includes(projectKeyFilter.toLowerCase())
        )
      
      return nameMatch && activeSprintsMatch && projectKeyMatch
    })
    .sort((a, b) => {
      // FIRST: Always prioritize resources with active sprints
      const aHasActive = a.activeSprints > 0
      const bHasActive = b.activeSprints > 0
      
      if (aHasActive && !bHasActive) return -1
      if (!aHasActive && bHasActive) return 1
      
      // SECOND: If both have active sprints or both don't, sort by selected criteria
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
            <div className="text-3xl font-bold text-blue-600">{resources.length}</div>
            <div className="text-sm font-medium text-gray-500">Total Resources</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {resources.reduce((sum, r) => sum + r.activeSprints, 0)}
            </div>
            <div className="text-sm font-medium text-gray-500">Active Sprint Assignments</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {resources.reduce((sum, r) => sum + r.totalTickets, 0)}
            </div>
            <div className="text-sm font-medium text-gray-500">Total Tickets Assigned</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="space-y-4">
          <div className="flex items-center space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
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
            Showing {filteredAndSortedResources.length} of {resources.length} resources
          </div>
        </div>
      </div>

      {/* Resource Table */}
      {filteredAndSortedResources.length > 0 ? (
        <div className="bg-white shadow border rounded-lg overflow-hidden">
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
                    <span>Assignments</span>
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
                  Allocation & Status
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
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">
                        {resource.totalTickets} total tickets
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
                      {resource.sprints.filter(sprint => sprint.state === 'active').length > 0 ? (
                        resource.sprints.filter(sprint => sprint.state === 'active').map((sprint) => (
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
                                <span>Tickets: {sprint.ticketCount}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No active sprint assignments</span>
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
                      {/* Overlap detection temporarily disabled */}
                      <div className="text-xs text-gray-500">
                        Overlap detection disabled
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow border rounded-lg p-6 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter ? 'Try adjusting your search terms.' : 'No team members have been assigned to boards or sprints yet.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default ResourceSpread
