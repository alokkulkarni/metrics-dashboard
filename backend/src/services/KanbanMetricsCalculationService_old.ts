import { KanbanBoard } from '../models/KanbanBoard';
import { KanbanIssue } from '../models/KanbanIssue';
import { KanbanMetrics } from '../models/KanbanMetrics';
import { Sprint } from '../models/Sprint';
import { logger } from '../utils/logger';
import { QueryTypes } from 'sequelize';

interface ColumnMetric {
  columnName: string;
  issueCount: number;
  averageAge: number;
  oldestIssueAge: number;
  wipLimit?: number;
  wipViolation: boolean;
}

interface CalculationResult {
  calculatedBoards: number[];
  skippedBoards: number[];
}

export class KanbanMetricsCalculationService {

  /**
   * 🎯 Calculate metrics for all Kanban boards
   */
  public static async calculateMetricsForAllBoards(): Promise<CalculationResult> {
    try {
      logger.info('🚀 Starting metrics calculation for all Kanban boards');

      const boards = await KanbanBoard.findAll();
      const result: CalculationResult = {
        calculatedBoards: [],
        skippedBoards: []
      };

      for (const board of boards) {
        try {
          logger.info(`📊 Processing Kanban board: ${board.name} (ID: ${board.id})`);
          
          const metrics = await this.calculateMetricsForBoard(board.id);
          if (metrics) {
            result.calculatedBoards.push(board.id);
            logger.info(`✅ Metrics calculated for board ${board.id}`);
          } else {
            result.skippedBoards.push(board.id);
            logger.warn(`⚠️ Skipped board ${board.id} - no issues found`);
          }
        } catch (error) {
          logger.error(`❌ Error calculating metrics for board ${board.id}: ${error}`);
          result.skippedBoards.push(board.id);
        }
      }

      logger.info(`🎉 Metrics calculation completed! Calculated: ${result.calculatedBoards.length}, Skipped: ${result.skippedBoards.length}`);
      return result;
    } catch (error) {
      logger.error(`❌ Error in calculateMetricsForAllBoards: ${error}`);
      throw error;
    }
  }

