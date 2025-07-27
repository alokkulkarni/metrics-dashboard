import { KanbanMetrics } from '../models/KanbanMetrics';
import { KanbanBoard } from '../models/KanbanBoard';
import { logger } from '../utils/logger';

interface MetricsDisplayData {
  boardInfo: {
    id: number;
    name: string;
    projectId: number;
  };
  statusMetrics: {
    totalIssues: number;
    todoIssues: number;
    inProgressIssues: number;
    doneIssues: number;
    blockedIssues: number;
    flaggedIssues: number;
  };
  timeMetrics: {
    averageCycleTime?: number;
    medianCycleTime?: number;
    averageLeadTime?: number;
    medianLeadTime?: number;
    averageAgeInProgress?: number;
    oldestIssueAge?: number;
  };
  throughputMetrics: {
    weeklyThroughput: number[];
    monthlyThroughput: number[];
  };
  qualityMetrics: {
    wipViolations: number;
    flowEfficiency?: number;
    wipUtilization: any;
  };
  breakdownMetrics: {
    issueTypeBreakdown: any;
    priorityBreakdown: any;
    assigneeBreakdown: any;
  };
  columnMetrics: any;
  calculatedAt: Date;
}

export class KanbanMetricsDisplayService {
  
  /**
   * 📊 Get formatted metrics for a specific Kanban board
   */
  public static async getKanbanBoardMetrics(kanbanBoardId: number): Promise<MetricsDisplayData | null> {
    try {
      logger.info(`📊 Getting metrics for Kanban board ${kanbanBoardId}`);

      // Get the latest metrics for this board
      const metrics = await KanbanMetrics.findByKanbanBoard(kanbanBoardId);
      if (!metrics) {
        logger.warn(`⚠️ No metrics found for Kanban board ${kanbanBoardId}`);
        return null;
      }

      // Get board information
      const board = await KanbanBoard.findByPk(kanbanBoardId);
      if (!board) {
        logger.warn(`⚠️ Kanban board ${kanbanBoardId} not found`);
        return null;
      }

      logger.info(`✅ Found metrics calculated at ${metrics.calculatedAt.toISOString()}`);

      const displayData: MetricsDisplayData = {
        boardInfo: {
          id: board.id,
          name: board.name,
          projectId: board.projectId
        },
        statusMetrics: {
          totalIssues: metrics.totalIssues,
          todoIssues: metrics.todoIssues,
          inProgressIssues: metrics.inProgressIssues,
          doneIssues: metrics.doneIssues,
          blockedIssues: metrics.blockedIssues,
          flaggedIssues: metrics.flaggedIssues
        },
        timeMetrics: {
          averageCycleTime: metrics.averageCycleTime,
          medianCycleTime: metrics.medianCycleTime,
          averageLeadTime: metrics.averageLeadTime,
          medianLeadTime: metrics.medianLeadTime,
          averageAgeInProgress: metrics.averageAgeInProgress,
          oldestIssueAge: metrics.oldestIssueAge
        },
        throughputMetrics: {
          weeklyThroughput: metrics.weeklyThroughput,
          monthlyThroughput: metrics.monthlyThroughput
        },
        qualityMetrics: {
          wipViolations: metrics.wipViolations,
          flowEfficiency: metrics.flowEfficiency,
          wipUtilization: metrics.wipUtilization
        },
        breakdownMetrics: {
          issueTypeBreakdown: metrics.issueTypeBreakdown,
          priorityBreakdown: metrics.priorityBreakdown,
          assigneeBreakdown: metrics.assigneeBreakdown
        },
        columnMetrics: metrics.columnMetrics,
        calculatedAt: metrics.calculatedAt
      };

      return displayData;
    } catch (error) {
      logger.error(`❌ Error getting Kanban board metrics: ${error}`);
      throw error;
    }
  }

  /**
   * 📈 Get metrics for all Kanban boards
   */
  public static async getAllKanbanBoardMetrics(): Promise<MetricsDisplayData[]> {
    try {
      logger.info(`📈 Getting metrics for all Kanban boards`);

      // Get all Kanban boards
      const boards = await KanbanBoard.findAll({
        include: [
          {
            model: KanbanMetrics,
            as: 'metrics',
            required: false
          }
        ]
      });

      const metricsData: MetricsDisplayData[] = [];

      for (const board of boards) {
        const boardMetrics = await this.getKanbanBoardMetrics(board.id);
        if (boardMetrics) {
          metricsData.push(boardMetrics);
        }
      }

      logger.info(`✅ Retrieved metrics for ${metricsData.length} Kanban boards`);
      return metricsData;
    } catch (error) {
      logger.error(`❌ Error getting all Kanban board metrics: ${error}`);
      throw error;
    }
  }

