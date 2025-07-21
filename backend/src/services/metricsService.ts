import { Sprint } from '../models/Sprint';
import { Issue } from '../models/Issue';
import { Board } from '../models/Board';
import { SprintMetrics } from '../models/SprintMetrics';
import { BoardMetrics } from '../models/BoardMetrics';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';
import { SprintCommentaryService } from './sprintCommentaryService';

export interface SprintMetricsData {
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
  averageCycleTime?: number;
  averageLeadTime?: number;
  scopeChangePercent: number;
  defectLeakageRate: number;
  qualityRate: number;
  totalDefects: number;
  completedDefects: number;
  commentary?: string;
}

export interface BoardMetricsData {
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
}

class MetricsService {
  private commentaryService: SprintCommentaryService;

  constructor() {
    this.commentaryService = new SprintCommentaryService();
  }
  async calculateSprintMetrics(sprintId: number): Promise<SprintMetricsData> {
    try {
      const sprint = await Sprint.findByPk(sprintId);
      if (!sprint) {
        throw new Error(`Sprint not found: ${sprintId}`);
      }

      const issues = await Issue.findAll({
        where: { sprintId },
      });

      const metrics = this.computeSprintMetrics(sprint, issues);

      // Generate intelligent commentary based on sprint performance
      try {
        const commentaryData = this.commentaryService.generateSprintCommentary(sprint, metrics);
        metrics.commentary = commentaryData.commentary;
      } catch (commentaryError) {
        logger.warn(`Failed to generate commentary for sprint ${sprintId}:`, commentaryError);
        // Don't fail the entire operation if commentary generation fails
      }

      // Save metrics to database
      await SprintMetrics.upsert({
        sprintId,
        ...metrics,
        calculatedAt: new Date(),
      });

      logger.info(`Calculated metrics for sprint ${sprint.name}`, {
        sprintId,
        velocity: metrics.velocity,
        completionRate: metrics.completionRate,
        churnRate: metrics.churnRate,
        hasCommentary: !!metrics.commentary,
      });

      return metrics;
    } catch (error) {
      logger.error(`Failed to calculate sprint metrics for sprint ${sprintId}:`, error);
      throw error;
    }
  }

  async calculateBoardMetrics(boardId: number): Promise<BoardMetricsData> {
    try {
      const board = await Board.findByPk(boardId);
      if (!board) {
        throw new Error(`Board not found: ${boardId}`);
      }

      const sprints = await Sprint.findAll({
        where: { boardId, isActive: true },
        include: [
          {
            model: SprintMetrics,
            as: 'metrics',
            required: false,
          },
        ],
      });

      const metrics = this.computeBoardMetrics(board, sprints);

      // Save metrics to database
      await BoardMetrics.upsert({
        boardId,
        ...metrics,
        calculatedAt: new Date(),
      });

      logger.info(`Calculated metrics for board ${board.name}`, {
        boardId,
        averageVelocity: metrics.averageVelocity,
        totalSprints: metrics.totalSprints,
        predictedVelocity: metrics.predictedVelocity,
      });

      return metrics;
    } catch (error) {
      logger.error(`Failed to calculate board metrics for board ${boardId}:`, error);
      throw error;
    }
  }