  /**
   * 📊 Calculate metrics for a specific Kanban board
   */
  public static async calculateMetricsForBoard(kanbanBoardId: number): Promise<KanbanMetrics | null> {
    try {
      logger.info(`📊 Calculating metrics for Kanban board ${kanbanBoardId}`);

      // Get the board and its issues
      const board = await KanbanBoard.findByPk(kanbanBoardId);
      if (!board) {
        logger.warn(`⚠️ Kanban board ${kanbanBoardId} not found`);
        return null;
      }

      // Debug the query issue for board 95
      if (kanbanBoardId === 95) {
        logger.info(`🔍 Debug: Testing query for board 95...`);
        
        // Test with raw SQL first
        const rawIssues = await KanbanIssue.sequelize?.query(
          'SELECT id, key, kanban_board_id FROM kanban_issues WHERE kanban_board_id = 95 LIMIT 5',
          { type: QueryTypes.SELECT }
        );
        
        logger.info(`🔍 Debug: Raw query found ${rawIssues?.length || 0} issues for board 95`);
        if (rawIssues && rawIssues.length > 0) {
          logger.info(`🔍 Debug: Sample raw issue:`, rawIssues[0]);
        }
      }

      const issues = await KanbanIssue.findAll({
        where: { kanbanBoardId }
      });

      logger.info(`🔍 Query for board ${kanbanBoardId}: Found ${issues.length} issues`);
      if (issues.length === 0) {
        // Let's debug why no issues are found
        const totalIssues = await KanbanIssue.count();
        const allBoardIds = await KanbanIssue.findAll({
          attributes: ['kanbanBoardId'],
          group: ['kanbanBoardId'],
          raw: true
        });
        logger.info(`🔍 Debug: Total issues in DB: ${totalIssues}, Unique board IDs: ${JSON.stringify(allBoardIds.slice(0, 10))}`);
      }

      if (issues.length === 0) {
        logger.warn(`⚠️ No issues found for Kanban board ${kanbanBoardId}`);
        return null;
      }

      logger.info(`🔍 Found ${issues.length} issues for board ${board.name}`);

      // Calculate all metrics (Kanban doesn't use sprints)
      const statusMetrics = this.calculateStatusMetrics(issues);
      const timeMetrics = this.calculateTimeMetrics(issues);
      const throughputMetrics = this.calculateThroughputMetrics(issues);
      const wipMetrics = this.calculateWIPMetrics(issues, board);
      const ageMetrics = this.calculateAgeMetrics(issues);
      const flowEfficiency = this.calculateFlowEfficiency(issues);
      const breakdownMetrics = this.calculateBreakdownMetrics(issues);
      const columnMetrics = this.calculateColumnMetrics(issues, board);

      logger.info('📈 All metrics calculated successfully');

      // Create or update metrics record
      const metricsData = {
        kanbanBoardId,
        calculatedAt: new Date(),
        ...statusMetrics,
        ...timeMetrics,
        ...throughputMetrics,
        ...wipMetrics,
        ...ageMetrics,
        flowEfficiency,
        ...breakdownMetrics,
        columnMetrics
      };

      // Use raw SQL to properly handle PostgreSQL arrays since Sequelize has serialization issues
      logger.info(`� Using raw SQL to save metrics for board ${kanbanBoardId}`);
      
      const sequelize = KanbanMetrics.sequelize;
      if (!sequelize) {
        throw new Error('Sequelize instance not available');
      }
      
      // Extract arrays as JavaScript arrays for raw SQL
      const weeklyThroughputArray = Array.isArray(metricsData.weeklyThroughput) 
        ? metricsData.weeklyThroughput.map(val => parseInt(String(val), 10))
        : [];
      const monthlyThroughputArray = Array.isArray(metricsData.monthlyThroughput) 
        ? metricsData.monthlyThroughput.map(val => parseInt(String(val), 10))
        : [];
      
      logger.info(`� Array values - Weekly: [${weeklyThroughputArray.join(',')}], Monthly: [${monthlyThroughputArray.join(',')}]`);
      
      // Use raw SQL UPDATE/INSERT approach for upsert with proper array handling
      // First try to update existing record
      const updateResult = await sequelize.query(`
        UPDATE kanban_metrics SET
          weekly_throughput = ARRAY[${weeklyThroughputArray.join(',')}],
          monthly_throughput = ARRAY[${monthlyThroughputArray.join(',')}],
          average_cycle_time = :averageCycleTime,
          average_lead_time = :averageLeadTime,
          total_issues = :totalIssues,
          in_progress_issues = :inProgressIssues,
          blocked_issues = :blockedIssues,
          calculated_at = NOW(),
          updated_at = NOW()
        WHERE kanban_board_id = :kanbanBoardId
        RETURNING *;
      `, {
        replacements: {
          kanbanBoardId: kanbanBoardId,
          averageCycleTime: parseFloat((metricsData.averageCycleTime || 0).toFixed(2)),
          averageLeadTime: parseFloat((metricsData.averageLeadTime || 0).toFixed(2)),
          totalIssues: metricsData.totalIssues || 0,
          inProgressIssues: metricsData.inProgressIssues || 0,
          blockedIssues: metricsData.blockedIssues || 0,
        },
        type: QueryTypes.SELECT
      });

      let result;
      if (updateResult.length === 0) {
        // No existing record, insert new one
        result = await sequelize.query(`
          INSERT INTO kanban_metrics (
            kanban_board_id, weekly_throughput, monthly_throughput, average_cycle_time, 
            average_lead_time, total_issues, in_progress_issues, 
            blocked_issues, calculated_at, created_at, updated_at
          ) VALUES (
            :kanbanBoardId, ARRAY[${weeklyThroughputArray.join(',')}], ARRAY[${monthlyThroughputArray.join(',')}], :averageCycleTime,
            :averageLeadTime, :totalIssues, :inProgressIssues,
            :blockedIssues, NOW(), NOW(), NOW()
          )
          RETURNING *;
        `, {
          replacements: {
            kanbanBoardId: kanbanBoardId,
            averageCycleTime: parseFloat((metricsData.averageCycleTime || 0).toFixed(2)),
            averageLeadTime: parseFloat((metricsData.averageLeadTime || 0).toFixed(2)),
            totalIssues: metricsData.totalIssues || 0,
            inProgressIssues: metricsData.inProgressIssues || 0,
            blockedIssues: metricsData.blockedIssues || 0,
          },
          type: QueryTypes.SELECT
        });
      } else {
        result = updateResult;
      }

      const metrics = result[0] as any;
      logger.info(`✅ Metrics saved using raw SQL for Kanban board ${kanbanBoardId}`);
      logger.info(`🎯 Saved metrics:`, {
        kanban_board_id: metrics.kanban_board_id,
        weekly_throughput: metrics.weekly_throughput,
        monthly_throughput: metrics.monthly_throughput,
        average_cycle_time: metrics.average_cycle_time,
        total_issues: metrics.total_issues
      });

      return metrics;
    } catch (error) {
      logger.error(`❌ Error calculating metrics for Kanban board ${kanbanBoardId}: ${error}`);
      throw error;
    }
  }

