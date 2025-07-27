import { Router, Request, Response } from 'express';
import { KanbanMetricsDisplayService } from '../services/KanbanMetricsDisplayService';
import { KanbanMetricsCalculationService } from '../services/KanbanMetricsCalculationService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 📊 GET /api/kanban-metrics - Get metrics for all Kanban boards
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('📊 API: Getting metrics for all Kanban boards');

    const allMetrics = await KanbanMetricsDisplayService.getAllKanbanBoardMetrics();
    
    res.json({
      success: true,
      data: allMetrics,
      count: allMetrics.length,
      message: `Retrieved metrics for ${allMetrics.length} Kanban boards`
    });
  } catch (error) {
    logger.error(`❌ API Error getting all Kanban metrics: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Kanban metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📈 GET /api/kanban-metrics/summary - Get summary statistics for all Kanban boards
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    logger.info('📈 API: Getting Kanban metrics summary');

    const summary = await KanbanMetricsDisplayService.getKanbanMetricsSummary();
    
    // Return empty summary instead of 404 when no Kanban metrics exist
    if (!summary) {
      return res.json({
        success: true,
        data: {
          totalBoards: 0,
          sprintAlignedBoards: 0,
          totalIssues: 0,
          averageCycleTime: null,
          averageLeadTime: null,
          totalWipViolations: 0,
          averageFlowEfficiency: null,
          totalSprintThroughput: 0
        },
        message: 'No Kanban metrics available - empty summary returned'
      });
    }

    res.json({
      success: true,
      data: summary,
      message: 'Kanban metrics summary retrieved successfully'
    });
  } catch (error) {
    logger.error(`❌ API Error getting Kanban metrics summary: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Kanban metrics summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🎯 GET /api/kanban-metrics/board/:boardId - Get metrics for a specific Kanban board
 */
router.get('/board/:boardId', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.boardId);
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    logger.info(`🎯 API: Getting metrics for Kanban board ${boardId}`);

    const metrics = await KanbanMetricsDisplayService.getKanbanBoardMetrics(boardId);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for Kanban board ${boardId}`
      });
    }

    res.json({
      success: true,
      data: metrics,
      message: `Metrics retrieved for Kanban board ${boardId}`
    });
  } catch (error) {
    logger.error(`❌ API Error getting Kanban board metrics: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Kanban board metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📜 GET /api/kanban-metrics/board/:boardId/history - Get metrics history for a specific Kanban board
 */
router.get('/board/:boardId/history', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.boardId);
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }

    logger.info(`📜 API: Getting metrics history for Kanban board ${boardId} (limit: ${limit})`);

    const history = await KanbanMetricsDisplayService.getMetricsHistory(boardId, limit);
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      message: `Retrieved ${history.length} metrics history entries for Kanban board ${boardId}`
    });
  } catch (error) {
    logger.error(`❌ API Error getting Kanban board metrics history: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Kanban board metrics history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔄 POST /api/kanban-metrics/board/:boardId/calculate - Calculate metrics for a specific Kanban board
 */
router.post('/board/:boardId/calculate', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.boardId);
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    logger.info(`🔄 API: Calculating metrics for Kanban board ${boardId}`);

    const metrics = await KanbanMetricsCalculationService.calculateMetricsForBoard(boardId);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `Kanban board ${boardId} not found or has no issues`
      });
    }

    // Get the formatted display data
    const displayMetrics = await KanbanMetricsDisplayService.getKanbanBoardMetrics(boardId);

    res.json({
      success: true,
      data: displayMetrics,
      message: `Metrics calculated successfully for Kanban board ${boardId}`
    });
  } catch (error) {
    logger.error(`❌ API Error calculating Kanban board metrics: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate Kanban board metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔄 POST /api/kanban-metrics/calculate-all - Calculate metrics for all Kanban boards
 */
router.post('/calculate-all', async (req: Request, res: Response) => {
  try {
    logger.info('🔄 API: Calculating metrics for all Kanban boards');

    const results = await KanbanMetricsCalculationService.calculateMetricsForAllBoards();
    
    res.json({
      success: true,
      data: {
        calculatedBoards: results.calculatedBoards,
        skippedBoards: results.skippedBoards,
        totalProcessed: results.calculatedBoards.length + results.skippedBoards.length
      },
      message: `Metrics calculation completed. Processed ${results.calculatedBoards.length} boards, skipped ${results.skippedBoards.length} boards`
    });
  } catch (error) {
    logger.error(`❌ API Error calculating all Kanban board metrics: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate metrics for all Kanban boards',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🖨️ GET /api/kanban-metrics/board/:boardId/display - Get formatted display of metrics for console/log
 */
router.get('/board/:boardId/display', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.boardId);
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board ID'
      });
    }

    logger.info(`🖨️ API: Getting formatted display for Kanban board ${boardId}`);

    const metrics = await KanbanMetricsDisplayService.getKanbanBoardMetrics(boardId);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for Kanban board ${boardId}`
      });
    }

    const formattedDisplay = KanbanMetricsDisplayService.formatMetricsForDisplay(metrics);

    res.json({
      success: true,
      data: {
        boardId: boardId,
        formattedMetrics: formattedDisplay,
        rawMetrics: metrics
      },
      message: `Formatted metrics display retrieved for Kanban board ${boardId}`
    });
  } catch (error) {
    logger.error(`❌ API Error getting formatted Kanban board metrics: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve formatted Kanban board metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
