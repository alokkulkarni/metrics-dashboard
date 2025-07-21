import { Router } from 'express';
import { Request, Response } from 'express';
import { SprintMetrics } from '../models/SprintMetrics';
import { BoardMetrics } from '../models/BoardMetrics';
import { Sprint } from '../models/Sprint';
import { Board } from '../models/Board';
import { Project } from '../models/Project';
import { logger } from '../utils/logger';
import { MetricsCalculationService } from '../services/MetricsCalculationService';

const router = Router();

// GET /api/metrics/sprints - Get all sprint metrics
router.get('/sprints', async (req: Request, res: Response) => {
  try {
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
      order: [['updatedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: sprintMetrics,
    });
  } catch (error) {
    logger.error('Failed to fetch sprint metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint metrics',
    });
  }
});

// GET /api/metrics/boards - Get all board metrics
router.get('/boards', async (req: Request, res: Response) => {
  try {
    const boardMetrics = await BoardMetrics.findAll({
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
      order: [['updatedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: boardMetrics,
    });
  } catch (error) {
    logger.error('Failed to fetch board metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board metrics',
    });
  }
});

// GET /api/metrics/boards/summary - Get summary of all boards with metrics
router.get('/boards/summary', async (req: Request, res: Response) => {
  try {
    const boards = await Board.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          required: true,
        },
        {
          model: BoardMetrics,
          as: 'metrics',
          required: false,
        },
        {
          model: Sprint,
          as: 'sprints',
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    // Transform data to include counts and summary info
    const summary = boards.map((board: any) => {
      const sprints = board.sprints || [];
      const activeSprints = sprints.filter((sprint: any) => sprint.state === 'active');
      const completedSprints = sprints.filter((sprint: any) => sprint.state === 'closed');
      
      // Sort active sprints by start date (most recent first), then by end date
      const sortedActiveSprints = activeSprints.sort((a: any, b: any) => {
        const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
        
        if (aStart !== bStart) {
          return bStart - aStart; // Most recent start date first
        }
        
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
        return aEnd - bEnd; // Earliest end date first
      });
      
      return {
        board: {
          id: board.id,
          name: board.name,
          type: board.type,
          projectKey: board.project?.jiraProjectKey,
          projectName: board.project?.name,
        },
        activeSprints: sortedActiveSprints.map((sprint: any) => ({
          id: sprint.id,
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          state: sprint.state,
        })),
        metrics: board.metrics ? {
          averageVelocity: board.metrics.averageVelocity,
          averageCompletionRate: board.metrics.averageCompletionRate,
          averageChurnRate: board.metrics.averageChurnRate,
          totalStoryPoints: board.metrics.totalStoryPoints,
          averageCycleTime: board.metrics.averageCycleTime,
          averageLeadTime: board.metrics.averageLeadTime,
          velocityTrend: board.metrics.velocityTrend,
          churnRateTrend: board.metrics.churnRateTrend,
          predictedVelocity: board.metrics.predictedVelocity,
          // Debug: Let's see what we actually have
          ...(board.id === 53 ? { 
            debug_averageCycleTime: board.metrics.averageCycleTime,
            debug_averageLeadTime: board.metrics.averageLeadTime,
            debug_all_metrics: Object.keys(board.metrics.dataValues || board.metrics)
          } : {})
        } : null,
        counts: {
          totalSprints: sprints.length,
          activeSprints: sortedActiveSprints.length,
          completedSprints: completedSprints.length,
          totalIssues: 0, // TODO: Add issue count when Issue model is available
        },
      };
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Failed to fetch boards summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boards summary',
    });
  }
});

// GET /api/metrics/sprint/:sprintId - Get metrics for a specific sprint
router.get('/sprint/:sprintId', async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    
    const sprintMetrics = await SprintMetrics.findOne({
      where: { sprintId },
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
            },
          ],
        },
      ],
    });

    if (!sprintMetrics) {
      return res.status(404).json({
        success: false,
        error: 'Sprint metrics not found',
      });
    }

    res.json({
      success: true,
      data: sprintMetrics,
    });
  } catch (error) {
    logger.error('Failed to fetch sprint metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint metrics',
    });
  }
});

// GET /api/metrics/board/:boardId - Get metrics for a specific board
router.get('/board/:boardId', async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    
    const boardMetrics = await BoardMetrics.findOne({
      where: { boardId },
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
    });

    if (!boardMetrics) {
      return res.status(404).json({
        success: false,
        error: 'Board metrics not found',
      });
    }

    res.json({
      success: true,
      data: boardMetrics,
    });
  } catch (error) {
    logger.error('Failed to fetch board metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board metrics',
    });
  }
});

// GET /api/metrics/project/:projectId - Get all metrics for a project
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // Get board metrics for the project
    const boardMetrics = await BoardMetrics.findAll({
      include: [
        {
          model: Board,
          as: 'board',
          required: true,
          where: { projectId },
          include: [
            {
              model: Project,
              as: 'project',
              required: true,
            },
          ],
        },
      ],
    });

    // Get sprint metrics for the project
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
              where: { projectId },
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        boardMetrics,
        sprintMetrics,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch project metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project metrics',
    });
  }
});

// POST /api/metrics/calculate - Calculate metrics for all boards and sprints
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    logger.info('Starting metrics calculation for all boards');
    
    const result = await MetricsCalculationService.calculateAndSaveAllMetrics();
    
    res.json({
      success: true,
      message: 'Metrics calculation completed successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Failed to calculate metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate metrics',
    });
  }
});

// POST /api/metrics/calculate/board/:boardId - Calculate metrics for a specific board
router.post('/calculate/board/:boardId', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.boardId);
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID',
      });
    }

    logger.info(`Starting metrics calculation for board ${boardId}`);
    
    const result = await MetricsCalculationService.calculateAndSaveBoardMetrics(boardId);
    
    res.json({
      success: true,
      message: `Metrics calculation completed for board ${boardId}`,
      data: result,
    });
  } catch (error) {
    logger.error(`Failed to calculate metrics for board ${req.params.boardId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate board metrics',
    });
  }
});

// GET /api/metrics/board/:boardId - Get board metrics and sprint metrics for a specific board
router.get('/board/:boardId', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.boardId);
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID',
      });
    }

    // Get board metrics
    const boardMetrics = await BoardMetrics.findOne({
      where: { boardId },
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
    });

    // Get sprint metrics for this board
    const sprintMetrics = await SprintMetrics.findAll({
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: true,
          where: { boardId },
          include: [
            {
              model: Board,
              as: 'board',
              required: true,
            },
          ],
        },
      ],
      order: [['calculatedAt', 'DESC']],
    });

    // Get sprints without metrics (no metrics calculated yet)
    const sprintsWithoutMetrics = await Sprint.findAll({
      where: { boardId },
      include: [
        {
          model: SprintMetrics,
          as: 'metrics',
          required: false,
        },
      ],
    });

    const sprintsWithoutMetricsFiltered = sprintsWithoutMetrics.filter(
      sprint => !sprint.metrics || sprint.metrics.length === 0
    );

    res.json({
      success: true,
      data: {
        boardMetrics,
        sprintMetrics,
        sprintsWithoutMetrics: sprintsWithoutMetricsFiltered,
        hasMetrics: !!boardMetrics,
        totalSprints: sprintsWithoutMetrics.length,
        sprintsWithMetrics: sprintMetrics.length,
      },
    });
  } catch (error) {
    logger.error(`Failed to fetch board metrics for board ${req.params.boardId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board metrics',
    });
  }
});

export default router;