  /**
   *  Calculate status-based metrics
   */
  private static calculateStatusMetrics(issues: KanbanIssue[]) {
    logger.info('📊 Calculating status metrics');

    const statusCounts = {
      totalIssues: issues.length,
      todoIssues: 0,
      inProgressIssues: 0,
      doneIssues: 0,
      blockedIssues: 0,
      flaggedIssues: 0
    };

    issues.forEach(issue => {
      // Count by status
      const status = issue.status?.toLowerCase();
      if (status?.includes('to do') || status?.includes('todo') || status?.includes('backlog')) {
        statusCounts.todoIssues++;
      } else if (status?.includes('progress') || status?.includes('development') || status?.includes('review')) {
        statusCounts.inProgressIssues++;
      } else if (status?.includes('done') || status?.includes('complete') || status?.includes('closed')) {
        statusCounts.doneIssues++;
      }

      // Count blocked and flagged
      if (issue.blockedReason) {
        statusCounts.blockedIssues++;
      }
      if (issue.flagged) {
        statusCounts.flaggedIssues++;
      }
    });

    logger.info(`📈 Status metrics: ${JSON.stringify(statusCounts)}`);
    return statusCounts;
  }

  /**
   * ⏱️ Calculate cycle time and lead time metrics
   */
  private static calculateTimeMetrics(issues: KanbanIssue[]) {
    logger.info('⏱️ Calculating time metrics');

    const completedIssues = issues.filter(issue => 
      issue.status?.toLowerCase().includes('done') || 
      issue.status?.toLowerCase().includes('complete') ||
      issue.status?.toLowerCase().includes('closed')
    );

    if (completedIssues.length === 0) {
      logger.warn('⚠️ No completed issues found for time metrics');
      return {
        averageCycleTime: undefined,
        medianCycleTime: undefined,
        cycleTimes: [],
        averageLeadTime: undefined,
        medianLeadTime: undefined,
        leadTimes: []
      };
    }

    const cycleTimes: number[] = [];
    const leadTimes: number[] = [];

    completedIssues.forEach(issue => {
      if (issue.createdAt && issue.updatedAt) {
        // Lead time: from creation to completion
        const leadTime = Math.ceil((issue.updatedAt.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        leadTimes.push(leadTime);

        // Cycle time: approximate as 70% of lead time (in-progress time)
        const cycleTime = Math.ceil(leadTime * 0.7);
        cycleTimes.push(cycleTime);
      }
    });

    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : undefined;
    const medianCycleTime = cycleTimes.length > 0 ? this.calculateMedian(cycleTimes) : undefined;
    const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : undefined;
    const medianLeadTime = leadTimes.length > 0 ? this.calculateMedian(leadTimes) : undefined;

    logger.info(`⏱️ Time metrics - Avg Cycle: ${avgCycleTime?.toFixed(1)}d, Avg Lead: ${avgLeadTime?.toFixed(1)}d`);

    return {
      averageCycleTime: avgCycleTime,
      medianCycleTime: medianCycleTime,
      cycleTimes,
      averageLeadTime: avgLeadTime,
      medianLeadTime: medianLeadTime,
      leadTimes
    };
  }

  /**
   * 🚀 Calculate throughput metrics for Kanban flow
   */
  private static calculateThroughputMetrics(issues: KanbanIssue[]) {
    logger.info('🚀 Calculating throughput metrics');

    const completedIssues = issues.filter(issue => 
      issue.status?.toLowerCase().includes('done') || 
      issue.status?.toLowerCase().includes('complete') ||
      issue.status?.toLowerCase().includes('closed')
    );

    // Calculate weekly throughput for the last 12 weeks
    const weeklyThroughput: number[] = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7)); // Weekly periods
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 7);

