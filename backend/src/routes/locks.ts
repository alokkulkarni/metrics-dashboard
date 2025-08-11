import { Router, Request, Response } from 'express';
import { DistributedLock } from '../models/DistributedLock';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get current lock status
 * GET /api/locks/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { lockName } = req.query;
    
    if (lockName && typeof lockName === 'string') {
      // Check specific lock
      const lockStatus = await DistributedLock.isLockHeld(lockName);
      
      res.json({
        success: true,
        data: {
          lockName,
          held: lockStatus.held,
          podId: lockStatus.podId,
          expiresAt: lockStatus.expiresAt,
        }
      });
    } else {
      // Get all active locks
      const activeLocks = await DistributedLock.findAll({
        where: { isActive: true },
        order: [['acquiredAt', 'DESC']],
        limit: 20,
      });

      res.json({
        success: true,
        data: {
          activeLocks: activeLocks.map(lock => ({
            lockName: lock.lockName,
            podId: lock.podId,
            acquiredAt: lock.acquiredAt,
            expiresAt: lock.expiresAt,
            renewedAt: lock.renewedAt,
          }))
        }
      });
    }
  } catch (error) {
    logger.error('Failed to get lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get lock status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get lock history
 * GET /api/locks/history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { lockName, limit = 50 } = req.query;
    
    const lockHistory = await DistributedLock.getLockHistory(
      typeof lockName === 'string' ? lockName : undefined,
      typeof limit === 'string' ? parseInt(limit) : 50
    );

    res.json({
      success: true,
      data: {
        history: lockHistory.map(lock => ({
          lockName: lock.lockName,
          podId: lock.podId,
          acquiredAt: lock.acquiredAt,
          expiresAt: lock.expiresAt,
          renewedAt: lock.renewedAt,
          isActive: lock.isActive,
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to get lock history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get lock history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cleanup expired locks manually
 * POST /api/locks/cleanup
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const cleanedCount = await DistributedLock.cleanupExpiredLocks();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired locks`,
      data: {
        cleanedCount
      }
    });
  } catch (error) {
    logger.error('Failed to cleanup expired locks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired locks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
