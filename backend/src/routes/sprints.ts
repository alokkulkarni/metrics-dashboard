import { Router } from 'express';
import { Request, Response } from 'express';
import { Sprint } from '../models/Sprint';
import { Board } from '../models/Board';
import { Issue } from '../models/Issue';
import { SprintMetrics } from '../models/SprintMetrics';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/sprints/stats - Get sprint statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalSprints = await Sprint.count();
    const allSprints = await Sprint.findAll({
      attributes: ['state'],
      raw: true,
    });

    const byState = allSprints.reduce((acc: any, sprint: any) => {
      acc[sprint.state] = (acc[sprint.state] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      total: totalSprints,
      byState,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch sprint stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint stats',
    });
  }
});

// GET /api/sprints - Get all sprints
router.get('/', async (req: Request, res: Response) => {
  try {
    const sprints = await Sprint.findAll({
      include: [
        {
          model: Board,
          as: 'board',
          required: true,
        },
        {
          model: Issue,
          as: 'issues',
          required: false,
        },
        {
          model: SprintMetrics,
          as: 'metrics',
          required: false,
        },
      ],
      order: [['startDate', 'DESC']],
    });

    res.json({
      success: true,
      data: sprints,
    });
  } catch (error) {
    logger.error('Failed to fetch sprints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprints',
    });
  }
});

// GET /api/sprints/:id - Get sprint by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sprint = await Sprint.findByPk(id, {
      include: [
        {
          model: Board,
          as: 'board',
          required: true,
        },
        {
          model: Issue,
          as: 'issues',
          required: false,
        },
        {
          model: SprintMetrics,
          as: 'metrics',
          required: false,
        },
      ],
    });

    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: 'Sprint not found',
      });
    }

    res.json({
      success: true,
      data: sprint,
    });
  } catch (error) {
    logger.error('Failed to fetch sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint',
    });
  }
});

// GET /api/sprints/board/:boardId - Get sprints for a board
router.get('/board/:boardId', async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    
    const sprints = await Sprint.findAll({
      where: { boardId },
      include: [
        {
          model: Board,
          as: 'board',
          required: true,
        },
        {
          model: Issue,
          as: 'issues',
          required: false,
        },
        {
          model: SprintMetrics,
          as: 'metrics',
          required: false,
        },
      ],
      order: [['startDate', 'DESC']],
    });

    res.json({
      success: true,
      data: sprints,
    });
  } catch (error) {
    logger.error('Failed to fetch sprints for board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprints',
    });
  }
});

// GET /api/sprints/active - Get active sprints
router.get('/active', async (req: Request, res: Response) => {
  try {
    const sprints = await Sprint.findAll({
      where: { state: 'active' },
      include: [
        {
          model: Board,
          as: 'board',
          required: true,
        },
        {
          model: Issue,
          as: 'issues',
          required: false,
        },
        {
          model: SprintMetrics,
          as: 'metrics',
          required: false,
        },
      ],
      order: [['startDate', 'DESC']],
    });

    res.json({
      success: true,
      data: sprints,
    });
  } catch (error) {
    logger.error('Failed to fetch active sprints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active sprints',
    });
  }
});

// GET /api/sprints/stats - Get sprint statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalSprints = await Sprint.count();
    const allSprints = await Sprint.findAll({
      attributes: ['state'],
      raw: true,
    });

    const byState = allSprints.reduce((acc: any, sprint: any) => {
      acc[sprint.state] = (acc[sprint.state] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      total: totalSprints,
      byState,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch sprint stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint stats',
    });
  }
});

export default router;
