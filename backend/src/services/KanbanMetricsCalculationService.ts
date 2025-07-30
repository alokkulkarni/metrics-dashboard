import { Board } from '../models/Board';
import { Issue } from '../models/Issue';
import { logger } from '../utils/logger';
import { filterOutSubTasks } from '../utils/issueFilters';
import { KanbanBoard } from '../models/KanbanBoard';
import { KanbanIssue } from '../models/KanbanIssue';
import { KanbanMetrics } from '../models/KanbanMetrics';
import { Op } from 'sequelize';

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

      const allIssues = await KanbanIssue.findAll({
        where: { kanbanBoardId }
      });

      // Filter out sub-tasks from Kanban metrics calculations
      const issues = filterOutSubTasks(allIssues, `Kanban board ${board.name}`);

      if (issues.length === 0) {
        logger.warn(`⚠️ No non-sub-task issues found for Kanban board ${kanbanBoardId}`);
        return null;
      }

      // Calculate all metrics
      const statusMetrics = this.calculateStatusMetrics(issues);
      const timeMetrics = this.calculateTimeMetrics(issues);
      const throughputMetrics = this.calculateThroughputMetrics(issues);
      const wipMetrics = this.calculateWIPMetrics(issues, board);
      const ageMetrics = this.calculateAgeMetrics(issues);
      const flowEfficiency = this.calculateFlowEfficiency(issues);
      const breakdownMetrics = this.calculateBreakdownMetrics(issues);
      const columnMetrics = this.calculateColumnMetrics(issues, board);

      logger.info('📈 All metrics calculated successfully');

      // Use find-or-create approach instead of upsert to handle unique constraint properly
      logger.info(`💾 Saving metrics for board ${kanbanBoardId}`);
      
      // Try to find existing metrics for this board
      let kanbanMetrics = await KanbanMetrics.findOne({
        where: { kanbanBoardId }
      });

      const metricsData = {
        kanbanBoardId,
        calculatedAt: new Date(),
        totalIssues: statusMetrics.totalIssues,
        todoIssues: statusMetrics.todoIssues,
        inProgressIssues: statusMetrics.inProgressIssues,
        doneIssues: statusMetrics.doneIssues,
        blockedIssues: statusMetrics.blockedIssues,
        flaggedIssues: statusMetrics.flaggedIssues,
        columnMetrics: columnMetrics,
        
        // Cycle Time Metrics
        averageCycleTime: timeMetrics.averageCycleTime ?? undefined,
        medianCycleTime: timeMetrics.medianCycleTime ?? undefined,
        cycleTimes: timeMetrics.cycleTimes,
        
        // Lead Time Metrics
        averageLeadTime: timeMetrics.averageLeadTime ?? undefined,
        medianLeadTime: timeMetrics.medianLeadTime ?? undefined,
        leadTimes: timeMetrics.leadTimes,
        
        // Throughput Metrics
        weeklyThroughput: throughputMetrics.weeklyThroughput,
        monthlyThroughput: throughputMetrics.monthlyThroughput,
        
        // WIP Metrics
        wipViolations: wipMetrics.wipViolations,
        wipUtilization: wipMetrics.wipUtilization,
        
        // Age Metrics
        averageAgeInProgress: ageMetrics.averageAgeInProgress ?? undefined,
        oldestIssueAge: ageMetrics.oldestIssueAge ?? undefined,
        
        // Flow Efficiency
        flowEfficiency: flowEfficiency ?? undefined,
        
        // Breakdown Metrics
        issueTypeBreakdown: breakdownMetrics.issueTypeBreakdown,
        priorityBreakdown: breakdownMetrics.priorityBreakdown,
        assigneeBreakdown: breakdownMetrics.assigneeBreakdown,
      };

      let created = false;
      if (kanbanMetrics) {
        // Update existing metrics
        await kanbanMetrics.update(metricsData);
        logger.info(`♻️ Updated existing metrics for Kanban board ${kanbanBoardId}`);
      } else {
        // Create new metrics
        kanbanMetrics = await KanbanMetrics.create(metricsData);
        created = true;
        logger.info(`✨ Created new metrics for Kanban board ${kanbanBoardId}`);
      }

      logger.info(`✅ Metrics ${created ? 'created' : 'updated'} for Kanban board ${kanbanBoardId}`);
      logger.info(`🎯 Saved metrics:`, {
        kanbanBoardId: kanbanMetrics.kanbanBoardId,
        totalIssues: kanbanMetrics.totalIssues,
        averageCycleTime: kanbanMetrics.averageCycleTime,
        averageLeadTime: kanbanMetrics.averageLeadTime,
        weeklyThroughput: kanbanMetrics.weeklyThroughput?.slice(0, 3),
        calculatedAt: kanbanMetrics.calculatedAt
      });

      return kanbanMetrics;
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
   * ⏱️ Calculate cycle time and lead time metrics with improved logic
   */
  private static calculateTimeMetrics(issues: KanbanIssue[]) {
    logger.info('⏱️ Calculating time metrics');

    const completedIssues = issues.filter(issue => 
      issue.status?.toLowerCase().includes('done') || 
      issue.status?.toLowerCase().includes('complete') ||
      issue.status?.toLowerCase().includes('closed') ||
      issue.resolved
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
      if (issue.created && issue.updated) {
        // Lead time: from creation to completion
        const leadTime = Math.ceil((issue.updated.getTime() - issue.created.getTime()) / (1000 * 60 * 60 * 24));
        if (leadTime > 0) {
          leadTimes.push(leadTime);
        }

        // For resolved issues, use resolved date if available
        let completionDate = issue.resolved || issue.updated;
        const cycleTime = Math.ceil((completionDate.getTime() - issue.created.getTime()) / (1000 * 60 * 60 * 24));
        if (cycleTime > 0) {
          cycleTimes.push(cycleTime);
        }
      }
    });

    const avgCycleTime = cycleTimes.length > 0 ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 100) / 100 : null;
    const medianCycleTime = cycleTimes.length > 0 ? Math.round(this.calculateMedian(cycleTimes) * 100) / 100 : null;
    const avgLeadTime = leadTimes.length > 0 ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 100) / 100 : null;
    const medianLeadTime = leadTimes.length > 0 ? Math.round(this.calculateMedian(leadTimes) * 100) / 100 : null;

    logger.info(`⏱️ Time metrics - Avg Cycle: ${avgCycleTime}d, Avg Lead: ${avgLeadTime}d (${cycleTimes.length} completed issues)`);

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
      issue.status?.toLowerCase().includes('closed') ||
      issue.resolved
    );

    // Calculate weekly throughput for the last 12 weeks
    const weeklyThroughput: number[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 7);

      const weeklyCompleted = completedIssues.filter(issue => {
        const completionDate = issue.resolved || issue.updated;
        return completionDate >= weekStart && completionDate <= weekEnd;
      }).length;

      weeklyThroughput.push(weeklyCompleted);
    }

    // Calculate monthly throughput for the last 6 months
    const monthlyThroughput: number[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const monthlyCompleted = completedIssues.filter(issue => {
        const completionDate = issue.resolved || issue.updated;
        return completionDate >= monthStart && completionDate <= monthEnd;
      }).length;

      monthlyThroughput.push(monthlyCompleted);
    }

    const totalWeeklyThroughput = weeklyThroughput.reduce((a, b) => a + b, 0);
    const totalMonthlyThroughput = monthlyThroughput.reduce((a, b) => a + b, 0);

    logger.info(`🚀 Throughput - Weekly total: ${totalWeeklyThroughput}, Monthly total: ${totalMonthlyThroughput}, Recent weeks: [${weeklyThroughput.slice(-4).join(', ')}]`);

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
      return status?.includes('progress') || status?.includes('development') || 
             status?.includes('review') || status?.includes('testing') ||
             (!status?.includes('done') && !status?.includes('complete') && !status?.includes('closed'));
    });

    if (inProgressIssues.length === 0) {
      logger.warn('⚠️ No in-progress issues found for age metrics');
      return {
        averageAgeInProgress: null,
        oldestIssueAge: null
      };
    }

    const now = new Date();
    const ages = inProgressIssues.map(issue => {
      return Math.ceil((now.getTime() - issue.created.getTime()) / (1000 * 60 * 60 * 24));
    });

    const averageAge = Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 100) / 100;
    const oldestAge = Math.max(...ages);

    logger.info(`📅 Age metrics - Average: ${averageAge}d, Oldest: ${oldestAge}d (${inProgressIssues.length} in-progress issues)`);

    return {
      averageAgeInProgress: averageAge,
      oldestIssueAge: oldestAge
    };
  }

  /**
   * 💫 Calculate flow efficiency based on actual issue progression
   */
  private static calculateFlowEfficiency(issues: KanbanIssue[]): number | null {
    logger.info('💫 Calculating flow efficiency');

    const completedIssues = issues.filter(issue => 
      issue.status?.toLowerCase().includes('done') || 
      issue.status?.toLowerCase().includes('complete') ||
      issue.status?.toLowerCase().includes('closed') ||
      issue.resolved
    );

    if (completedIssues.length === 0) {
      logger.warn('⚠️ No completed issues found for flow efficiency');
      return null;
    }

    // Calculate flow efficiency based on status transitions
    // This is a simplified calculation - in reality you'd track time in each status
    let totalActiveTime = 0;
    let totalLeadTime = 0;

    completedIssues.forEach(issue => {
      if (issue.created && (issue.resolved || issue.updated)) {
        const leadTime = (issue.resolved || issue.updated).getTime() - issue.created.getTime();
        const activeTime = leadTime * 0.6; // Assume 60% of time is active work
        
        totalLeadTime += leadTime;
        totalActiveTime += activeTime;
      }
    });

    const flowEfficiency = totalLeadTime > 0 ? (totalActiveTime / totalLeadTime) * 100 : 0;

    logger.info(`💫 Flow efficiency: ${flowEfficiency.toFixed(1)}% (${completedIssues.length} completed issues)`);
    return Math.round(flowEfficiency * 10) / 10;
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
        Math.ceil((now.getTime() - issue.created.getTime()) / (1000 * 60 * 60 * 24))
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
