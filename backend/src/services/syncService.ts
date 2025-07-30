import { logger } from '../utils/logger';
import { Project } from '../models/Project';
import { Board } from '../models/Board';
import { Sprint } from '../models/Sprint';
import { Issue } from '../models/Issue';
import { SprintMetrics } from '../models/SprintMetrics';
import { SyncOperation } from '../models/SyncOperation';
import { KanbanBoard } from '../models/KanbanBoard';
import { jiraService } from './jiraService';
import { MetricsCalculationService } from './MetricsCalculationService';
import { kanbanSyncService } from './kanbanSyncService';
import { IssueChangelogService } from './IssueChangelogService';

interface SyncOptions {
  forceSync?: boolean;
  projectKeys?: string[];
  boardIds?: number[];
  sprintIds?: number[];
  bypassThrottle?: boolean;
}

interface SyncResult {
  projects: number;
  boards: number;
  sprints: number;
  issues: number;
  changelogEntries: number;
  metrics: number;
  kanbanBoards: number;
  kanbanIssues: number;
  kanbanMetrics: number;
  errors: string[];
  throttled?: boolean;
  throttleMessage?: string;
  nextAllowedSync?: Date;
}

class SyncService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      projects: 0,
      boards: 0,
      sprints: 0,
      issues: 0,
      changelogEntries: 0,
      metrics: 0,
      kanbanBoards: 0,
      kanbanIssues: 0,
      kanbanMetrics: 0,
      errors: [],
    };

    try {
      // Check throttling unless bypassed
      if (!options.bypassThrottle) {
        const throttleCheck = await SyncOperation.canPerformSync('full');
        if (!throttleCheck.canSync) {
          const message = `Full sync throttled. Please wait ${throttleCheck.timeRemaining} minutes before next sync.`;
          const nextAllowedSync = throttleCheck.lastSync?.endTime 
            ? new Date(throttleCheck.lastSync.endTime.getTime() + (30 * 60 * 1000))
            : new Date(Date.now() + (30 * 60 * 1000));
          
          logger.warn(`Full sync throttled`, {
            timeRemaining: throttleCheck.timeRemaining,
            nextAllowedSync
          });
          
          return {
            ...result,
            throttled: true,
            throttleMessage: message,
            nextAllowedSync,
          };
        }
      }

      logger.info('Starting full sync process...');

      // Start sync operation tracking
      const syncOperation = await SyncOperation.startSync('full', {
        projectKeys: options.projectKeys,
        boardIds: options.boardIds,
        sprintIds: options.sprintIds,
      });

      try {
        // Test JIRA connection
        const connectionTest = await jiraService.testConnection();
        if (!connectionTest) {
          throw new Error('JIRA connection test failed');
        }

        // Sync projects
        const projectsResult = await this.syncProjects(options);
        result.projects = projectsResult.synced;
        result.errors.push(...projectsResult.errors);

        // Sync boards
        const boardsResult = await this.syncBoards(options);
        result.boards = boardsResult.synced;
        result.kanbanBoards = boardsResult.kanbanBoards; // Set kanbanBoards count from integrated sync
        result.errors.push(...boardsResult.errors);

        // Sync sprints
        const sprintsResult = await this.syncSprints(options);
        result.sprints = sprintsResult.synced;
        result.errors.push(...sprintsResult.errors);

        // Sync issues
        const issuesResult = await this.syncIssues(options);
        result.issues = issuesResult.synced;
        result.changelogEntries = issuesResult.changelogEntries;
        result.errors.push(...issuesResult.errors);

        // Calculate metrics
        const metricsResult = await this.calculateMetrics();
        result.metrics = metricsResult.calculated;
        result.errors.push(...metricsResult.errors);

        // Sync Kanban issues (boards already synced in syncBoards step)
        logger.info('Syncing Kanban issues...');
        const kanbanIssuesResult = await this.syncKanbanIssues(options);
        result.kanbanIssues = kanbanIssuesResult.synced;
        result.errors.push(...kanbanIssuesResult.errors);

        // Calculate Kanban metrics
        logger.info('Calculating Kanban metrics...');
        const kanbanMetricsResult = await this.calculateKanbanMetrics();
        result.kanbanMetrics = kanbanMetricsResult.calculated;
        result.errors.push(...kanbanMetricsResult.errors);

        logger.info('Full sync process completed', {
          projects: result.projects,
          boards: result.boards,
          sprints: result.sprints,
          issues: result.issues,
          metrics: result.metrics,
          kanbanIssues: result.kanbanIssues,
          kanbanMetrics: result.kanbanMetrics,
          errors: result.errors.length,
        });

        // Log detailed sync summary for troubleshooting
        await this.logSyncSummary(result);

        // Mark sync as completed
        await syncOperation.completeSync(result);

        return result;
      } catch (error) {
        // Mark sync as failed
        await syncOperation.failSync(error instanceof Error ? error.message : String(error));
        throw error;
      }
    } catch (error) {
      logger.error('Full sync process failed:', error);
      result.errors.push(`Full sync failed: ${error}`);
      return result;
    }
  }

  private async syncProjects(options: SyncOptions): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      logger.info('Syncing projects...');

      const jiraProjects = await jiraService.getProjects();
      
      for (const jiraProject of jiraProjects) {
        try {
          // Filter by project keys if specified
          if (options.projectKeys && !options.projectKeys.includes(jiraProject.key)) {
            continue;
          }

          const project = await Project.upsert({
            jiraProjectKey: jiraProject.key,
            name: jiraProject.name,
            description: jiraProject.description || null,
            projectType: jiraProject.projectType || jiraProject.projectTypeKey || 'software',
            lead: jiraProject.lead?.displayName || null,
            url: jiraProject.url || null,
            avatarUrl: jiraProject.avatarUrls?.['48x48'] || null,
          });

          result.synced++;
          logger.debug(`Synced project: ${jiraProject.key} - ${jiraProject.name}`);
        } catch (error) {
          const errorMsg = `Failed to sync project ${jiraProject.key}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      logger.info(`Projects sync completed: ${result.synced} synced, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      logger.error('Failed to sync projects:', error);
      result.errors.push(`Failed to sync projects: ${error}`);
      return result;
    }
  }

  private async syncBoards(options: SyncOptions): Promise<{ synced: number; scrumBoards: number; kanbanBoards: number; errors: string[] }> {
    const result = { synced: 0, scrumBoards: 0, kanbanBoards: 0, errors: [] as string[] };

    try {
      logger.info('Syncing boards (both Scrum and Kanban)...');

      // Get all boards directly instead of filtering by project to avoid missing boards
      // that don't appear in project-specific queries due to JIRA API inconsistencies
      const jiraBoards = await jiraService.getAllBoards();
      logger.info(`Fetched ${jiraBoards.length} total boards from JIRA`);

      // Also get Kanban boards specifically to ensure we don't miss any
      const jiraKanbanBoards = await jiraService.getAllKanbanBoards();
      logger.info(`Fetched ${jiraKanbanBoards.length} Kanban boards from JIRA`);

      // Combine and deduplicate boards by ID
      const allJiraBoards = [...jiraBoards];
      for (const kanbanBoard of jiraKanbanBoards) {
        if (!allJiraBoards.find(board => board.id === kanbanBoard.id)) {
          allJiraBoards.push(kanbanBoard);
        }
      }

      logger.info(`Processing ${allJiraBoards.length} total unique boards (${jiraBoards.length} from general API + ${jiraKanbanBoards.length} Kanban-specific)`);

      // Create a map of project keys to project IDs for efficient lookup
      const projects = await Project.findAll();
      const projectMap = new Map(projects.map(p => [p.jiraProjectKey, p]));
      
      for (const jiraBoard of allJiraBoards) {
        try {
          // Filter by board IDs if specified
          if (options.boardIds && !options.boardIds.includes(jiraBoard.id)) {
            continue;
          }

          // Skip boards without valid project associations
          if (!jiraBoard.location?.projectKey) {
            logger.debug(`Skipping board ${jiraBoard.id} - no project key available`);
            continue;
          }

          // Find the corresponding project in our database
          const project = projectMap.get(jiraBoard.location.projectKey);
          if (!project) {
            logger.warn(`Project ${jiraBoard.location.projectKey} for board ${jiraBoard.id} not found in database`);
            continue;
          }

          // Handle both Scrum and Kanban boards
          if (jiraBoard.type === 'scrum') {
            // Sync to Scrum boards table
            const board = await Board.upsert({
              jiraBoardId: jiraBoard.id,
              name: jiraBoard.name,
              type: jiraBoard.type,
              projectId: project.id,
              location: jiraBoard.location?.projectName || null,
              canEdit: jiraBoard.canEdit,
            });

            result.scrumBoards++;
            logger.debug(`Synced Scrum board: ${jiraBoard.id} - ${jiraBoard.name} (project: ${jiraBoard.location.projectKey})`);
          } else if (jiraBoard.type === 'kanban') {
            // Sync to Kanban boards table using kanbanSyncService logic
            const kanbanBoard = await KanbanBoard.upsert({
              jiraBoardId: jiraBoard.id,
              name: jiraBoard.name,
              type: jiraBoard.type || 'kanban',
              projectId: project.id,
              location: jiraBoard.location?.projectName || null,
              canEdit: jiraBoard.canEdit || false,
              lastSyncAt: new Date(),
            });

            result.kanbanBoards++;
            logger.debug(`Synced Kanban board: ${jiraBoard.id} - ${jiraBoard.name} (project: ${jiraBoard.location.projectKey})`);
          } else {
            logger.debug(`Skipping board ${jiraBoard.id} - unsupported type: ${jiraBoard.type}`);
            continue;
          }

          result.synced++;
        } catch (error) {
          const errorMsg = `Failed to sync board ${jiraBoard.id}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      logger.info(`Boards sync completed: ${result.synced} total synced (${result.scrumBoards} Scrum, ${result.kanbanBoards} Kanban), ${result.errors.length} errors`);
      return result;
    } catch (error) {
      logger.error('Failed to sync boards:', error);
      result.errors.push(`Failed to sync boards: ${error}`);
      return result;
    }
  }

  private async syncSprints(options: SyncOptions): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };
    let totalJiraSprints = 0;
    let totalSprintsToSync = 0;

    try {
      logger.info('Syncing sprints...');

      // Filter boards if boardIds are specified
      let boards;
      if (options.boardIds && options.boardIds.length > 0) {
        boards = await Board.findAll({
          where: {
            jiraBoardId: options.boardIds
          }
        });
        logger.info(`Syncing sprints for ${boards.length} specified boards: ${options.boardIds.join(', ')}`);
      } else {
        boards = await Board.findAll();
        logger.info(`Syncing sprints for all ${boards.length} boards`);
      }
      
      for (const board of boards) {
        try {
          const jiraSprints = await jiraService.getSprintsForBoard(board.jiraBoardId);
          totalJiraSprints += jiraSprints.length;
          
          // Sort sprints by startDate or endDate
          const sortedSprints = jiraSprints.sort((a: any, b: any) => {
            const aDate = new Date(a.startDate || a.endDate || 0);
            const bDate = new Date(b.startDate || b.endDate || 0);
            return bDate.getTime() - aDate.getTime();
          });

          // Get active sprints and last 6 completed sprints
          const activeSprints = sortedSprints.filter((s: any) => s.state === 'active');
          const closedSprints = sortedSprints.filter((s: any) => s.state === 'closed').slice(0, 6);
          const sprintsToSync = [...activeSprints, ...closedSprints];
          totalSprintsToSync += sprintsToSync.length;

          logger.debug(`Board ${board.jiraBoardId} sprint summary: ${jiraSprints.length} total, ${activeSprints.length} active, ${closedSprints.length} recent closed, ${sprintsToSync.length} to sync`);

          for (const jiraSprint of sprintsToSync) {
            try {
              // Filter by sprint IDs if specified
              if (options.sprintIds && !options.sprintIds.includes(jiraSprint.id)) {
                continue;
              }

              const sprint = await Sprint.upsert({
                jiraId: jiraSprint.id.toString(),
                name: jiraSprint.name,
                state: jiraSprint.state as 'future' | 'active' | 'closed',
                boardId: board.id,
                startDate: jiraSprint.startDate ? new Date(jiraSprint.startDate) : undefined,
                endDate: jiraSprint.endDate ? new Date(jiraSprint.endDate) : undefined,
                completeDate: jiraSprint.completeDate ? new Date(jiraSprint.completeDate) : undefined,
                goal: jiraSprint.goal || undefined,
                isActive: jiraSprint.state === 'active',
              });

              result.synced++;
              logger.debug(`Synced sprint: ${jiraSprint.id} - ${jiraSprint.name} (state: ${jiraSprint.state})`);
            } catch (error) {
              const errorMsg = `Failed to sync sprint ${jiraSprint.id} for board ${board.jiraBoardId}: ${error}`;
              logger.error(errorMsg);
              result.errors.push(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to fetch sprints for board ${board.jiraBoardId}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      logger.info(`Sprints sync completed: ${result.synced} successfully synced out of ${totalSprintsToSync} eligible sprints (${totalJiraSprints} total sprints found in JIRA), ${result.errors.length} errors`);
      logger.info(`Sprint filtering: Only active + last 6 closed sprints per board are synced to keep data manageable`);

      // Perform cleanup of orphaned sprints
      if (!options.sprintIds) { // Only cleanup during full sync, not selective sync
        await this.cleanupOrphanedSprints(options);
      }

      return result;
    } catch (error) {
      logger.error('Failed to sync sprints:', error);
      result.errors.push(`Failed to sync sprints: ${error}`);
      return result;
    }
  }

  private async cleanupOrphanedSprints(options: SyncOptions): Promise<void> {
    try {
      logger.info('Starting cleanup of orphaned sprints...');
      
      // Filter boards if boardIds are specified
      let boards;
      if (options.boardIds && options.boardIds.length > 0) {
        boards = await Board.findAll({
          where: {
            jiraBoardId: options.boardIds
          }
        });
        logger.info(`Cleaning up orphaned sprints for ${boards.length} specified boards: ${options.boardIds.join(', ')}`);
      } else {
        boards = await Board.findAll();
        logger.info(`Cleaning up orphaned sprints for all ${boards.length} boards`);
      }
      
      let totalCleaned = 0;
      
      for (const board of boards) {
        try {
          // Get current sprints from JIRA for this board
          const jiraSprints = await jiraService.getSprintsForBoard(board.jiraBoardId);
          
          // Apply the same filtering logic as sync
          const sortedSprints = jiraSprints.sort((a: any, b: any) => {
            const aDate = new Date(a.startDate || a.endDate || 0);
            const bDate = new Date(b.startDate || b.endDate || 0);
            return bDate.getTime() - aDate.getTime();
          });

          const activeSprints = sortedSprints.filter((s: any) => s.state === 'active');
          const closedSprints = sortedSprints.filter((s: any) => s.state === 'closed').slice(0, 6);
          const validSprints = [...activeSprints, ...closedSprints];
          
          // Get set of valid JIRA sprint IDs that should exist in database
          const validJiraIds = new Set(validSprints.map(s => s.id.toString()));
          
          // Find database sprints for this board that are NOT in the valid JIRA list
          const dbSprints = await Sprint.findAll({
            where: { boardId: board.id }
          });
          
          const orphanedSprints = dbSprints.filter(dbSprint => 
            !validJiraIds.has(dbSprint.jiraId)
          );
          
          if (orphanedSprints.length > 0) {
            logger.info(`Board ${board.jiraBoardId}: Found ${orphanedSprints.length} orphaned sprints to cleanup`);
            
            for (const orphanedSprint of orphanedSprints) {
              logger.debug(`Cleaning up orphaned sprint: ${orphanedSprint.jiraId} - ${orphanedSprint.name}`);
              
              // Delete associated issues first (due to foreign key constraints)
              const deletedIssues = await Issue.destroy({
                where: { sprintId: orphanedSprint.id }
              });
              
              // Delete associated metrics
              const deletedMetrics = await SprintMetrics.destroy({
                where: { sprintId: orphanedSprint.id }
              });
              
              // Finally delete the sprint
              await orphanedSprint.destroy();
              
              totalCleaned++;
              
              if (deletedIssues > 0 || deletedMetrics > 0) {
                logger.debug(`  └─ Also cleaned up ${deletedIssues} issues and ${deletedMetrics} metrics`);
              }
            }
          } else {
            logger.debug(`Board ${board.jiraBoardId}: No orphaned sprints found`);
          }
          
        } catch (error) {
          logger.error(`Failed to cleanup orphaned sprints for board ${board.jiraBoardId}:`, error);
        }
      }
      
      if (totalCleaned > 0) {
        logger.info(`Sprint cleanup completed: Removed ${totalCleaned} orphaned sprints that no longer exist in JIRA`);
      } else {
        logger.info('Sprint cleanup completed: No orphaned sprints found');
      }
      
    } catch (error) {
      logger.error('Failed to cleanup orphaned sprints:', error);
    }
  }

  private async syncIssues(options: SyncOptions): Promise<{ synced: number; errors: string[]; changelogEntries: number }> {
    const result = { synced: 0, errors: [] as string[], changelogEntries: 0 };

    try {
      logger.info('Syncing issues...');

      // Filter sprints if boardIds are specified
      let sprints;
      if (options.boardIds && options.boardIds.length > 0) {
        sprints = await Sprint.findAll({
          include: [{ 
            model: Board, 
            as: 'board',
            where: {
              jiraBoardId: options.boardIds
            }
          }],
        });
        logger.info(`Syncing issues for ${sprints.length} sprints from specified boards: ${options.boardIds.join(', ')}`);
      } else {
        sprints = await Sprint.findAll({
          include: [{ model: Board, as: 'board' }],
        });
        logger.info(`Syncing issues for all ${sprints.length} sprints`);
      }
      
      let totalIssues = 0;
      
      for (const sprint of sprints) {
        try {
          const jiraIssues = await jiraService.getIssuesForSprint(parseInt(sprint.jiraId));
          totalIssues += jiraIssues.length;
          
          for (const jiraIssue of jiraIssues) {
            try {
              // Use findOrCreate to handle unique constraints properly
              const [issue, created] = await Issue.findOrCreate({
                where: { key: jiraIssue.key },
                defaults: {
                  jiraId: jiraIssue.id,
                  key: jiraIssue.key,
                  sprintId: sprint.id,
                  summary: jiraIssue.fields.summary,
                  description: jiraIssue.fields.description || undefined,
                  issueType: jiraIssue.fields.issuetype.name,
                  status: jiraIssue.fields.status.name,
                  priority: jiraIssue.fields.priority.name,
                  assigneeId: jiraIssue.fields.assignee?.accountId || undefined,
                  assigneeName: jiraIssue.fields.assignee?.displayName || undefined,
                  reporterId: jiraIssue.fields.reporter?.accountId || undefined,
                  reporterName: jiraIssue.fields.reporter?.displayName || undefined,
                  storyPoints: jiraIssue.fields.customfield_10030 || undefined,
                  created: new Date(jiraIssue.fields.created),
                  updated: new Date(jiraIssue.fields.updated),
                  resolved: jiraIssue.fields.resolutiondate ? new Date(jiraIssue.fields.resolutiondate) : undefined,
                  parentId: jiraIssue.fields.parent?.id || undefined,
                  parentKey: jiraIssue.fields.parent?.key || undefined,
                  labels: jiraIssue.fields.labels || [],
                  components: jiraIssue.fields.components?.map((c: any) => c.name) || [],
                  fixVersions: jiraIssue.fields.fixVersions?.map((v: any) => v.name) || [],
                }
              });

              // If not created (i.e., it existed), update it
              if (!created) {
                await issue.update({
                  jiraId: jiraIssue.id,
                  sprintId: sprint.id,
                  summary: jiraIssue.fields.summary,
                  description: jiraIssue.fields.description || undefined,
                  issueType: jiraIssue.fields.issuetype.name,
                  status: jiraIssue.fields.status.name,
                  priority: jiraIssue.fields.priority.name,
                  assigneeId: jiraIssue.fields.assignee?.accountId || undefined,
                  assigneeName: jiraIssue.fields.assignee?.displayName || undefined,
                  reporterId: jiraIssue.fields.reporter?.accountId || undefined,
                  reporterName: jiraIssue.fields.reporter?.displayName || undefined,
                  storyPoints: jiraIssue.fields.customfield_10030 || undefined,
                  created: new Date(jiraIssue.fields.created),
                  updated: new Date(jiraIssue.fields.updated),
                  resolved: jiraIssue.fields.resolutiondate ? new Date(jiraIssue.fields.resolutiondate) : undefined,
                  parentId: jiraIssue.fields.parent?.id || undefined,
                  parentKey: jiraIssue.fields.parent?.key || undefined,
                  labels: jiraIssue.fields.labels || [],
                  components: jiraIssue.fields.components?.map((c: any) => c.name) || [],
                  fixVersions: jiraIssue.fields.fixVersions?.map((v: any) => v.name) || [],
                });
              }

              result.synced++;
              
              // Log progress every 100 issues
              if (result.synced % 100 === 0) {
                const remaining = Math.max(0, totalIssues - result.synced);
                logger.info(`📈 Issue Sync Progress: ${result.synced} issues synced so far (${remaining}+ remaining from ${totalIssues} discovered)`);
              }
              
              logger.debug(`Synced issue: ${jiraIssue.key} - ${jiraIssue.fields.summary}`);
            } catch (error) {
              const errorMsg = `Failed to sync issue ${jiraIssue.key}: ${error}`;
              logger.error(errorMsg);
              result.errors.push(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to fetch issues for sprint ${sprint.jiraId}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      logger.info(`Issues sync completed: ${result.synced} synced, ${result.errors.length} errors`);
      
      // Sync issue changelog data after issues are synced
      try {
        logger.info('Syncing issue changelog data...');
        const changelogService = new IssueChangelogService();
        const changelogResult = await changelogService.syncAllIssueChangelogs();
        result.changelogEntries = changelogResult.addedChangelogEntries;
        logger.info(`Issue changelog sync completed: ${changelogResult.addedChangelogEntries} entries processed`);
      } catch (error) {
        const errorMsg = `Failed to sync issue changelog: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to sync issues:', error);
      result.errors.push(`Failed to sync issues: ${error}`);
      return result;
    }
  }

  private async calculateMetrics(): Promise<{ calculated: number; errors: string[] }> {
    const result = { calculated: 0, errors: [] as string[] };

    try {
      logger.info('Calculating metrics...');

      // Calculate sprint metrics
      const sprints = await Sprint.findAll();
      for (const sprint of sprints) {
        try {
          await MetricsCalculationService.calculateSprintMetrics(sprint.id);
          result.calculated++;
          logger.debug(`Calculated metrics for sprint: ${sprint.name}`);
        } catch (error) {
          const errorMsg = `Failed to calculate metrics for sprint ${sprint.id}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Calculate board metrics
      const boards = await Board.findAll();
      for (const board of boards) {
        try {
          await MetricsCalculationService.calculateBoardMetrics(board.id);
          result.calculated++;
          logger.debug(`Calculated metrics for board: ${board.name}`);
        } catch (error) {
          const errorMsg = `Failed to calculate metrics for board ${board.id}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      logger.info(`Metrics calculation completed: ${result.calculated} calculated, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      logger.error('Failed to calculate metrics:', error);
      result.errors.push(`Failed to calculate metrics: ${error}`);
      return result;
    }
  }

  private async syncKanbanIssues(options: SyncOptions): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      logger.info('Syncing Kanban issues...');

      // Get all Kanban boards to sync issues for
      let kanbanBoards;
      
      if (options.boardIds && options.boardIds.length > 0) {
        kanbanBoards = await KanbanBoard.findAll({
          where: { jiraBoardId: options.boardIds }
        });
        logger.info(`Syncing Kanban issues for ${kanbanBoards.length} specified boards: ${options.boardIds.join(', ')}`);
      } else {
        const whereClause: any = {};
        if (options.projectKeys && options.projectKeys.length > 0) {
          const projects = await Project.findAll({
            where: { jiraProjectKey: options.projectKeys }
          });
          const projectIds = projects.map(p => p.id);
          whereClause.projectId = projectIds;
          logger.info(`Syncing Kanban issues for projects: ${options.projectKeys.join(', ')}`);
        }
        kanbanBoards = await KanbanBoard.findAll({ where: whereClause });
        logger.info(`Syncing Kanban issues for all ${kanbanBoards.length} Kanban boards`);
      }

      for (const kanbanBoard of kanbanBoards) {
        try {
          logger.debug(`Syncing issues for Kanban board: ${kanbanBoard.name} (${kanbanBoard.jiraBoardId})`);

          const jiraIssues = await jiraService.getIssuesForKanbanBoard(kanbanBoard.jiraBoardId);
          
          for (const jiraIssue of jiraIssues) {
            try {
              // Extract status category
              const statusCategory = (jiraIssue.fields.status as any)?.statusCategory?.name || 
                                   jiraIssue.fields.status?.name || 
                                   'Unknown';

              // Import KanbanIssue for upsert operation
              const { KanbanIssue } = await import('../models/KanbanIssue');

              const [kanbanIssue, created] = await KanbanIssue.upsert({
                jiraId: jiraIssue.id,
                key: jiraIssue.key,
                kanbanBoardId: kanbanBoard.id,
                summary: jiraIssue.fields.summary,
                description: jiraIssue.fields.description || undefined,
                issueType: jiraIssue.fields.issuetype.name,
                status: jiraIssue.fields.status.name,
                statusCategory: statusCategory,
                priority: jiraIssue.fields.priority.name,
                assigneeId: jiraIssue.fields.assignee?.accountId || undefined,
                assigneeName: jiraIssue.fields.assignee?.displayName || undefined,
                reporterId: jiraIssue.fields.reporter?.accountId || undefined,
                reporterName: jiraIssue.fields.reporter?.displayName || undefined,
                storyPoints: jiraIssue.fields.customfield_10030 || undefined,
                created: new Date(jiraIssue.fields.created),
                updated: new Date(jiraIssue.fields.updated),
                resolved: jiraIssue.fields.resolutiondate ? new Date(jiraIssue.fields.resolutiondate) : undefined,
                parentId: jiraIssue.fields.parent?.id || undefined,
                parentKey: jiraIssue.fields.parent?.key || undefined,
                labels: jiraIssue.fields.labels || [],
                components: jiraIssue.fields.components?.map((c: any) => c.name) || [],
                fixVersions: jiraIssue.fields.fixVersions?.map((v: any) => v.name) || [],
                columnId: undefined, // Will be populated if we fetch board details
                columnName: undefined,
                swimlaneId: undefined,
                swimlaneName: undefined,
                rank: undefined,
                flagged: false,
                blockedReason: undefined,
                lastSyncAt: new Date(),
              }, {
                returning: true,
              });

              result.synced++;
              logger.debug(`Synced Kanban issue: ${jiraIssue.key} - ${jiraIssue.fields.summary}`);

            } catch (error) {
              const errorMessage = `Failed to sync Kanban issue ${jiraIssue.key}: ${error}`;
              logger.error(errorMessage);
              result.errors.push(errorMessage);
            }
          }

          // Update board's last sync time
          await kanbanBoard.update({ lastSyncAt: new Date() });

        } catch (error) {
          const errorMessage = `Failed to sync issues for Kanban board ${kanbanBoard.name}: ${error}`;
          logger.error(errorMessage);
          result.errors.push(errorMessage);
        }
      }

      logger.info(`Kanban issues sync completed: ${result.synced} synced, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      logger.error('Failed to sync Kanban issues:', error);
      result.errors.push(`Kanban issues sync failed: ${error}`);
      return result;
    }
  }

  private async calculateKanbanMetrics(): Promise<{ calculated: number; errors: string[] }> {
    try {
      logger.info('Calculating Kanban metrics...');
      
      // Use the kanbanSyncService's public calculation method
      const result = await kanbanSyncService.calculateMetricsOnly();
      
      logger.info(`Kanban metrics calculation completed: ${result.calculated} calculated, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      logger.error('Failed to calculate Kanban metrics:', error);
      return { calculated: 0, errors: [`Kanban metrics calculation failed: ${error}`] };
    }
  }

  async syncProject(projectKey: string, options: Omit<SyncOptions, 'projectKeys'> = {}): Promise<SyncResult> {
    const result: SyncResult = {
      projects: 0,
      boards: 0,
      sprints: 0,
      issues: 0,
      changelogEntries: 0,
      metrics: 0,
      kanbanBoards: 0,
      kanbanIssues: 0,
      kanbanMetrics: 0,
      errors: [],
    };

    try {
      // Check throttling unless bypassed
      if (!options.bypassThrottle) {
        const throttleCheck = await SyncOperation.canPerformSync('project');
        if (!throttleCheck.canSync) {
          const message = `Project sync throttled. Please wait ${throttleCheck.timeRemaining} minutes before next sync.`;
          const nextAllowedSync = throttleCheck.lastSync?.endTime 
            ? new Date(throttleCheck.lastSync.endTime.getTime() + (30 * 60 * 1000))
            : new Date(Date.now() + (30 * 60 * 1000));
          
          logger.warn(`Project sync throttled for ${projectKey}`, {
            timeRemaining: throttleCheck.timeRemaining,
            nextAllowedSync
          });
          
          return {
            ...result,
            throttled: true,
            throttleMessage: message,
            nextAllowedSync,
          };
        }
      }

      return this.syncAll({ ...options, projectKeys: [projectKey] });
    } catch (error) {
      logger.error(`Project sync failed for ${projectKey}:`, error);
      result.errors.push(`Project sync failed: ${error}`);
      return result;
    }
  }

  async syncBoard(boardId: number, options: Omit<SyncOptions, 'boardIds'> = {}): Promise<SyncResult> {
    const result: SyncResult = {
      projects: 0,
      boards: 0,
      sprints: 0,
      issues: 0,
      changelogEntries: 0,
      metrics: 0,
      kanbanBoards: 0,
      kanbanIssues: 0,
      kanbanMetrics: 0,
      errors: [],
    };

    try {
      // Check throttling unless bypassed
      if (!options.bypassThrottle) {
        const throttleCheck = await SyncOperation.canPerformSync('board');
        if (!throttleCheck.canSync) {
          const message = `Board sync throttled. Please wait ${throttleCheck.timeRemaining} minutes before next sync.`;
          const nextAllowedSync = throttleCheck.lastSync?.endTime 
            ? new Date(throttleCheck.lastSync.endTime.getTime() + (30 * 60 * 1000))
            : new Date(Date.now() + (30 * 60 * 1000));
          
          logger.warn(`Board sync throttled for ${boardId}`, {
            timeRemaining: throttleCheck.timeRemaining,
            nextAllowedSync
          });
          
          return {
            ...result,
            throttled: true,
            throttleMessage: message,
            nextAllowedSync,
          };
        }
      }

      return this.syncAll({ ...options, boardIds: [boardId] });
    } catch (error) {
      logger.error(`Board sync failed for ${boardId}:`, error);
      result.errors.push(`Board sync failed: ${error}`);
      return result;
    }
  }

  async syncSprint(sprintId: number, options: Omit<SyncOptions, 'sprintIds'> = {}): Promise<SyncResult> {
    const result: SyncResult = {
      projects: 0,
      boards: 0,
      sprints: 0,
      issues: 0,
      changelogEntries: 0,
      metrics: 0,
      kanbanBoards: 0,
      kanbanIssues: 0,
      kanbanMetrics: 0,
      errors: [],
    };

    try {
      // Check throttling unless bypassed
      if (!options.bypassThrottle) {
        const throttleCheck = await SyncOperation.canPerformSync('sprint');
        if (!throttleCheck.canSync) {
          const message = `Sprint sync throttled. Please wait ${throttleCheck.timeRemaining} minutes before next sync.`;
          const nextAllowedSync = throttleCheck.lastSync?.endTime 
            ? new Date(throttleCheck.lastSync.endTime.getTime() + (30 * 60 * 1000))
            : new Date(Date.now() + (30 * 60 * 1000));
          
          logger.warn(`Sprint sync throttled for ${sprintId}`, {
            timeRemaining: throttleCheck.timeRemaining,
            nextAllowedSync
          });
          
          return {
            ...result,
            throttled: true,
            throttleMessage: message,
            nextAllowedSync,
          };
        }
      }

      return this.syncAll({ ...options, sprintIds: [sprintId] });
    } catch (error) {
      logger.error(`Sprint sync failed for ${sprintId}:`, error);
      result.errors.push(`Sprint sync failed: ${error}`);
      return result;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retry<T>(
    fn: () => Promise<T>,
    retries: number = this.MAX_RETRIES,
    delay: number = this.RETRY_DELAY
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      logger.warn(`Retrying operation after ${delay}ms. Attempts left: ${retries - 1}`);
      await this.delay(delay);
      return this.retry(fn, retries - 1, delay * 2);
    }
  }

  private async logSyncSummary(result: SyncResult): Promise<void> {
    try {
      // Get database counts
      const dbProjects = await Project.count();
      const dbBoards = await Board.count();
      const dbSprints = await Sprint.count();
      
      // Get JIRA counts for comparison
      const jiraProjects = await jiraService.getProjects();
      const jiraBoards = await jiraService.getAllBoards();
      const scrumBoards = jiraBoards.filter(b => b.type === 'scrum');
      
      logger.info('Sync Summary Comparison:', {
        jira: {
          projects: jiraProjects.length,
          allBoards: jiraBoards.length,
          scrumBoards: scrumBoards.length,
          note: 'Sprint count requires board-by-board enumeration'
        },
        database: {
          projects: dbProjects,
          boards: dbBoards,
          sprints: dbSprints
        },
        sync: {
          projectsSynced: result.projects,
          boardsSynced: result.boards,
          sprintsSynced: result.sprints,
          errors: result.errors.length
        },
        differences: {
          missingBoards: scrumBoards.length - dbBoards,
          notes: [
            'Sprint differences expected due to filtering (active + last 6 closed per board)',
            'Board differences may indicate API filtering issues'
          ]
        }
      });

      // Log any sync errors for investigation
      if (result.errors.length > 0) {
        logger.warn('Sync errors encountered:', {
          errorCount: result.errors.length,
          errors: result.errors.slice(0, 10) // Log first 10 errors
        });
      }
    } catch (error) {
      logger.error('Failed to generate sync summary:', error);
    }
  }
}

export const syncService = new SyncService();
export default syncService;
export type { SyncOptions, SyncResult };
