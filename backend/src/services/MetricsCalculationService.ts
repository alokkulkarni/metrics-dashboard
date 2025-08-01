import { Board } from '../models/Board';
import { Sprint } from '../models/Sprint';
import { Issue } from '../models/Issue';
import { SprintMetrics } from '../models/SprintMetrics';
import { BoardMetrics } from '../models/BoardMetrics';
import { logger } from '../utils/logger';
import { filterOutSubTasks, filterForQualityMetrics, filterDefectIssues } from '../utils/issueFilters';
import { Op } from 'sequelize';
import { SprintCommentaryService } from './sprintCommentaryService';
import { IssueChangelogService } from './IssueChangelogService';

export interface CalculatedSprintMetrics {
  sprintId: number;
  velocity: number;
  churnRate: number;
  completionRate: number;
  teamMembers: string[];
  totalStoryPoints: number;
  completedStoryPoints: number;
  addedStoryPoints: number;
  removedStoryPoints: number;
  totalIssues: number;
  completedIssues: number;
  addedIssues: number;
  removedIssues: number;
  issueTypeBreakdown: Record<string, number>;
  storyPointsBreakdown?: Record<string, number>;
  averageCycleTime?: number;
  averageLeadTime?: number;
  scopeChangePercent: number;
  defectLeakageRate: number;
  qualityRate: number;
  totalDefects: number;
  completedDefects: number;
  calculatedAt: Date;
}

export interface CalculatedBoardMetrics {
  boardId: number;
  averageVelocity: number;
  averageChurnRate: number;
  averageCompletionRate: number;
  totalSprints: number;
  activeSprints: number;
  completedSprints: number;
  totalStoryPoints: number;
  averageCycleTime?: number;
  averageLeadTime?: number;
  teamMembers: string[];
  predictedVelocity: number;
  velocityTrend: 'up' | 'down' | 'stable';
  churnRateTrend: 'up' | 'down' | 'stable';
  averageDefectLeakageRate: number;
  averageQualityRate: number;
  totalDefects: number;
  calculatedAt: Date;
}

export class MetricsCalculationService {
  private static commentaryService = new SprintCommentaryService();