  /**
   * 🎯 Get summary statistics across all Kanban boards
   */
  public static async getKanbanMetricsSummary(): Promise<any> {
    try {
      logger.info(`🎯 Calculating Kanban metrics summary`);

      const allMetrics = await this.getAllKanbanBoardMetrics();
      
      if (allMetrics.length === 0) {
        logger.warn(`⚠️ No Kanban metrics found for summary`);
        return null;
      }

      // Calculate throughput totals
      const totalWeeklyThroughput = allMetrics.reduce((sum, m) => {
        const weeklyTotal = m.throughputMetrics.weeklyThroughput.reduce((s, w) => s + w, 0);
        return sum + weeklyTotal;
      }, 0);

      const averageThroughput = allMetrics.length > 0 
        ? Math.round((totalWeeklyThroughput / allMetrics.length) * 10) / 10 
        : undefined;

      const summary = {
        totalBoards: allMetrics.length,
        totalIssues: allMetrics.reduce((sum, m) => sum + m.statusMetrics.totalIssues, 0),
        averageCycleTime: this.calculateAverage(allMetrics.map(m => m.timeMetrics.averageCycleTime).filter(t => t !== undefined) as number[]),
        averageLeadTime: this.calculateAverage(allMetrics.map(m => m.timeMetrics.averageLeadTime).filter(t => t !== undefined) as number[]),
        totalWipViolations: allMetrics.reduce((sum, m) => sum + m.qualityMetrics.wipViolations, 0),
        averageFlowEfficiency: this.calculateAverage(allMetrics.map(m => m.qualityMetrics.flowEfficiency).filter(f => f !== undefined) as number[]),
        totalWeeklyThroughput: totalWeeklyThroughput,
        averageThroughput: averageThroughput,
        boardsWithMetrics: allMetrics.map(m => ({
          boardId: m.boardInfo.id,
          boardName: m.boardInfo.name,
          lastCalculated: m.calculatedAt
        }))
      };

      logger.info(`✅ Kanban metrics summary calculated for ${summary.totalBoards} boards`);
      return summary;
    } catch (error) {
      logger.error(`❌ Error calculating Kanban metrics summary: ${error}`);
      throw error;
    }
  }

  /**
   * 📋 Format metrics for console/log display
   */
  public static formatMetricsForDisplay(metrics: MetricsDisplayData): string {
    const formatNumber = (num: number | undefined, decimals: number = 1): string => {
      return num !== undefined ? num.toFixed(decimals) : 'N/A';
    };

    const formatDate = (date: Date | undefined): string => {
      return date ? date.toLocaleDateString() : 'N/A';
    };

    return `
╔══════════════════════════════════════════════════════════════╗
║                    KANBAN BOARD METRICS                     ║
╠══════════════════════════════════════════════════════════════╣
║ Board: ${metrics.boardInfo.name.padEnd(49)} ║
║ Board ID: ${metrics.boardInfo.id.toString().padEnd(46)} ║
║ Last Calculated: ${metrics.calculatedAt.toLocaleString().padEnd(38)} ║
╠══════════════════════════════════════════════════════════════╣
║                      STATUS METRICS                         ║
╠══════════════════════════════════════════════════════════════╣
║ Total Issues: ${metrics.statusMetrics.totalIssues.toString().padEnd(42)} ║
║ Todo: ${metrics.statusMetrics.todoIssues.toString().padEnd(48)} ║
║ In Progress: ${metrics.statusMetrics.inProgressIssues.toString().padEnd(41)} ║
║ Done: ${metrics.statusMetrics.doneIssues.toString().padEnd(48)} ║
║ Blocked: ${metrics.statusMetrics.blockedIssues.toString().padEnd(45)} ║
║ Flagged: ${metrics.statusMetrics.flaggedIssues.toString().padEnd(45)} ║
╠══════════════════════════════════════════════════════════════╣
║                       TIME METRICS                          ║
╠══════════════════════════════════════════════════════════════╣
║ Avg Cycle Time: ${formatNumber(metrics.timeMetrics.averageCycleTime)} days${' '.padEnd(32)} ║
║ Median Cycle Time: ${formatNumber(metrics.timeMetrics.medianCycleTime)} days${' '.padEnd(28)} ║
║ Avg Lead Time: ${formatNumber(metrics.timeMetrics.averageLeadTime)} days${' '.padEnd(33)} ║
║ Median Lead Time: ${formatNumber(metrics.timeMetrics.medianLeadTime)} days${' '.padEnd(29)} ║
║ Avg Age in Progress: ${formatNumber(metrics.timeMetrics.averageAgeInProgress)} days${' '.padEnd(26)} ║
║ Oldest Issue Age: ${formatNumber(metrics.timeMetrics.oldestIssueAge)} days${' '.padEnd(30)} ║
╠══════════════════════════════════════════════════════════════╣
║                    THROUGHPUT METRICS                       ║
╠══════════════════════════════════════════════════════════════╣
║ Weekly Throughput: ${metrics.throughputMetrics.weeklyThroughput.slice(-4).join(', ').padEnd(33)} ║
║ Monthly Throughput: ${metrics.throughputMetrics.monthlyThroughput.slice(-3).join(', ').padEnd(32)} ║
╠══════════════════════════════════════════════════════════════╣
║                     QUALITY METRICS                         ║
╠══════════════════════════════════════════════════════════════╣
║ WIP Violations: ${metrics.qualityMetrics.wipViolations.toString().padEnd(38)} ║
║ Flow Efficiency: ${formatNumber(metrics.qualityMetrics.flowEfficiency)}%${' '.padEnd(36)} ║
╚══════════════════════════════════════════════════════════════╝
    `;
  }