  private computeSprintMetrics(sprint: Sprint, issues: Issue[]): SprintMetricsData {
    const completedStatuses = ['Done', 'Closed', 'Resolved'];
    const completedIssues = issues.filter(issue => 
      completedStatuses.includes(issue.status)
    );

    const totalStoryPoints = issues.reduce((sum, issue) => 
      sum + (issue.storyPoints || 0), 0
    );

    const completedStoryPoints = completedIssues.reduce((sum, issue) => 
      sum + (issue.storyPoints || 0), 0
    );

    // Calculate velocity (completed story points)
    const velocity = completedStoryPoints;

    // Calculate completion rate
    const completionRate = totalStoryPoints > 0 ? 
      (completedStoryPoints / totalStoryPoints) * 100 : 0;

    // Get unique team members
    const teamMembers = Array.from(new Set(issues
      .filter(issue => issue.assigneeName)
      .map(issue => issue.assigneeName!)
    ));

    // Calculate issue type breakdown
    const issueTypeBreakdown: Record<string, number> = {};
    issues.forEach(issue => {
      const issueType = issue.issueType || 'Unknown';
      issueTypeBreakdown[issueType] = (issueTypeBreakdown[issueType] || 0) + 1;
    });

    // Calculate quality metrics (defect leakage rate and quality rate)
    const defectIssueTypes = ['Bug', 'Defect'];
    const defectIssues = issues.filter(issue => 
      defectIssueTypes.includes(issue.issueType)
    );
    const totalDefects = defectIssues.length;
    const completedDefects = defectIssues.filter(issue => 
      completedStatuses.includes(issue.status)
    ).length;

    // Defect Leakage Rate: Percentage of defects compared to total issues
    const defectLeakageRate = issues.length > 0 ? (totalDefects / issues.length) * 100 : 0;

    // Quality Rate: Percentage of non-defect issues (inverse of defect leakage rate)
    const qualityRate = issues.length > 0 ? ((issues.length - totalDefects) / issues.length) * 100 : 100;

    // Calculate churn rate based on incomplete work (scope not delivered)
    // This provides a practical measure of sprint instability/scope change
    const incompleteStoryPoints = totalStoryPoints - completedStoryPoints;
    const churnRate = totalStoryPoints > 0 ? 
      (incompleteStoryPoints / totalStoryPoints) * 100 : 0;
    
    const scopeChangePercent = churnRate;
    const addedStoryPoints = 0;
    const removedStoryPoints = 0;
    const addedIssues = 0;
    const removedIssues = 0;

    // Calculate cycle time (time from start to completion)
    const cycleTimes = completedIssues
      .filter(issue => issue.created && issue.resolved)
      .map(issue => {
        const start = new Date(issue.created).getTime();
        const end = new Date(issue.resolved!).getTime();
        return (end - start) / (1000 * 60 * 60 * 24); // days
      });

    const averageCycleTime = cycleTimes.length > 0 ? 
      cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length : undefined;

    // Lead time is similar to cycle time for now
    const averageLeadTime = averageCycleTime;

    return {
      velocity,
      churnRate,
      completionRate,
      teamMembers,
      totalStoryPoints,
      completedStoryPoints,
      addedStoryPoints,
      removedStoryPoints,
      totalIssues: issues.length,
      completedIssues: completedIssues.length,
      addedIssues,
      removedIssues,
      issueTypeBreakdown,
      averageCycleTime,
      averageLeadTime,
      scopeChangePercent,
      defectLeakageRate,
      qualityRate,
      totalDefects,
      completedDefects,
    };
  }

  private computeBoardMetrics(board: Board, sprints: any[]): BoardMetricsData {
    const sprintMetrics = sprints
      .filter(sprint => sprint.metrics)
      .map(sprint => sprint.metrics);

    const completedSprints = sprints.filter(sprint => sprint.state === 'closed');
    const activeSprints = sprints.filter(sprint => sprint.state === 'active');

    // Calculate averages
    const averageVelocity = sprintMetrics.length > 0 ? 
      sprintMetrics.reduce((sum, metrics) => sum + metrics.velocity, 0) / sprintMetrics.length : 0;

    const averageChurnRate = sprintMetrics.length > 0 ? 
      sprintMetrics.reduce((sum, metrics) => sum + metrics.churnRate, 0) / sprintMetrics.length : 0;

    const averageCompletionRate = sprintMetrics.length > 0 ? 
      sprintMetrics.reduce((sum, metrics) => sum + metrics.completionRate, 0) / sprintMetrics.length : 0;

    const totalStoryPoints = sprintMetrics.reduce((sum, metrics) => 
      sum + metrics.totalStoryPoints, 0
    );

    const averageCycleTime = sprintMetrics.length > 0 ? 
      sprintMetrics
        .filter(metrics => metrics.averageCycleTime)
        .reduce((sum, metrics) => sum + metrics.averageCycleTime, 0) / 
        sprintMetrics.filter(metrics => metrics.averageCycleTime).length : undefined;

    const averageLeadTime = averageCycleTime;

    // Calculate quality metrics averages
    const averageDefectLeakageRate = sprintMetrics.length > 0 ? 
      sprintMetrics.reduce((sum, metrics) => sum + metrics.defectLeakageRate, 0) / sprintMetrics.length : 0;

    const averageQualityRate = sprintMetrics.length > 0 ? 
      sprintMetrics.reduce((sum, metrics) => sum + metrics.qualityRate, 0) / sprintMetrics.length : 100;

    const totalDefects = sprintMetrics.reduce((sum, metrics) => 
      sum + metrics.totalDefects, 0
    );

    // Get unique team members across all sprints
    const teamMembers = Array.from(new Set(sprintMetrics.flatMap(metrics => metrics.teamMembers)));

    // Calculate velocity trend
    const velocityTrend = this.calculateVelocityTrend(sprintMetrics);

    // Calculate churn rate trend
    const churnRateTrend = this.calculateChurnRateTrend(sprintMetrics);

    // Predict velocity based on recent sprints
    const predictedVelocity = this.predictVelocity(sprintMetrics);

    return {
      averageVelocity,
      averageChurnRate,
      averageCompletionRate,
      totalSprints: sprints.length,
      activeSprints: activeSprints.length,
      completedSprints: completedSprints.length,
      totalStoryPoints,
      averageCycleTime,
      averageLeadTime,
      teamMembers,
      predictedVelocity,
      velocityTrend,
      churnRateTrend,
      averageDefectLeakageRate,
      averageQualityRate,
      totalDefects,
    };
  }

