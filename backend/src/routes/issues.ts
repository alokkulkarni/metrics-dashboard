import { Router } from 'express';
import { Request, Response } from 'express';
import { Issue } from '../models/Issue';
import { Sprint } from '../models/Sprint';
import { Board } from '../models/Board';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/issues - Get all issues
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, assignee, sprint, board } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};
    
    if (status) where.status = status;
    if (assignee) where.assigneeName = assignee;
    if (sprint) where.sprintId = sprint;
    if (board) where.boardId = board;

    const issues = await Issue.findAndCountAll({
      where,
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: false,
        },
        {
          model: Board,
          as: 'board',
          required: true,
        },
      ],
      order: [['updated', 'DESC']],
      limit: parseInt(limit as string),
      offset,
    });

    res.json({
      success: true,
      data: {
        issues: issues.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: issues.count,
          pages: Math.ceil(issues.count / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues',
    });
  }
});

// GET /api/issues/:id - Get issue by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const issue = await Issue.findByPk(id, {
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: false,
        },
        {
          model: Board,
          as: 'board',
          required: true,
        },
      ],
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found',
      });
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    logger.error('Failed to fetch issue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue',
    });
  }
});

// GET /api/issues/key/:key - Get issue by JIRA key
router.get('/key/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const issue = await Issue.findOne({
      where: { key },
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: false,
        },
        {
          model: Board,
          as: 'board',
          required: true,
        },
      ],
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found',
      });
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    logger.error('Failed to fetch issue by key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue',
    });
  }
});

// GET /api/issues/sprint/:sprintId - Get issues for a sprint
router.get('/sprint/:sprintId', async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    
    const issues = await Issue.findAll({
      where: { sprintId },
      include: [
        {
          model: Sprint,
          as: 'sprint',
          required: true,
        },
        {
          model: Board,
          as: 'board',
          required: true,
        },
      ],
      order: [['priority', 'ASC'], ['created', 'ASC']],
    });

    res.json({
      success: true,
      data: issues,
    });
  } catch (error) {
    logger.error('Failed to fetch issues for sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues',
    });
  }
});

export default router;