  /**
   * 🧮 Helper method to calculate average
   */
  private static calculateAverage(numbers: number[]): number | undefined {
    if (numbers.length === 0) return undefined;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * 📊 Get metrics history for a board
   */
  public static async getMetricsHistory(kanbanBoardId: number, limit: number = 10): Promise<MetricsDisplayData[]> {
    try {
      logger.info(`📊 Getting metrics history for Kanban board ${kanbanBoardId}`);

      const metricsHistory = await KanbanMetrics.findAll({
        where: { kanbanBoardId },
        order: [['calculatedAt', 'DESC']],
        limit
      });

      const historyData: MetricsDisplayData[] = [];

      for (const metrics of metricsHistory) {
        const board = await KanbanBoard.findByPk(kanbanBoardId);
        if (board) {
          const displayData: MetricsDisplayData = {
            boardInfo: {
              id: board.id,
              name: board.name,
              projectId: board.projectId
            },
            statusMetrics: {
              totalIssues: metrics.totalIssues,
              todoIssues: metrics.todoIssues,
              inProgressIssues: metrics.inProgressIssues,
              doneIssues: metrics.doneIssues,
              blockedIssues: metrics.blockedIssues,
              flaggedIssues: metrics.flaggedIssues
            },
            timeMetrics: {
              averageCycleTime: metrics.averageCycleTime,
              medianCycleTime: metrics.medianCycleTime,
              averageLeadTime: metrics.averageLeadTime,
              medianLeadTime: metrics.medianLeadTime,
              averageAgeInProgress: metrics.averageAgeInProgress,
              oldestIssueAge: metrics.oldestIssueAge
            },
            throughputMetrics: {
              weeklyThroughput: metrics.weeklyThroughput,
              monthlyThroughput: metrics.monthlyThroughput
            },
            qualityMetrics: {
              wipViolations: metrics.wipViolations,
              flowEfficiency: metrics.flowEfficiency,
              wipUtilization: metrics.wipUtilization
            },
            breakdownMetrics: {
              issueTypeBreakdown: metrics.issueTypeBreakdown,
              priorityBreakdown: metrics.priorityBreakdown,
              assigneeBreakdown: metrics.assigneeBreakdown
            },
            columnMetrics: metrics.columnMetrics,
            calculatedAt: metrics.calculatedAt
          };

          historyData.push(displayData);
        }
      }

      logger.info(`✅ Retrieved ${historyData.length} metrics history entries for board ${kanbanBoardId}`);
      return historyData;
    } catch (error) {
      logger.error(`❌ Error getting metrics history: ${error}`);
      throw error;
    }
  }
}

export default KanbanMetricsDisplayService;