  private calculateVelocityTrend(metrics: any[]): 'up' | 'down' | 'stable' {
    if (metrics.length < 2) return 'stable';

    const recentMetrics = metrics.slice(-3); // Last 3 sprints
    const velocities = recentMetrics.map(m => m.velocity);
    
    if (velocities.length < 2) return 'stable';

    const firstHalf = velocities.slice(0, Math.floor(velocities.length / 2));
    const secondHalf = velocities.slice(Math.floor(velocities.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }

  private calculateChurnRateTrend(metrics: any[]): 'up' | 'down' | 'stable' {
    if (metrics.length < 6) return 'stable'; // Need at least 6 sprints for comparison

    const recentMetrics = metrics.slice(-3); // Last 3 sprints
    const previousMetrics = metrics.slice(-6, -3); // Previous 3 sprints

    const recentChurnRates = recentMetrics.map(m => m.churnRate);
    const previousChurnRates = previousMetrics.map(m => m.churnRate);

    if (recentChurnRates.length === 0 || previousChurnRates.length === 0) return 'stable';

    const recentAvg = recentChurnRates.reduce((sum, rate) => sum + rate, 0) / recentChurnRates.length;
    const previousAvg = previousChurnRates.reduce((sum, rate) => sum + rate, 0) / previousChurnRates.length;

    // Calculate percentage change
    const change = previousAvg === 0 ? 0 : (recentAvg - previousAvg) / previousAvg;

    // For churn rate, increase is bad (up), decrease is good (down)
    if (Math.abs(change) > 0.1) {
      return change > 0 ? 'up' : 'down';
    }
    return 'stable';
  }

  private predictVelocity(metrics: any[]): number {
    if (metrics.length === 0) return 0;

    // Simple prediction based on recent average
    const recentMetrics = metrics.slice(-3); // Last 3 sprints
    const recentVelocities = recentMetrics.map(m => m.velocity);
    
    return recentVelocities.reduce((sum, v) => sum + v, 0) / recentVelocities.length;
  }

  async getSprintMetrics(sprintId: number): Promise<SprintMetricsData | null> {
    try {
      const metrics = await SprintMetrics.findOne({
        where: { sprintId },
      });

      if (!metrics) {
        return null;
      }

      return {
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
        issueTypeBreakdown: metrics.issueTypeBreakdown || {},
        averageCycleTime: metrics.averageCycleTime,
        averageLeadTime: metrics.averageLeadTime,
        scopeChangePercent: metrics.scopeChangePercent,
        defectLeakageRate: metrics.defectLeakageRate,
        qualityRate: metrics.qualityRate,
        totalDefects: metrics.totalDefects,
        completedDefects: metrics.completedDefects,
      };
    } catch (error) {
      logger.error(`Failed to get sprint metrics for sprint ${sprintId}:`, error);
      return null;
    }
  }

  async getBoardMetrics(boardId: number): Promise<BoardMetricsData | null> {
    try {
      const metrics = await BoardMetrics.findOne({
        where: { boardId },
      });

      if (!metrics) {
        return null;
      }

      return {
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
      };
    } catch (error) {
      logger.error(`Failed to get board metrics for board ${boardId}:`, error);
      return null;
    }
  }
}

export const metricsService = new MetricsService();
export default metricsService;