  /**
   * Calculate metrics for a specific sprint
   */
  static async calculateSprintMetrics(sprintId: number): Promise<CalculatedSprintMetrics | null> {
    try {
      logger.info(`Calculating metrics for sprint ${sprintId}`);

      const sprint = await Sprint.findByPk(sprintId);
      if (!sprint) {
        logger.warn(`Sprint ${sprintId} not found`);
        return null;
      }

      // Get all issues for this sprint
      const allIssues = await Issue.findAll({
        where: { sprintId },
        raw: true,
      });

      // Filter out sub-tasks from ALL sprint metrics calculations
      const issues = filterOutSubTasks(allIssues, `Sprint ${sprintId}`);

      if (issues.length === 0) {
        logger.info(`No non-sub-task issues found for sprint ${sprintId}`);
        return {
          sprintId,
          velocity: 0,
          churnRate: 0,
          completionRate: 0,
          teamMembers: [],
          totalStoryPoints: 0,
          completedStoryPoints: 0,
          addedStoryPoints: 0,
          removedStoryPoints: 0,
          totalIssues: 0,
          completedIssues: 0,
          addedIssues: 0,
          removedIssues: 0,
          issueTypeBreakdown: {},
          averageCycleTime: 0,
          averageLeadTime: 0,
          scopeChangePercent: 0,
          defectLeakageRate: 0,
          qualityRate: 100,
          totalDefects: 0,
          completedDefects: 0,
          calculatedAt: new Date(),
        };
      }

      // Calculate basic metrics
      const totalIssues = issues.length;
      const completedIssues = issues.filter(issue => 
        ['Done', 'Closed', 'Resolved'].includes(issue.status as string)
      ).length;
      
      const totalStoryPoints = issues.reduce((sum, issue) => 
        sum + (parseFloat(issue.storyPoints?.toString() || '0') || 0), 0
      );
      
      const completedStoryPoints = issues
        .filter(issue => ['Done', 'Closed', 'Resolved'].includes(issue.status as string))
        .reduce((sum, issue) => sum + (parseFloat(issue.storyPoints?.toString() || '0') || 0), 0);

      // Calculate velocity - use story points if available, otherwise use issue count as fallback
      const hasStoryPoints = totalStoryPoints > 0;
      const velocity = hasStoryPoints ? completedStoryPoints : completedIssues;

      logger.info(`Sprint ${sprintId} metrics calculation:`, {
        totalIssues,
        completedIssues,
        totalStoryPoints,
        completedStoryPoints,
        hasStoryPoints,
        velocity,
        velocityType: hasStoryPoints ? 'story_points' : 'issue_count'
      });

      // Calculate completion rate based on story points (not issue count)
      const completionRate = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;

      logger.info(`Sprint ${sprintId} completion rate calculation:`, {
        totalStoryPoints,
        completedStoryPoints,
        completionRate,
        fallbackToIssueCount: totalStoryPoints === 0
      });

      // Extract unique team members
      const teamMembers = Array.from(new Set([
        ...issues.map(issue => issue.assigneeName).filter(Boolean),
        ...issues.map(issue => issue.reporterName).filter(Boolean),
      ])) as string[];

      // Calculate issue type breakdown
      const issueTypeBreakdown: Record<string, number> = {};
      issues.forEach(issue => {
        const issueType = issue.issueType || 'Unknown';
        issueTypeBreakdown[issueType] = (issueTypeBreakdown[issueType] || 0) + 1;
      });

      logger.info(`Sprint ${sprintId} issue type breakdown:`, issueTypeBreakdown);

      // Calculate story points breakdown by size
      const storyPointsBreakdown = {
        'Small (0-3)': 0,
        'Medium (3-5)': 0,
        'Large (>5)': 0,
      };
      
      issues.forEach(issue => {
        const storyPoints = parseFloat(issue.storyPoints?.toString() || '0') || 0;
        if (storyPoints === 0) {
          // Skip issues without story points
          return;
        } else if (storyPoints <= 3) {
          storyPointsBreakdown['Small (0-3)'] += storyPoints;
        } else if (storyPoints <= 5) {
          storyPointsBreakdown['Medium (3-5)'] += storyPoints;
        } else {
          storyPointsBreakdown['Large (>5)'] += storyPoints;
        }
      });

      logger.info(`Sprint ${sprintId} story points breakdown:`, storyPointsBreakdown);

      // Calculate quality metrics (defect leakage rate and quality rate)
      // Only count 'Defect' issues as actual defects, exclude 'Bug' issues entirely
      const defectIssues = filterDefectIssues(issues);
      const totalDefects = defectIssues.length;
      const completedDefects = defectIssues.filter(issue => 
        ['Done', 'Closed', 'Resolved'].includes(issue.status as string)
      ).length;

      // Filter out excluded issue types for quality calculation
      const relevantIssues = filterForQualityMetrics(issues);
      const totalRelevantIssues = relevantIssues.length;

      // Defect Leakage Rate: Percentage of defects compared to relevant issues (excluding releases, sub-tasks, spikes)
      const defectLeakageRate = totalRelevantIssues > 0 ? (totalDefects / totalRelevantIssues) * 100 : 0;

      // Quality Rate: Percentage of non-defect issues among relevant issues
      const qualityRate = totalRelevantIssues > 0 ? ((totalRelevantIssues - totalDefects) / totalRelevantIssues) * 100 : 100;

      logger.info(`Sprint ${sprintId} quality metrics:`, {
        totalDefects,
        completedDefects,
        totalIssues,
        totalRelevantIssues,
        defectLeakageRate,
        qualityRate
      });

      // Calculate cycle time and lead time for completed issues
      const completedIssuesWithDates = issues.filter(issue => 
        ['Done', 'Closed', 'Resolved'].includes(issue.status as string) && 
        issue.created && 
        issue.resolved
      );

      let averageCycleTime: number | undefined;
      let averageLeadTime: number | undefined;

      if (completedIssuesWithDates.length > 0) {
        const cycleTimes = completedIssuesWithDates.map(issue => {
          const created = new Date(issue.created as unknown as string);
          const resolved = new Date(issue.resolved as unknown as string);
          return (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
        });

        averageCycleTime = cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length;
        averageLeadTime = averageCycleTime; // For now, treating them the same
      }

      // Calculate churn rate using actual issue movements from changelog data
      // Churn rate formula: ((added + removed) / committedStoryPoints) * 100
      // This provides an accurate measure of sprint scope changes during the sprint
      
      let churnRate = 0;
      let addedStoryPoints = 0;
      let removedStoryPoints = 0;
      let addedIssues = 0;
      let removedIssues = 0;
      
      try {
        // Get actual sprint changes from changelog if sprint dates are available
        if (sprint.startDate && sprint.endDate) {
          const changelogService = new IssueChangelogService();
          const sprintChanges = await changelogService.getSprintChangelogForChurn(
            sprintId, 
            sprint.startDate, 
            sprint.endDate
          );
          
          addedStoryPoints = sprintChanges.addedStoryPoints;
          removedStoryPoints = sprintChanges.removedStoryPoints;
          addedIssues = sprintChanges.addedIssues;
          removedIssues = sprintChanges.removedIssues;
          
          // Calculate churn rate: ((added + removed) / committedStoryPoints) * 100
          // Use totalStoryPoints as proxy for committed points (at sprint end)
          const committedStoryPoints = totalStoryPoints;
          if (committedStoryPoints > 0) {
            churnRate = ((addedStoryPoints + removedStoryPoints) / committedStoryPoints) * 100;
          }
          
          logger.info(`Sprint ${sprintId} churn rate calculation (changelog-based):`, {
            sprintStartDate: sprint.startDate,
            sprintEndDate: sprint.endDate,
            addedStoryPoints,
            removedStoryPoints,
            addedIssues,
            removedIssues,
            committedStoryPoints,
            churnRate,
            formula: '((added + removed) / committed) * 100'
          });
        } else {
          logger.warn(`Sprint ${sprintId} missing start/end dates, using fallback churn calculation`);
          throw new Error('Missing sprint dates');
        }
        
      } catch (error) {
        logger.warn(`Failed to calculate changelog-based churn rate for sprint ${sprintId}, falling back to completion-based calculation:`, error);
        
        // Fallback to old calculation if changelog data is not available
        const incompleteStoryPoints = totalStoryPoints - completedStoryPoints;
        churnRate = totalStoryPoints > 0 ? 
          (incompleteStoryPoints / totalStoryPoints) * 100 : 0;
        
        logger.info(`Sprint ${sprintId} churn rate calculation (fallback):`, {
          totalStoryPoints,
          completedStoryPoints,
          incompleteStoryPoints,
          churnRate,
          note: 'Using completion-based fallback due to missing changelog data or sprint dates'
        });
      }
      
      // Scope change percent is the same as churn rate for now
      const scopeChangePercent = churnRate;

      return {
        sprintId,
        velocity,
        churnRate,
        completionRate,
        teamMembers,
        totalStoryPoints,
        completedStoryPoints,
        addedStoryPoints,
        removedStoryPoints,
        totalIssues,
        completedIssues,
        addedIssues,
        removedIssues,
        issueTypeBreakdown,
        storyPointsBreakdown,
        averageCycleTime,
        averageLeadTime,
        scopeChangePercent,
        defectLeakageRate,
        qualityRate,
        totalDefects,
        completedDefects,
        calculatedAt: new Date(),
      };

    } catch (error) {
      logger.error(`Error calculating sprint metrics for sprint ${sprintId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate aggregate metrics for a board across all its sprints
   */
  static async calculateBoardMetrics(boardId: number): Promise<CalculatedBoardMetrics | null> {
    try {
      logger.info(`Calculating board metrics for board ${boardId}`);

      const board = await Board.findByPk(boardId);
      if (!board) {
        logger.warn(`Board ${boardId} not found`);
        return null;
      }

      // Get all sprints for this board
      const sprints = await Sprint.findAll({
        where: { boardId },
        raw: true,
      });

      if (sprints.length === 0) {
        logger.info(`No sprints found for board ${boardId}`);
        return {
          boardId,
          averageVelocity: 0,
          averageChurnRate: 0,
          averageCompletionRate: 0,
          totalSprints: 0,
          activeSprints: 0,
          completedSprints: 0,
          totalStoryPoints: 0,
          averageCycleTime: 0,
          averageLeadTime: 0,
          teamMembers: [],
          predictedVelocity: 0,
          velocityTrend: 'stable',
          churnRateTrend: 'stable',
          averageDefectLeakageRate: 0,
          averageQualityRate: 100,
          totalDefects: 0,
          calculatedAt: new Date(),
        };
      }

      const totalSprints = sprints.length;
      const activeSprints = sprints.filter(sprint => sprint.state === 'active').length;
      const completedSprints = sprints.filter(sprint => sprint.state === 'closed').length;

      // Get or calculate sprint metrics for all sprints
      const sprintMetricsPromises = sprints.map(sprint => 
        this.calculateSprintMetrics(sprint.id)
      );
      const sprintMetricsResults = await Promise.all(sprintMetricsPromises);
      const validSprintMetrics = sprintMetricsResults.filter(Boolean) as CalculatedSprintMetrics[];

      if (validSprintMetrics.length === 0) {
        return {
          boardId,
          averageVelocity: 0,
          averageChurnRate: 0,
          averageCompletionRate: 0,
          totalSprints,
          activeSprints,
          completedSprints,
          totalStoryPoints: 0,
          averageCycleTime: 0,
          averageLeadTime: 0,
          teamMembers: [],
          predictedVelocity: 0,
          velocityTrend: 'stable',
          churnRateTrend: 'stable',
          averageDefectLeakageRate: 0,
          averageQualityRate: 100,
          totalDefects: 0,
          calculatedAt: new Date(),
        };
      }

      // Calculate averages
      const averageVelocity = validSprintMetrics.reduce((sum, metrics) => 
        sum + metrics.velocity, 0) / validSprintMetrics.length;

      const averageChurnRate = validSprintMetrics.reduce((sum, metrics) => 
        sum + metrics.churnRate, 0) / validSprintMetrics.length;

      const averageCompletionRate = validSprintMetrics.reduce((sum, metrics) => 
        sum + metrics.completionRate, 0) / validSprintMetrics.length;

      const totalStoryPoints = validSprintMetrics.reduce((sum, metrics) => 
        sum + metrics.totalStoryPoints, 0);

      // Calculate average cycle and lead times
      const sprintsWithCycleTime = validSprintMetrics.filter(m => m.averageCycleTime);
      const averageCycleTime = sprintsWithCycleTime.length > 0 ? 
        sprintsWithCycleTime.reduce((sum, m) => sum + (m.averageCycleTime || 0), 0) / sprintsWithCycleTime.length : 
        undefined;

      const sprintsWithLeadTime = validSprintMetrics.filter(m => m.averageLeadTime);
      const averageLeadTime = sprintsWithLeadTime.length > 0 ? 
        sprintsWithLeadTime.reduce((sum, m) => sum + (m.averageLeadTime || 0), 0) / sprintsWithLeadTime.length : 
        undefined;

      // Get unique team members across all sprints
      const allTeamMembers = new Set<string>();
      validSprintMetrics.forEach(metrics => {
        metrics.teamMembers.forEach(member => allTeamMembers.add(member));
      });

      // Calculate quality metrics averages
      const averageDefectLeakageRate = validSprintMetrics.reduce((sum, metrics) => 
        sum + metrics.defectLeakageRate, 0) / validSprintMetrics.length;

      const averageQualityRate = validSprintMetrics.reduce((sum, metrics) => 
        sum + metrics.qualityRate, 0) / validSprintMetrics.length;

      const totalDefects = validSprintMetrics.reduce((sum, metrics) => 
        sum + metrics.totalDefects, 0);

      // Calculate velocity trend (compare last 3 sprints vs previous 3)
      let velocityTrend: 'up' | 'down' | 'stable' = 'stable';
      let churnRateTrend: 'up' | 'down' | 'stable' = 'stable';
      
      if (validSprintMetrics.length >= 6) {
        const recentSprints = validSprintMetrics.slice(-3);
        const previousSprints = validSprintMetrics.slice(-6, -3);
        
        // Velocity trend
        const recentAvgVelocity = recentSprints.reduce((sum, m) => sum + m.velocity, 0) / 3;
        const previousAvgVelocity = previousSprints.reduce((sum, m) => sum + m.velocity, 0) / 3;
        
        if (recentAvgVelocity > previousAvgVelocity * 1.1) {
          velocityTrend = 'up';
        } else if (recentAvgVelocity < previousAvgVelocity * 0.9) {
          velocityTrend = 'down';
        }

        // Churn rate trend (note: higher churn rate is worse, so trend is inverted)
        const recentAvgChurnRate = recentSprints.reduce((sum, m) => sum + m.churnRate, 0) / 3;
        const previousAvgChurnRate = previousSprints.reduce((sum, m) => sum + m.churnRate, 0) / 3;
        
        if (recentAvgChurnRate > previousAvgChurnRate * 1.1) {
          churnRateTrend = 'up'; // Higher churn rate = worse trend
        } else if (recentAvgChurnRate < previousAvgChurnRate * 0.9) {
          churnRateTrend = 'down'; // Lower churn rate = better trend
        }
      }

      // Predict velocity based on recent trends
      const predictedVelocity = validSprintMetrics.length >= 3 ? 
        validSprintMetrics.slice(-3).reduce((sum, m) => sum + m.velocity, 0) / 3 : 
        averageVelocity;

      return {
        boardId,
        averageVelocity,
        averageChurnRate,
        averageCompletionRate,
        totalSprints,
        activeSprints,
        completedSprints,
        totalStoryPoints,
        averageCycleTime,
        averageLeadTime,
        teamMembers: Array.from(allTeamMembers),
        predictedVelocity,
        velocityTrend,
        churnRateTrend,
        averageDefectLeakageRate,
        averageQualityRate,
        totalDefects,
        calculatedAt: new Date(),
      };

    } catch (error) {
      logger.error(`Error calculating board metrics for board ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Save sprint metrics to database
   */
  static async saveSprintMetrics(metrics: CalculatedSprintMetrics): Promise<SprintMetrics> {
    try {
      // Get sprint details for commentary generation
      const sprint = await Sprint.findByPk(metrics.sprintId);
      let commentary: string | undefined;

      if (sprint) {
        try {
          // Generate intelligent commentary based on sprint performance
          const commentaryData = this.commentaryService.generateSprintCommentary(sprint, {
            velocity: metrics.velocity,
            churnRate: metrics.churnRate,
            completionRate: metrics.completionRate,
            scopeChangePercent: metrics.scopeChangePercent,
            averageCycleTime: metrics.averageCycleTime,
            averageLeadTime: metrics.averageLeadTime,
            totalStoryPoints: metrics.totalStoryPoints,
            completedStoryPoints: metrics.completedStoryPoints,
            totalIssues: metrics.totalIssues,
            completedIssues: metrics.completedIssues,
            defectLeakageRate: metrics.defectLeakageRate,
            qualityRate: metrics.qualityRate,
            totalDefects: metrics.totalDefects,
            completedDefects: metrics.completedDefects,
          });
          commentary = commentaryData.commentary;
          logger.info(`Generated commentary for sprint ${metrics.sprintId}: ${commentary ? 'Yes' : 'No'}`);
        } catch (commentaryError) {
          logger.warn(`Failed to generate commentary for sprint ${metrics.sprintId}:`, commentaryError);
          // Don't fail the entire operation if commentary generation fails
        }
      }

      const [sprintMetrics] = await SprintMetrics.upsert({
        sprintId: metrics.sprintId,
        velocity: metrics.velocity,
        churnRate: metrics.churnRate,
        completionRate: metrics.completionRate,
        teamMembers: metrics.teamMembers,
        totalStoryPoints: metrics.totalStoryPoints,
        completedStoryPoints: metrics.completedStoryPoints,
        addedStoryPoints: metrics.addedStoryPoints,
        removedStoryPoints: metrics.removedStoryPoints,
        totalIssues: metrics.totalIssues,
        completedIssues: metrics.completedIssues,
        addedIssues: metrics.addedIssues,
        removedIssues: metrics.removedIssues,
        issueTypeBreakdown: metrics.issueTypeBreakdown,
        storyPointsBreakdown: metrics.storyPointsBreakdown,
        averageCycleTime: metrics.averageCycleTime,
        averageLeadTime: metrics.averageLeadTime,
        scopeChangePercent: metrics.scopeChangePercent,
        defectLeakageRate: metrics.defectLeakageRate,
        qualityRate: metrics.qualityRate,
        totalDefects: metrics.totalDefects,
        completedDefects: metrics.completedDefects,
        replanningRate: 0,  // TODO: Calculate actual replanning metrics
        replanningCount: 0,
        replanningFromCurrentSprint: 0,
        replanningToCurrentSprint: 0,
        commentary: commentary,
        calculatedAt: metrics.calculatedAt,
      });

      return sprintMetrics;
    } catch (error) {
      logger.error(`Error saving sprint metrics for sprint ${metrics.sprintId}:`, error);
      throw error;
    }
  }

  /**
   * Save board metrics to database
   */
  static async saveBoardMetrics(metrics: CalculatedBoardMetrics): Promise<BoardMetrics> {
    try {
      const [boardMetrics] = await BoardMetrics.upsert({
        boardId: metrics.boardId,
        averageVelocity: metrics.averageVelocity,
        averageChurnRate: metrics.averageChurnRate,
        averageCompletionRate: metrics.averageCompletionRate,
        totalSprints: metrics.totalSprints,
        activeSprints: metrics.activeSprints,
        completedSprints: metrics.completedSprints,
        totalStoryPoints: metrics.totalStoryPoints,
        averageCycleTime: metrics.averageCycleTime,
        averageLeadTime: metrics.averageLeadTime,
        teamMembers: metrics.teamMembers,
        predictedVelocity: metrics.predictedVelocity,
        velocityTrend: metrics.velocityTrend,
        churnRateTrend: metrics.churnRateTrend,
        averageDefectLeakageRate: metrics.averageDefectLeakageRate,
        averageQualityRate: metrics.averageQualityRate,
        totalDefects: metrics.totalDefects,
        calculatedAt: metrics.calculatedAt,
      });

      return boardMetrics;
    } catch (error) {
      logger.error(`Error saving board metrics for board ${metrics.boardId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate and save metrics for all sprints in a board
   */
  static async calculateAndSaveBoardMetrics(boardId: number): Promise<{
    boardMetrics: BoardMetrics;
    sprintMetrics: SprintMetrics[];
  }> {
    try {
      logger.info(`Starting metrics calculation for board ${boardId}`);

      // Get all sprints for the board
      const sprints = await Sprint.findAll({
        where: { boardId },
        raw: true,
      });

      // Calculate and save metrics for each sprint
      const sprintMetricsResults: SprintMetrics[] = [];
      for (const sprint of sprints) {
        const calculatedMetrics = await this.calculateSprintMetrics(sprint.id);
        if (calculatedMetrics) {
          const savedMetrics = await this.saveSprintMetrics(calculatedMetrics);
          sprintMetricsResults.push(savedMetrics);
        }
      }

      // Calculate and save board-level metrics
      const calculatedBoardMetrics = await this.calculateBoardMetrics(boardId);
      if (!calculatedBoardMetrics) {
        throw new Error(`Failed to calculate board metrics for board ${boardId}`);
      }

      const savedBoardMetrics = await this.saveBoardMetrics(calculatedBoardMetrics);

      logger.info(`Completed metrics calculation for board ${boardId}: ${sprintMetricsResults.length} sprints processed`);

      return {
        boardMetrics: savedBoardMetrics,
        sprintMetrics: sprintMetricsResults,
      };

    } catch (error) {
      logger.error(`Error in calculateAndSaveBoardMetrics for board ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate and save metrics for all boards
   */
  static async calculateAndSaveAllMetrics(): Promise<{
    processedBoards: number;
    totalSprints: number;
  }> {
    try {
      logger.info('Starting metrics calculation for all boards');

      const boards = await Board.findAll({
        attributes: ['id'],
        raw: true,
      });

      let totalSprints = 0;
      const processedBoards = boards.length;

      for (const board of boards) {
        try {
          const result = await this.calculateAndSaveBoardMetrics(board.id);
          totalSprints += result.sprintMetrics.length;
        } catch (error) {
          logger.error(`Failed to process board ${board.id}:`, error);
          // Continue with other boards
        }
      }

      logger.info(`Completed metrics calculation: ${processedBoards} boards, ${totalSprints} sprints processed`);

      return {
        processedBoards,
        totalSprints,
      };

    } catch (error) {
      logger.error('Error in calculateAndSaveAllMetrics:', error);
      throw error;
    }
  }
}
