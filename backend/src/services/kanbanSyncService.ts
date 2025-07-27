import { logger } from '../utils/logger';
import { Project } from '../models/Project';
import { KanbanBoard } from '../models/KanbanBoard';
import { KanbanIssue } from '../models/KanbanIssue';
import { KanbanMetrics } from '../models/KanbanMetrics';
import { SyncOperation } from '../models/SyncOperation';
import { jiraService } from './jiraService';
import { KanbanMetricsCalculationService } from './KanbanMetricsCalculationService';

interface KanbanSyncOptions {
  forceSync?: boolean;
  projectKeys?: string[];
  kanbanBoardIds?: number[];
  bypassThrottle?: boolean;
}

interface KanbanSyncResult {
  kanbanBoards: number;
  kanbanIssues: number;
  kanbanMetrics: number;
  errors: string[];
  throttled?: boolean;
  throttleMessage?: string;
  nextAllowedSync?: Date;
}

class KanbanSyncService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  async syncAllKanban(options: KanbanSyncOptions = {}): Promise<KanbanSyncResult> {
    const result: KanbanSyncResult = {
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
          const message = `Kanban sync throttled. Please wait ${throttleCheck.timeRemaining} minutes before next sync.`;
          const nextAllowedSync = throttleCheck.lastSync?.endTime 
            ? new Date(throttleCheck.lastSync.endTime.getTime() + (30 * 60 * 1000))
            : new Date(Date.now() + (30 * 60 * 1000));
          
          logger.warn(`Kanban sync throttled`, {
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

      logger.info('Starting Kanban sync process...');

      // Start sync operation tracking
      const syncOperation = await SyncOperation.startSync('board', {
        projectKeys: options.projectKeys,
        boardIds: options.kanbanBoardIds,
      });

      try {
        // Test JIRA connection
        const connectionTest = await jiraService.testConnection();
        if (!connectionTest) {
          throw new Error('JIRA connection test failed');
        }

        // Sync Kanban boards
        const kanbanBoardsResult = await this.syncKanbanBoards(options);
        result.kanbanBoards = kanbanBoardsResult.synced;
        result.errors.push(...kanbanBoardsResult.errors);

        // Sync Kanban issues
        const kanbanIssuesResult = await this.syncKanbanIssues(options);
        result.kanbanIssues = kanbanIssuesResult.synced;
        result.errors.push(...kanbanIssuesResult.errors);

        // Calculate Kanban metrics
        const kanbanMetricsResult = await this.calculateKanbanMetrics();
        result.kanbanMetrics = kanbanMetricsResult.calculated;
        result.errors.push(...kanbanMetricsResult.errors);

        logger.info('Kanban sync process completed', {
          kanbanBoards: result.kanbanBoards,
          kanbanIssues: result.kanbanIssues,
          kanbanMetrics: result.kanbanMetrics,
          errors: result.errors.length,
        });

        // Log detailed sync summary for troubleshooting
        await this.logKanbanSyncSummary(result);

        // Mark sync as completed
        await syncOperation.completeSync(result);

        return result;
      } catch (error) {
        // Mark sync as failed
        await syncOperation.failSync(error instanceof Error ? error.message : String(error));
        throw error;
      }
    } catch (error) {
      logger.error('Kanban sync process failed:', error);
      result.errors.push(`Kanban sync failed: ${error}`);
      return result;
    }
  }

  async syncKanbanBoardById(kanbanBoardId: number): Promise<KanbanSyncResult> {
    logger.info(`Starting selective Kanban sync for board ${kanbanBoardId}...`);
    
    return this.syncAllKanban({
      kanbanBoardIds: [kanbanBoardId],
      bypassThrottle: true, // Allow selective sync to bypass throttling
    });
  }

  async calculateMetricsOnly(): Promise<{ calculated: number; errors: string[] }> {
    logger.info('Starting Kanban metrics calculation only...');
    return this.calculateKanbanMetrics();
  }

  private async syncKanbanBoards(options: KanbanSyncOptions): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      logger.info('Syncing Kanban boards...');

      let jiraKanbanBoards;
      
      if (options.kanbanBoardIds && options.kanbanBoardIds.length > 0) {
        // Sync specific boards by ID
        jiraKanbanBoards = [];
        for (const boardId of options.kanbanBoardIds) {
          try {
            const boardResponse = await jiraService.getAllKanbanBoards();
            const board = boardResponse.find(b => b.id === boardId);
            if (board) {
              jiraKanbanBoards.push(board);
            } else {
              result.errors.push(`Kanban board with ID ${boardId} not found`);
            }
          } catch (error) {
            result.errors.push(`Failed to fetch Kanban board ${boardId}: ${error}`);
          }
        }
      } else if (options.projectKeys && options.projectKeys.length > 0) {
        // Sync boards for specific projects
        jiraKanbanBoards = [];
        for (const projectKey of options.projectKeys) {
          try {
            const projectBoards = await jiraService.getKanbanBoardsForProject(projectKey);
            jiraKanbanBoards.push(...projectBoards);
          } catch (error) {
            result.errors.push(`Failed to fetch Kanban boards for project ${projectKey}: ${error}`);
          }
        }
      } else {
        // Sync all Kanban boards
        jiraKanbanBoards = await jiraService.getAllKanbanBoards();
      }

      for (const jiraKanbanBoard of jiraKanbanBoards) {
        try {
          // Find the project for this board
          let project = null;
          if (jiraKanbanBoard.location?.projectKey) {
            project = await Project.findOne({
              where: { jiraProjectKey: jiraKanbanBoard.location.projectKey }
            });
          }

          if (!project) {
            logger.warn(`Project not found for Kanban board ${jiraKanbanBoard.name} (${jiraKanbanBoard.id})`);
            continue;
          }

          // Get board configuration for Kanban-specific details
          let boardConfig = {};
          try {
            boardConfig = await jiraService.getKanbanBoardConfiguration(jiraKanbanBoard.id);
          } catch (configError) {
            logger.warn(`Could not fetch configuration for Kanban board ${jiraKanbanBoard.id}:`, configError);
          }

          // Create or update the Kanban board
          const [kanbanBoard, created] = await KanbanBoard.upsert({
            jiraBoardId: jiraKanbanBoard.id,
            name: jiraKanbanBoard.name,
            type: jiraKanbanBoard.type,
            projectId: project.id,
            location: jiraKanbanBoard.location ? JSON.stringify(jiraKanbanBoard.location) : null,
            canEdit: jiraKanbanBoard.canEdit,
            columnConfig: (boardConfig as any).columnConfig || {},
            swimlaneConfig: (boardConfig as any).swimlaneConfig || {},
            lastSyncAt: new Date(),
          }, {
            returning: true,
          });

          result.synced++;
          logger.debug(`${created ? 'Created' : 'Updated'} Kanban board: ${jiraKanbanBoard.name} (${jiraKanbanBoard.id})`);

        } catch (error) {
          const errorMessage = `Failed to sync Kanban board ${jiraKanbanBoard.name} (${jiraKanbanBoard.id}): ${error}`;
          logger.error(errorMessage);
          result.errors.push(errorMessage);
        }
      }

      logger.info(`Kanban boards sync completed. Synced: ${result.synced}, Errors: ${result.errors.length}`);
      return result;

    } catch (error) {
      logger.error('Failed to sync Kanban boards:', error);
      result.errors.push(`Kanban boards sync failed: ${error}`);
      return result;
    }
  }

  private async syncKanbanIssues(options: KanbanSyncOptions): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      logger.info('Syncing Kanban issues...');

      // Get all Kanban boards to sync issues for
      let kanbanBoards;
      
      if (options.kanbanBoardIds && options.kanbanBoardIds.length > 0) {
        kanbanBoards = await KanbanBoard.findAll({
          where: { jiraBoardId: options.kanbanBoardIds }
        });
      } else {
        const whereClause: any = {};
        if (options.projectKeys && options.projectKeys.length > 0) {
          const projects = await Project.findAll({
            where: { jiraProjectKey: options.projectKeys }
          });
          const projectIds = projects.map(p => p.id);
          whereClause.projectId = projectIds;
        }
        kanbanBoards = await KanbanBoard.findAll({ where: whereClause });
      }

      for (const kanbanBoard of kanbanBoards) {
        try {
          logger.debug(`Syncing issues for Kanban board: ${kanbanBoard.name} (${kanbanBoard.jiraBoardId})`);

          const jiraIssues = await jiraService.getIssuesForKanbanBoard(kanbanBoard.jiraBoardId);
          
          for (const jiraIssue of jiraIssues) {
            try {
              // Get detailed board information for the issue
              const detailedIssue = await jiraService.getKanbanIssueWithBoardDetails(
                kanbanBoard.jiraBoardId, 
                jiraIssue.key
              );

              // Extract status category
              const statusCategory = (jiraIssue.fields.status as any)?.statusCategory?.name || 
                                   jiraIssue.fields.status?.name || 
                                   'Unknown';

              // Extract Kanban-specific details
              const kanbanDetails = detailedIssue.kanbanDetails || {};

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
                columnId: kanbanDetails.columnId || undefined,
                columnName: kanbanDetails.columnName || undefined,
                swimlaneId: kanbanDetails.swimlaneId || undefined,
                swimlaneName: kanbanDetails.swimlaneName || undefined,
                rank: kanbanDetails.rank || undefined,
                flagged: kanbanDetails.flagged || false,
                blockedReason: kanbanDetails.blockedReason || undefined,
                lastSyncAt: new Date(),
              }, {
                returning: true,
              });

              result.synced++;
              
              if (result.synced % 100 === 0) {
                logger.debug(`Synced ${result.synced} Kanban issues so far...`);
              }

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

      logger.info(`Kanban issues sync completed. Synced: ${result.synced}, Errors: ${result.errors.length}`);
      return result;

    } catch (error) {
      logger.error('Failed to sync Kanban issues:', error);
      result.errors.push(`Kanban issues sync failed: ${error}`);
      return result;
    }
  }

  private async calculateKanbanMetrics(): Promise<{ calculated: number; errors: string[] }> {
    const result = { calculated: 0, errors: [] as string[] };

    try {
      logger.info('Calculating Kanban metrics...');

      const kanbanBoards = await KanbanBoard.findAll();

      for (const kanbanBoard of kanbanBoards) {
        try {
          await KanbanMetricsCalculationService.calculateMetricsForBoard(kanbanBoard.id);
          result.calculated++;
        } catch (error) {
          const errorMessage = `Failed to calculate metrics for Kanban board ${kanbanBoard.name}: ${error}`;
          logger.error(errorMessage);
          result.errors.push(errorMessage);
        }
      }

      logger.info(`Kanban metrics calculation completed. Calculated: ${result.calculated}, Errors: ${result.errors.length}`);
      return result;

    } catch (error) {
      logger.error('Failed to calculate Kanban metrics:', error);
      result.errors.push(`Kanban metrics calculation failed: ${error}`);
      return result;
    }
  }

  private async logKanbanSyncSummary(result: KanbanSyncResult): Promise<void> {
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        kanbanBoards: result.kanbanBoards,
        kanbanIssues: result.kanbanIssues,
        kanbanMetrics: result.kanbanMetrics,
        errors: result.errors,
        totalErrors: result.errors.length,
      };

      logger.info('Kanban Sync Summary:', summary);

      // Log individual errors for debugging
      if (result.errors.length > 0) {
        logger.error('Kanban Sync Errors Details:', {
          errors: result.errors.slice(0, 10), // Log first 10 errors to avoid log overflow
          totalErrors: result.errors.length,
        });
      }

    } catch (error) {
      logger.error('Failed to log Kanban sync summary:', error);
    }
  }
}

export const kanbanSyncService = new KanbanSyncService();
export default kanbanSyncService;
export type { KanbanSyncOptions, KanbanSyncResult };
