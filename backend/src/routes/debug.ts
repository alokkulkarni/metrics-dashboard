import { Router } from 'express';
import { Request, Response } from 'express';
import { jiraService } from '../services/jiraService';
import { syncService } from '../services/syncService';
import { Project } from '../models/Project';
import { Board } from '../models/Board';
import { Sprint } from '../models/Sprint';
import { logger } from '../utils/logger';

const router = Router();

// Debug endpoint to test simple Jira API calls
router.get('/jira/sprint/:sprintId', async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.sprintId);
    
    // Get basic sprint details
    const sprint = await jiraService.getSprint(sprintId);
    
    res.json({
      success: true,
      sprint,
    });
  } catch (error) {
    logger.error(`Failed to get sprint ${req.params.sprintId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sprint details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Debug endpoint to inspect raw Jira issue fields
router.get('/jira/issue/:issueKey', async (req: Request, res: Response) => {
  try {
    const { issueKey } = req.params;
    
    // Make a direct call to get all fields for an issue
    const issue = await jiraService.getIssueWithAllFields(issueKey);
    
    const allCustomFields: Record<string, any> = {};
    
    // Extract all custom fields
    Object.keys(issue.fields).forEach(key => {
      if (key.startsWith('customfield_')) {
        allCustomFields[key] = issue.fields[key];
      }
    });
    
    logger.info(`Debug: Issue ${issueKey} custom fields:`, allCustomFields);
    
    res.json({
      success: true,
      issueKey,
      customFields: allCustomFields,
      storyPointsField: issue.fields.customfield_10016,
      allFieldNames: issue.names || {},
      totalFields: Object.keys(issue.fields).length,
    });
  } catch (error) {
    logger.error(`Failed to debug issue ${req.params.issueKey}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue details',
    });
  }
});

// Debug endpoint to explore Jira sprint fields
router.get('/sprint/:sprintId/fields', async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.sprintId);
    const boardId = req.query.boardId ? parseInt(req.query.boardId as string) : 60;

    logger.info(`Exploring Jira fields for sprint ${sprintId} on board ${boardId}`);

    // Get basic sprint info
    const sprintDetails = await jiraService.getSprintWithDetails(sprintId);
    
    // Try to get sprint report
    let sprintReport = null;
    try {
      sprintReport = await jiraService.getSprintIssuesWithHistory(sprintId, boardId);
    } catch (error) {
      logger.warn(`Could not get sprint report for sprint ${sprintId}:`, error);
    }

    // Get regular sprint issues
    const sprintIssues = await jiraService.getIssuesForSprint(sprintId);

    res.json({
      success: true,
      data: {
        sprintDetails,
        sprintReport,
        issueCount: sprintIssues.length,
        sampleIssue: sprintIssues[0] || null,
      },
    });
  } catch (error) {
    logger.error('Failed to explore sprint fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to explore sprint fields',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Debug endpoint to explore a specific issue's changelog
router.get('/issue/:issueKey/changelog', async (req: Request, res: Response) => {
  try {
    const issueKey = req.params.issueKey;

    const response = await (jiraService as any).client.get(`/rest/api/3/issue/${issueKey}`, {
      params: {
        expand: 'changelog',
        fields: 'summary,customfield_10030,status',
      },
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error(`Failed to get changelog for issue ${req.params.issueKey}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get issue changelog',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Debug endpoint to test board sync comparison
router.get('/sync/board-comparison', async (req: Request, res: Response) => {
  try {
    logger.info('Starting board sync comparison debug...');
    
    // Get JIRA boards
    const jiraBoards = await jiraService.getAllBoards();
    const scrumBoards = jiraBoards.filter(b => b.type === 'scrum');
    
    // Get database boards
    const dbBoards = await Board.findAll({
      attributes: ['jiraBoardId', 'name'],
      order: [['jiraBoardId', 'ASC']]
    });
    
    // Create comparison
    const jiraBoardIds = new Set(scrumBoards.map(b => b.id));
    const dbBoardIds = new Set(dbBoards.map(b => b.jiraBoardId));
    
    const missingFromDb = scrumBoards.filter(b => !dbBoardIds.has(b.id));
    const extraInDb = dbBoards.filter(b => !jiraBoardIds.has(b.jiraBoardId));
    
    logger.info('Board comparison completed', {
      jiraTotal: jiraBoards.length,
      jiraScrum: scrumBoards.length,
      dbTotal: dbBoards.length,
      missing: missingFromDb.length,
      extra: extraInDb.length
    });
    
    res.json({
      success: true,
      comparison: {
        jira: {
          total: jiraBoards.length,
          scrum: scrumBoards.length,
          boardIds: scrumBoards.map(b => ({ id: b.id, name: b.name, project: b.location?.projectKey }))
        },
        database: {
          total: dbBoards.length,
          boardIds: dbBoards.map(b => ({ id: b.jiraBoardId, name: b.name }))
        },
        differences: {
          missingFromDatabase: missingFromDb.map(b => ({ 
            id: b.id, 
            name: b.name, 
            projectKey: b.location?.projectKey,
            type: b.type 
          })),
          extraInDatabase: extraInDb.map(b => ({ 
            id: b.jiraBoardId, 
            name: b.name 
          }))
        }
      }
    });
  } catch (error) {
    logger.error('Failed to perform board comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform board comparison',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Debug endpoint to test the new sync logic without full sync
router.post('/sync/boards-only', async (req: Request, res: Response) => {
  try {
    logger.info('Starting boards-only sync test...');
    
    // Run only board sync with the new logic
    const result = await syncService.syncAll({
      bypassThrottle: true,
      // Add any specific board IDs if needed for testing
    });
    
    res.json({
      success: true,
      message: 'Boards sync completed',
      result
    });
  } catch (error) {
    logger.error('Failed to sync boards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync boards',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
