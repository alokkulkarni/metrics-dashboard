import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { IssueChangelogService } from '../services/IssueChangelogService';
import { MetricsCalculationService } from '../services/MetricsCalculationService';
import { ChurnDiagnosticService } from '../scripts/diagnose-churn-metrics';
import { DistributedLock } from '../models/DistributedLock';

const router = Router();

/**
 * Sync all issue changelogs from Jira
 * POST /api/changelog/sync
 */
router.post('/sync', async (req: Request, res: Response) => {
  const lockName = 'changelog-sync';
  let lockInfo: { acquired: boolean; lock?: DistributedLock; existingLockPodId?: string } | null = null;

  try {
    logger.info('🔒 Attempting to acquire distributed lock for changelog sync...');
    
    // Try to acquire distributed lock
    lockInfo = await DistributedLock.acquireLock(lockName, 30); // 30 minute lock duration

    if (!lockInfo.acquired) {
      const message = `Changelog sync is already running on pod ${lockInfo.existingLockPodId}. Please wait for it to complete.`;
      logger.warn(message);
      return res.status(409).json({
        success: false,
        message,
        error: 'SYNC_IN_PROGRESS'
      });
    }

    logger.info(`✅ Successfully acquired distributed lock for changelog sync (Pod ID: ${lockInfo.lock!.podId})`);
    logger.info('📡 Starting manual changelog sync...');
    
    const changelogService = new IssueChangelogService();
    const result = await changelogService.syncAllIssueChangelogs();
    
    logger.info('✅ Manual changelog sync completed:', result);
    
    res.json({
      success: true,
      message: 'Changelog sync completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('💥 Manual changelog sync failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Changelog sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Always release the distributed lock if we acquired it
    if (lockInfo?.acquired && lockInfo.lock) {
      try {
        await DistributedLock.releaseLock(lockName, lockInfo.lock.podId);
        logger.info(`🔓 Released distributed lock for changelog sync (Pod ID: ${lockInfo.lock.podId})`);
      } catch (lockError) {
        logger.error('Failed to release distributed lock for changelog sync:', lockError);
      }
    }
  }
});

/**
 * Run churn metrics diagnostic
 * GET /api/changelog/diagnostic
 */
router.get('/diagnostic', async (req: Request, res: Response) => {
  try {
    logger.info('🔍 Running churn metrics diagnostic...');
    
    const diagnostic = new ChurnDiagnosticService();
    const result = await diagnostic.runDiagnostic();
    
    logger.info('✅ Diagnostic completed successfully');
    
    res.json({
      success: true,
      message: 'Diagnostic completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('💥 Diagnostic failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Diagnostic failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Sync specific issue changelog
 * POST /api/changelog/sync/:issueKey
 */
router.post('/sync/:issueKey', async (req: Request, res: Response) => {
  try {
    const { issueKey } = req.params;
    
    logger.info(`🔄 Syncing changelog for issue ${issueKey}...`);
    
    const changelogService = new IssueChangelogService();
    const entriesAdded = await changelogService.syncIssueChangelog(issueKey);
    
    logger.info(`✅ Synced ${entriesAdded} entries for issue ${issueKey}`);
    
    res.json({
      success: true,
      message: `Changelog sync completed for issue ${issueKey}`,
      data: {
        issueKey,
        entriesAdded
      }
    });
  } catch (error) {
    logger.error(`💥 Issue changelog sync failed for ${req.params.issueKey}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Issue changelog sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get changelog entries for a specific sprint (for debugging)
 * GET /api/changelog/sprint/:sprintId
 */
router.get('/sprint/:sprintId', async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.sprintId);
    
    if (isNaN(sprintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sprint ID'
      });
    }
    
    logger.info(`🔍 Getting changelog for sprint ${sprintId}...`);
    
    const changelogService = new IssueChangelogService();
    
    // We need sprint dates for this, so let's get the sprint first
    const { Sprint } = require('../models/Sprint');
    const sprint = await Sprint.findByPk(sprintId);
    
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }
    
    if (!sprint.startDate || !sprint.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Sprint missing start or end date'
      });
    }
    
    const churnData = await changelogService.getSprintChangelogForChurn(
      sprintId,
      new Date(sprint.startDate),
      new Date(sprint.endDate)
    );
    
    // Also calculate actual sprint metrics
    const sprintMetrics = await MetricsCalculationService.calculateSprintMetrics(sprintId);
    
    res.json({
      success: true,
      message: 'Sprint changelog retrieved successfully',
      data: {
        sprintId,
        sprintName: sprint.name,
        sprintDates: {
          start: sprint.startDate,
          end: sprint.endDate
        },
        churnData,
        calculatedMetrics: sprintMetrics ? {
          churnRate: sprintMetrics.churnRate,
          addedStoryPoints: sprintMetrics.addedStoryPoints,
          removedStoryPoints: sprintMetrics.removedStoryPoints,
          addedIssues: sprintMetrics.addedIssues,
          removedIssues: sprintMetrics.removedIssues
        } : null
      }
    });
  } catch (error) {
    logger.error(`💥 Failed to get sprint changelog for ${req.params.sprintId}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get sprint changelog',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