      const weeklyCompleted = completedIssues.filter(issue => 
        issue.updatedAt >= weekStart && issue.updatedAt <= weekEnd
      ).length;

      weeklyThroughput.unshift(weeklyCompleted);
    }

    // Calculate monthly throughput for the last 6 months
    const monthlyThroughput: number[] = [];
    
    for (let i = 0; i < 6; i++) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const monthlyCompleted = completedIssues.filter(issue => 
        issue.updatedAt >= monthStart && issue.updatedAt <= monthEnd
      ).length;

      monthlyThroughput.unshift(monthlyCompleted);
    }

    logger.info(`🚀 Throughput - Weekly: [${weeklyThroughput.slice(-4).join(', ')}], Monthly: [${monthlyThroughput.slice(-3).join(', ')}]`);

    return {
      weeklyThroughput,
      monthlyThroughput
    };
  }

  /**
   * 🚧 Calculate WIP metrics and violations
   */
  private static calculateWIPMetrics(issues: KanbanIssue[], board: KanbanBoard) {
    logger.info('🚧 Calculating WIP metrics');

    // Group issues by column
    const columnIssues = new Map<string, KanbanIssue[]>();
    issues.forEach(issue => {
      const column = issue.status || 'Unknown';
      if (!columnIssues.has(column)) {
        columnIssues.set(column, []);
      }
      columnIssues.get(column)!.push(issue);
    });

    let totalWipViolations = 0;
    const wipUtilization: Record<string, any> = {};

    columnIssues.forEach((columnIssueList, columnName) => {
      const issueCount = columnIssueList.length;
      const wipLimit = this.getWIPLimitForColumn(columnName, board);
      
      let violation = false;
      if (wipLimit && issueCount > wipLimit) {
        totalWipViolations++;
        violation = true;
      }

      wipUtilization[columnName] = {
        currentCount: issueCount,
        wipLimit: wipLimit || null,
        utilization: wipLimit ? Math.round((issueCount / wipLimit) * 100) : null,
        violation
      };
    });

    logger.info(`🚧 WIP metrics - Violations: ${totalWipViolations}, Columns: ${columnIssues.size}`);

    return {
      wipViolations: totalWipViolations,
      wipUtilization
    };
  }

  /**
   * 📅 Calculate age metrics for in-progress issues
   */
  private static calculateAgeMetrics(issues: KanbanIssue[]) {
    logger.info('📅 Calculating age metrics');

    const inProgressIssues = issues.filter(issue => {
      const status = issue.status?.toLowerCase();
      return status?.includes('progress') || status?.includes('development') || status?.includes('review');
    });

    if (inProgressIssues.length === 0) {
      logger.warn('⚠️ No in-progress issues found for age metrics');
      return {
        averageAgeInProgress: undefined,
        oldestIssueAge: undefined
      };
    }

    const now = new Date();
    const ages = inProgressIssues.map(issue => {
      return Math.ceil((now.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    });

    const averageAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    const oldestAge = Math.max(...ages);

    logger.info(`📅 Age metrics - Average: ${averageAge.toFixed(1)}d, Oldest: ${oldestAge}d`);

    return {
      averageAgeInProgress: averageAge,
      oldestIssueAge: oldestAge
    };
  }

  /**
   * 💫 Calculate flow efficiency
   */
  private static calculateFlowEfficiency(issues: KanbanIssue[]): number | undefined {
    logger.info('💫 Calculating flow efficiency');

    const completedIssues = issues.filter(issue => 
      issue.status?.toLowerCase().includes('done') || 
      issue.status?.toLowerCase().includes('complete') ||
      issue.status?.toLowerCase().includes('closed')
    );

    if (completedIssues.length === 0) {
      logger.warn('⚠️ No completed issues found for flow efficiency');
      return undefined;
    }

    // Simplified flow efficiency calculation
    // Assumes 60% of time is actual work time vs waiting time
    const flowEfficiency = 60; // Placeholder - would need more detailed time tracking

    logger.info(`💫 Flow efficiency: ${flowEfficiency}%`);
    return flowEfficiency;
  }

  /**
   * 📊 Calculate breakdown metrics by type, priority, and assignee
   */
  private static calculateBreakdownMetrics(issues: KanbanIssue[]) {
    logger.info('📊 Calculating breakdown metrics');

    const issueTypeBreakdown: Record<string, number> = {};
    const priorityBreakdown: Record<string, number> = {};
    const assigneeBreakdown: Record<string, number> = {};

    issues.forEach(issue => {
      // Issue type breakdown
      const issueType = issue.issueType || 'Unknown';
      issueTypeBreakdown[issueType] = (issueTypeBreakdown[issueType] || 0) + 1;

      // Priority breakdown
      const priority = issue.priority || 'Unknown';
      priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;

      // Assignee breakdown
      const assignee = issue.assigneeName || 'Unassigned';
      assigneeBreakdown[assignee] = (assigneeBreakdown[assignee] || 0) + 1;
    });

    logger.info(`📊 Breakdown - Types: ${Object.keys(issueTypeBreakdown).length}, Priorities: ${Object.keys(priorityBreakdown).length}, Assignees: ${Object.keys(assigneeBreakdown).length}`);

    return {
      issueTypeBreakdown,
      priorityBreakdown,
      assigneeBreakdown
    };
  }

  /**
   * 📋 Calculate detailed column metrics
   */
  private static calculateColumnMetrics(issues: KanbanIssue[], board: KanbanBoard): ColumnMetric[] {
    logger.info('📋 Calculating column metrics');

    const columnMetrics: ColumnMetric[] = [];
    const columnIssues = new Map<string, KanbanIssue[]>();

    // Group issues by column
    issues.forEach(issue => {
      const column = issue.status || 'Unknown';
      if (!columnIssues.has(column)) {
        columnIssues.set(column, []);
      }
      columnIssues.get(column)!.push(issue);
    });

    const now = new Date();

    columnIssues.forEach((columnIssueList, columnName) => {
      const ages = columnIssueList.map(issue => 
        Math.ceil((now.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      );

      const averageAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
      const oldestAge = ages.length > 0 ? Math.max(...ages) : 0;
      const wipLimit = this.getWIPLimitForColumn(columnName, board);

      const columnMetric: ColumnMetric = {
        columnName,
        issueCount: columnIssueList.length,
        averageAge: Math.round(averageAge * 10) / 10,
        oldestIssueAge: oldestAge,
        wipLimit,
        wipViolation: wipLimit ? columnIssueList.length > wipLimit : false
      };

      columnMetrics.push(columnMetric);
    });

    logger.info(`📋 Column metrics calculated for ${columnMetrics.length} columns`);
    return columnMetrics;
  }

  /**
   * 🔢 Helper method to calculate median
   */
  private static calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  /**
   * 🚧 Helper method to get WIP limit for a column
   */
  private static getWIPLimitForColumn(columnName: string, board: KanbanBoard): number | undefined {
    // This would typically come from board configuration
    // For now, using defaults based on column names
    const column = columnName.toLowerCase();
    
    if (column.includes('progress') || column.includes('development')) {
      return 5;
    } else if (column.includes('review') || column.includes('testing')) {
      return 3;
    } else if (column.includes('deploy') || column.includes('release')) {
      return 2;
    }
    
    return undefined; // No WIP limit
  }
}

export default KanbanMetricsCalculationService;
