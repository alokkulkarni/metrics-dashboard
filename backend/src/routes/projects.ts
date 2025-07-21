import { Router } from 'express';
import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { Board } from '../models/Board';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/projects - Get all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await Project.findAll({
      include: [
        {
          model: Board,
          as: 'boards',
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    logger.error('Failed to fetch projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id, {
      include: [
        {
          model: Board,
          as: 'boards',
          required: false,
        },
      ],
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Failed to fetch project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

// GET /api/projects/key/:key - Get project by JIRA key
router.get('/key/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const project = await Project.findOne({
      where: { jiraProjectKey: key },
      include: [
        {
          model: Board,
          as: 'boards',
          required: false,
        },
      ],
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Failed to fetch project by key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

export default router;
