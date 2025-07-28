import { Router } from 'express';
import { Request, Response } from 'express';
import { Issue } from '../models/Issue';
import { Sprint } from '../models/Sprint';
import { Board } from '../models/Board';
import { Project } from '../models/Project';
import { SprintMetrics } from '../models/SprintMetrics';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

const router = Router();

// GET /api/resources/spread - Get enhanced resource spread with role information
router.get('/spread', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching enhanced resource spread data...');

    // Get all issues with their sprint, board, and project information (for active resources)
    const issues = await Issue.findAll({
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: true,
          include: [
            {
              model: Board,
              as: 'board',
              required: true,
              include: [
                {
                  model: Project,
                  as: 'project',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    });

    // Get all issues (including those without sprints) to find all unique users
    const allIssues = await Issue.findAll({
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: false,
          include: [
            {
              model: Board,
              as: 'board',
              required: false,
              include: [
                {
                  model: Project,
                  as: 'project',
                  required: false,
                },
              ],
            },
          ],
        },
      ],
    });

    // Get sprint metrics for additional context
    const sprintMetrics = await SprintMetrics.findAll({
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: true,
          include: [
            {
              model: Board,
              as: 'board',
              required: true,
              include: [
                {
                  model: Project,
                  as: 'project',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    });

    // Create a map to track resources and their roles
    const resourceMap = new Map<string, any>();

    // Process issues to extract role information
    issues.forEach((issue: any) => {
      const sprint = issue.sprint;
      if (!sprint) return;

      // Skip "Automation for jira" completely (case-insensitive)
      const isAutomationUser = (name: string) => {
        if (!name) return false;
        const normalizedName = name.toLowerCase().trim();
        return normalizedName === 'automation for jira' || 
               normalizedName === 'automation for jira' ||
               normalizedName.includes('automation for jira');
      };

      if (isAutomationUser(issue.assigneeName) || isAutomationUser(issue.reporterName)) {
        return;
      }

      // Process assignee
      if (issue.assigneeName && issue.assigneeName.trim() !== '') {
        const assigneeName = issue.assigneeName.trim();
        if (!resourceMap.has(assigneeName)) {
          resourceMap.set(assigneeName, {
            resourceName: assigneeName,
            roles: new Set(),
            sprints: new Map(),
            totalTickets: 0,
            assignedTickets: 0,
            reportedTickets: 0,
            issueTypes: new Map(),
          });
        }

        const resource = resourceMap.get(assigneeName);
        resource.roles.add('assignee');
        resource.totalTickets++;
        resource.assignedTickets++;

        // Track sprint information
        const sprintKey = `${sprint.id}`;
        if (!resource.sprints.has(sprintKey)) {
          resource.sprints.set(sprintKey, {
            sprintId: sprint.id,
            sprintName: sprint.name,
            boardName: sprint.board.name,
            projectName: sprint.board.project?.name || 'Unknown',
            projectKey: sprint.board.project?.jiraProjectKey || 'Unknown',
            state: sprint.state,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            assignedTickets: 0,
            reportedTickets: 0,
            totalTickets: 0,
            issueTypes: new Map(),
          });
        }
        
        const sprintData = resource.sprints.get(sprintKey);
        sprintData.assignedTickets++;
        sprintData.totalTickets++;

        // Track issue types
        const issueType = issue.issueType || 'Unknown';
        resource.issueTypes.set(issueType, (resource.issueTypes.get(issueType) || 0) + 1);
        sprintData.issueTypes.set(issueType, (sprintData.issueTypes.get(issueType) || 0) + 1);
      }

      // Process reporter
      if (issue.reporterName && issue.reporterName.trim() !== '' && 
          issue.reporterName !== issue.assigneeName) {
        const reporterName = issue.reporterName.trim();
        if (!resourceMap.has(reporterName)) {
          resourceMap.set(reporterName, {
            resourceName: reporterName,
            roles: new Set(),
            sprints: new Map(),
            totalTickets: 0,
            assignedTickets: 0,
            reportedTickets: 0,
            issueTypes: new Map(),
          });
        }

        const resource = resourceMap.get(reporterName);
        resource.roles.add('reporter');
        resource.totalTickets++;
        resource.reportedTickets++;

        // Track sprint information
        const sprintKey = `${sprint.id}`;
        if (!resource.sprints.has(sprintKey)) {
          resource.sprints.set(sprintKey, {
            sprintId: sprint.id,
            sprintName: sprint.name,
            boardName: sprint.board.name,
            projectName: sprint.board.project?.name || 'Unknown',
            projectKey: sprint.board.project?.jiraProjectKey || 'Unknown',
            state: sprint.state,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            assignedTickets: 0,
            reportedTickets: 0,
            totalTickets: 0,
            issueTypes: new Map(),
          });
        }
        
        const sprintData = resource.sprints.get(sprintKey);
        sprintData.reportedTickets++;
        sprintData.totalTickets++;

        // Track issue types
        const issueType = issue.issueType || 'Unknown';
        resource.issueTypes.set(issueType, (resource.issueTypes.get(issueType) || 0) + 1);
        sprintData.issueTypes.set(issueType, (sprintData.issueTypes.get(issueType) || 0) + 1);
      }
    });

    // Convert to final format
    const resources = Array.from(resourceMap.values()).map((resource: any) => {
      // Convert sets and maps to arrays/objects
      const roles = Array.from(resource.roles);
      const sprints = Array.from(resource.sprints.values()).map((sprint: any) => ({
        ...sprint,
        issueTypes: Object.fromEntries(sprint.issueTypes),
      }));

      // Sort sprints: active first, then by start date (most recent first)
      sprints.sort((a: any, b: any) => {
        if (a.state === 'active' && b.state !== 'active') return -1;
        if (b.state === 'active' && a.state !== 'active') return 1;
        
        const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
        
        if (aStart !== bStart) {
          return bStart - aStart;
        }
        
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
        return bEnd - aEnd;
      });

      // Calculate active sprints
      const activeSprints = sprints.filter((s: any) => s.state === 'active').length;

      // Calculate last activity
      const completedSprints = sprints.filter((s: any) => s.state === 'closed');
      const activeSprintsList = sprints.filter((s: any) => s.state === 'active');
      
      let lastActivityDate: string | undefined;
      let lastActivitySprint: string | undefined;
      let lastActivitySprintState: string | undefined;
      
      if (activeSprintsList.length > 0) {
        lastActivityDate = new Date().toISOString();
        lastActivitySprint = activeSprintsList[0].sprintName;
        lastActivitySprintState = 'active';
      } else if (completedSprints.length > 0) {
        const mostRecent = completedSprints[0];
        lastActivityDate = mostRecent.endDate;
        lastActivitySprint = mostRecent.sprintName;
        lastActivitySprintState = 'closed';
      }

      // Get top 3 most common issue types
      const issueTypeEntries = Array.from(resource.issueTypes.entries())
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3);
      const commonIssueTypes = issueTypeEntries.map(([type]: any) => type);

      // Determine role display
      let roleDisplay = '';
      let roleColor = '';
      if (roles.includes('assignee') && roles.includes('reporter')) {
        roleDisplay = 'Both';
        roleColor = 'bg-purple-100 text-purple-800';
      } else if (roles.includes('assignee')) {
        roleDisplay = 'Assignee';
        roleColor = 'bg-blue-100 text-blue-800';
      } else if (roles.includes('reporter')) {
        roleDisplay = 'Reporter';
        roleColor = 'bg-green-100 text-green-800';
      }

      return {
        resourceName: resource.resourceName,
        roles,
        roleDisplay,
        roleColor,
        sprints,
        totalSprints: sprints.length,
        activeSprints,
        totalTickets: resource.totalTickets,
        assignedTickets: resource.assignedTickets,
        reportedTickets: resource.reportedTickets,
        commonIssueTypes,
        lastActivityDate,
        lastActivitySprint,
        lastActivitySprintState,
        isActive: activeSprints > 0 || resource.totalTickets > 0, // Mark as active if has active sprints or any tickets
      };
    });

    // Now find inactive resources (users in Jira but not actively working)
    const allUsers = new Set<string>();
    const activeUsers = new Set<string>();

    // Helper function to check if a user is an automation user
    const isAutomationUser = (name: string) => {
      if (!name) return false;
      const normalizedName = name.toLowerCase().trim();
      return normalizedName === 'automation for jira' || 
             normalizedName === 'automation for jira' ||
             normalizedName.includes('automation for jira');
    };

    // Collect all unique users from all issues
    allIssues.forEach((issue: any) => {
      if (issue.assigneeName && issue.assigneeName.trim() !== '' && !isAutomationUser(issue.assigneeName)) {
        allUsers.add(issue.assigneeName.trim());
      }
      if (issue.reporterName && issue.reporterName.trim() !== '' && !isAutomationUser(issue.reporterName)) {
        allUsers.add(issue.reporterName.trim());
      }
    });

    // Mark users who are in active sprints or have recent activity
    resources.forEach(resource => {
      activeUsers.add(resource.resourceName);
    });

    // Create inactive resources list
    const inactiveResources: any[] = [];
    for (const userName of allUsers) {
      if (!activeUsers.has(userName)) {
        // Find last activity for this user across all issues
        const userIssues = allIssues.filter((issue: any) => 
          issue.assigneeName === userName || issue.reporterName === userName
        );
        
        let lastActivityDate: string | undefined;
        let lastActivitySprint: string | undefined;
        let lastActivitySprintState: string | undefined;
        let lastActivityType: string | undefined;

        // Find the most recent activity
        for (const issue of userIssues) {
          const sprint = issue.sprint;
          if (sprint) {
            const sprintEndDate = sprint.endDate ? new Date(sprint.endDate) : null;
            const currentLastDate = lastActivityDate ? new Date(lastActivityDate) : null;
            
            if (!currentLastDate || (sprintEndDate && sprintEndDate > currentLastDate)) {
              lastActivityDate = sprint.endDate;
              lastActivitySprint = sprint.name;
              lastActivitySprintState = sprint.state;
              lastActivityType = issue.assigneeName === userName ? 'assigned' : 'reported';
            }
          }
        }

        // If no sprint info, use issue creation date as fallback
        if (!lastActivityDate && userIssues.length > 0) {
          const mostRecentIssue = userIssues.reduce((latest, current) => {
            const latestDate = latest.createdAt ? new Date(latest.createdAt) : new Date(0);
            const currentDate = current.createdAt ? new Date(current.createdAt) : new Date(0);
            return currentDate > latestDate ? current : latest;
          });
          
          lastActivityDate = mostRecentIssue.createdAt?.toISOString();
          lastActivityType = mostRecentIssue.assigneeName === userName ? 'assigned' : 'reported';
        }

        inactiveResources.push({
          resourceName: userName,
          roles: [],
          roleDisplay: 'Inactive',
          roleColor: 'bg-gray-100 text-gray-600',
          sprints: [],
          totalSprints: 0,
          activeSprints: 0,
          totalTickets: userIssues.length,
          assignedTickets: userIssues.filter(i => i.assigneeName === userName).length,
          reportedTickets: userIssues.filter(i => i.reporterName === userName).length,
          commonIssueTypes: [],
          lastActivityDate,
          lastActivitySprint: lastActivitySprint || 'No recent sprint activity',
          lastActivitySprintState: lastActivitySprintState || 'unknown',
          lastActivityType,
          isActive: false,
        });
      }
    }

    // Filter out any automation users (additional safety with robust checking)
    const filteredActiveResources = resources.filter(r => 
      !isAutomationUser(r.resourceName)
    );

    const filteredInactiveResources = inactiveResources.filter(r => 
      !isAutomationUser(r.resourceName)
    );

    // Log filtering results for debugging
    const totalResourcesBefore = resources.length + inactiveResources.length;
    const totalResourcesAfter = filteredActiveResources.length + filteredInactiveResources.length;
    const filteredCount = totalResourcesBefore - totalResourcesAfter;
    
    if (filteredCount > 0) {
      logger.info(`Filtered out ${filteredCount} automation users from resource spread`);
    }

    res.json({
      success: true,
      data: {
        activeResources: filteredActiveResources,
        inactiveResources: filteredInactiveResources,
        totalResources: filteredActiveResources.length + filteredInactiveResources.length,
        activeCount: filteredActiveResources.length,
        inactiveCount: filteredInactiveResources.length,
      },
    });

  } catch (error) {
    logger.error('Failed to fetch enhanced resource spread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resource spread data',
    });
  }
});

export default router;
