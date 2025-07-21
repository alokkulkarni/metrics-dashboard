import { Router } from 'express';
import { Request, Response } from 'express';
import { Board } from '../models/Board';
import { Project } from '../models/Project';
import { Sprint } from '../models/Sprint';
import { BoardMetrics } from '../models/BoardMetrics';
import { SprintMetrics } from '../models/SprintMetrics';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/boards/stats - Get board statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalBoards = await Board.count();
    const allBoards = await Board.findAll({
      attributes: ['type'],
      raw: true,
    });

    const byType = allBoards.reduce((acc: any, board: any) => {
      acc[board.type] = (acc[board.type] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      total: totalBoards,
      byType,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch board stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board stats',
    });
  }
});

// GET /api/boards - Get all boards
router.get('/', async (req: Request, res: Response) => {
  try {
    const boards = await Board.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          required: true,
        },
        {
          model: Sprint,
          as: 'sprints',
          required: false,
        },
        {
          model: BoardMetrics,
          as: 'metrics',
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    // Transform data to calculate isActive status based on sprint data
    const boardsWithStatus = boards.map((board: any) => {
      const sprints = board.sprints || [];
      const activeSprints = sprints.filter((sprint: any) => sprint.state === 'active').length;
      
      return {
        ...board.toJSON(),
        isActive: activeSprints > 0,
        activeSprintCount: activeSprints,
        totalSprintCount: sprints.length,
      };
    });

    res.json({
      success: true,
      data: boardsWithStatus,
    });
  } catch (error) {
    logger.error('Failed to fetch boards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boards',
    });
  }
});

// GET /api/boards/:id - Get board by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const board = await Board.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          required: true,
        },
        {
          model: Sprint,
          as: 'sprints',
          required: false,
        },
        {
          model: BoardMetrics,
          as: 'metrics',
          required: false,
        },
      ],
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        error: 'Board not found',
      });
    }

    res.json({
      success: true,
      data: board,
    });
  } catch (error) {
    logger.error('Failed to fetch board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board',
    });
  }
});

// GET /api/boards/project/:projectId - Get boards for a project
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const boards = await Board.findAll({
      where: { projectId },
      include: [
        {
          model: Project,
          as: 'project',
          required: true,
        },
        {
          model: Sprint,
          as: 'sprints',
          required: false,
        },
        {
          model: BoardMetrics,
          as: 'metrics',
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: boards,
    });
  } catch (error) {
    logger.error('Failed to fetch boards for project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boards',
    });
  }
});

// GET /api/boards/:id/details - Get detailed board information with metrics and sprints
router.get('/:id/details', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.id);
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID',
      });
    }

    // Get board with project information
    const board = await Board.findByPk(boardId, {
      include: [
        {
          model: Project,
          as: 'project',
          required: true,
        },
      ],
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        error: 'Board not found',
      });
    }

    // Get board metrics
    const boardMetrics = await BoardMetrics.findOne({
      where: { boardId },
    });

    // Get all sprints for this board
    const sprints = await Sprint.findAll({
      where: { boardId },
      order: [['startDate', 'DESC']],
    });

    // Get sprint metrics for all sprints in this board
    const sprintMetrics = await SprintMetrics.findAll({
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: true,
          where: { boardId },
        },
      ],
      order: [['calculatedAt', 'DESC']],
    });

    // Categorize sprints
    const activeSprints = sprints.filter(sprint => sprint.state === 'active');
    const completedSprints = sprints.filter(sprint => sprint.state === 'closed');
    const futureSprints = sprints.filter(sprint => sprint.state === 'future');

    // Check which sprints have metrics
    const sprintsWithMetrics = sprintMetrics.map(sm => sm.sprintId);
    const sprintsWithoutMetrics = sprints.filter(sprint => 
      !sprintsWithMetrics.includes(sprint.id)
    );

    // Calculate dynamic board status based on active sprints
    const boardWithCalculatedStatus = {
      ...board.toJSON(),
      isActive: activeSprints.length > 0,
      activeSprintCount: activeSprints.length,
      totalSprintCount: sprints.length
    };

    res.json({
      success: true,
      data: {
        board: boardWithCalculatedStatus,
        boardMetrics,
        sprints: {
          all: sprints,
          active: activeSprints,
          completed: completedSprints,
          future: futureSprints,
          withMetrics: sprintMetrics,
          withoutMetrics: sprintsWithoutMetrics,
        },
        summary: {
          totalSprints: sprints.length,
          activeSprints: activeSprints.length,
          completedSprints: completedSprints.length,
          futureSprints: futureSprints.length,
          sprintsWithMetrics: sprintMetrics.length,
          sprintsWithoutMetrics: sprintsWithoutMetrics.length,
          hasMetrics: !!boardMetrics,
        },
      },
    });
  } catch (error) {
    logger.error(`Failed to fetch board details for board ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board details',
    });
  }
});

export default router;
