import { Router } from 'express';
import { Request, Response } from 'express';
import { syncService } from '../services/syncService';
import { SyncOperation } from '../models/SyncOperation';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/sync - Sync all data
router.post('/', async (req: Request, res: Response) => {
  try {
    const { forceSync = false, projectKeys, boardIds, sprintIds, bypassThrottle = false } = req.body;
    
    const result = await syncService.syncAll({
      forceSync,
      projectKeys,
      boardIds,
      sprintIds,
      bypassThrottle,
    });

    // If throttled, return 429 status
    if (result.throttled) {
      return res.status(429).json({
        success: false,
        error: 'Sync throttled',
        message: result.throttleMessage,
        nextAllowedSync: result.nextAllowedSync,
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to sync data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync data',
    });
  }
});

// POST /api/sync/project/:projectKey - Sync specific project
router.post('/project/:projectKey', async (req: Request, res: Response) => {
  try {
    const { projectKey } = req.params;
    const { bypassThrottle = false } = req.body;
    
    const result = await syncService.syncProject(projectKey, { bypassThrottle });

    // If throttled, return 429 status
    if (result.throttled) {
      return res.status(429).json({
        success: false,
        error: 'Sync throttled',
        message: result.throttleMessage,
        nextAllowedSync: result.nextAllowedSync,
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to sync project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync project',
    });
  }
});

// POST /api/sync/board/:boardId - Sync specific board
router.post('/board/:boardId', async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    const { bypassThrottle = false } = req.body;
    
    const result = await syncService.syncBoard(parseInt(boardId), { bypassThrottle });

    // If throttled, return 429 status
    if (result.throttled) {
      return res.status(429).json({
        success: false,
        error: 'Sync throttled',
        message: result.throttleMessage,
        nextAllowedSync: result.nextAllowedSync,
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to sync board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync board',
    });
  }
});

// POST /api/sync/sprint/:sprintId - Sync specific sprint
router.post('/sprint/:sprintId', async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const { bypassThrottle = false } = req.body;
    
    const result = await syncService.syncSprint(parseInt(sprintId), { bypassThrottle });

    // If throttled, return 429 status
    if (result.throttled) {
      return res.status(429).json({
        success: false,
        error: 'Sync throttled',
        message: result.throttleMessage,
        nextAllowedSync: result.nextAllowedSync,
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to sync sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync sprint',
    });
  }
});

// GET /api/sync/status - Get sync status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { syncType = 'full' } = req.query;
    
    const lastSync = await SyncOperation.getLastSuccessfulSync(syncType as string);
    const canSyncCheck = await SyncOperation.canPerformSync(syncType as string);
    
    res.json({
      success: true,
      data: {
        syncType,
        lastSync: lastSync ? {
          id: lastSync.id,
          syncType: lastSync.syncType,
          startTime: lastSync.startTime,
          endTime: lastSync.endTime,
          status: lastSync.status,
          results: lastSync.results,
        } : null,
        canSync: canSyncCheck.canSync,
        timeRemaining: canSyncCheck.timeRemaining,
        nextAllowedSync: canSyncCheck.lastSync?.endTime 
          ? new Date(canSyncCheck.lastSync.endTime.getTime() + (30 * 60 * 1000))
          : null,
      },
    });
  } catch (error) {
    logger.error('Failed to get sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
    });
  }
});

// GET /api/sync/history - Get sync history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { syncType, limit = 10 } = req.query;
    
    const history = await SyncOperation.getHistory(
      syncType as string, 
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data: history.map(sync => ({
        id: sync.id,
        syncType: sync.syncType,
        startTime: sync.startTime,
        endTime: sync.endTime,
        status: sync.status,
        results: sync.results,
        error: sync.error,
      })),
    });
  } catch (error) {
    logger.error('Failed to get sync history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync history',
    });
  }
});

export default router;
