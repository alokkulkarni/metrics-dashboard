import { logger } from '../utils/logger';
import { Issue } from '../models/Issue';
import { IssueChangelog } from '../models/IssueChangelog';
import { Sprint } from '../models/Sprint';
import { Op } from 'sequelize';
import axios from 'axios';

interface JiraChangelogItem {
  field: string;
  fieldtype: string;
  fieldId: string;
  from: string | null;
  fromString: string | null;
  to: string | null;
  toString: string | null;
}

interface JiraChangelogHistory {
  id: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  items: JiraChangelogItem[];
}

interface JiraIssueWithChangelog {
  key: string;
  changelog: {
    histories: JiraChangelogHistory[];
  };
}

export class IssueChangelogService {
  private jiraUrl: string;
  private jiraEmail: string;
  private jiraToken: string;

  constructor() {
    this.jiraUrl = process.env.JIRA_BASE_URL || process.env.JIRA_URL || '';
    this.jiraEmail = process.env.JIRA_EMAIL || '';
    this.jiraToken = process.env.JIRA_API_TOKEN || '';
  }

  /**
   * Sync changelog for all issues in all sprints currently in database
   */
  async syncAllIssueChangelogs(): Promise<{
    processedIssues: number;
    addedChangelogEntries: number;
    errors: number;
  }> {
    try {
      logger.info('🔄 Starting changelog sync for all issues in database');

      // Get all issues that have sprints
      const issues = await Issue.findAll({
        where: {
          sprintId: {
            [Op.ne]: null
          } as any,
        },
        include: [
          {
            model: Sprint,
            as: 'sprint',
            required: true,
          },
        ],
      });

      logger.info(`📊 Found ${issues.length} issues with sprints to sync changelog for`);

      let processedIssues = 0;
      let addedChangelogEntries = 0;
      let errors = 0;

      // Process issues in batches to avoid overwhelming Jira API
      const batchSize = 10;
      for (let i = 0; i < issues.length; i += batchSize) {
        const batch = issues.slice(i, i + batchSize);
        const batchPromises = batch.map(async (issue) => {
          try {
            const entries = await this.syncIssueChangelog(issue.key);
            processedIssues++;
            addedChangelogEntries += entries;
            logger.info(`✅ Synced ${entries} changelog entries for issue ${issue.key}`);
          } catch (error) {
            errors++;
            logger.error(`❌ Failed to sync changelog for issue ${issue.key}:`, error);
          }
        });

        await Promise.all(batchPromises);
        
        // Add delay between batches to respect API limits
        if (i + batchSize < issues.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`🎉 Changelog sync completed: ${processedIssues} issues processed, ${addedChangelogEntries} entries added, ${errors} errors`);

      return {
        processedIssues,
        addedChangelogEntries,
        errors,
      };
    } catch (error) {
      logger.error('💥 Error in syncAllIssueChangelogs:', error);
      throw error;
    }
  }

  /**
   * Sync changelog for a specific issue
   */
  async syncIssueChangelog(issueKey: string): Promise<number> {
    try {
      // Check if we already have this issue in our database
      const issue = await Issue.findOne({ where: { key: issueKey } });
      if (!issue) {
        logger.warn(`⚠️ Issue ${issueKey} not found in database, skipping changelog sync`);
        return 0;
      }

      // Fetch changelog from Jira
      const changelog = await this.fetchJiraChangelog(issueKey);
      if (!changelog || changelog.length === 0) {
        logger.info(`📝 No changelog found for issue ${issueKey}`);
        return 0;
      }

      // Process and store changelog entries
      let addedEntries = 0;
      for (const history of changelog) {
        for (const item of history.items) {
          // Only process sprint and story points changes
          if (this.isRelevantChange(item)) {
            // Build where condition excluding null/undefined values
            const whereCondition: any = {
              issueId: issue.id,
              changeDate: new Date(history.created),
              field: item.field,
            };

            if (item.fromString) {
              whereCondition.fromValue = item.fromString;
            }
            if (item.toString) {
              whereCondition.toValue = item.toString;
            }

            const existing = await IssueChangelog.findOne({
              where: whereCondition,
            });

            if (!existing) {
              await this.createChangelogEntry(issue, history, item);
              addedEntries++;
            }
          }
        }
      }

      return addedEntries;
    } catch (error) {
      logger.error(`💥 Error syncing changelog for issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Fetch changelog from Jira API
   */
  private async fetchJiraChangelog(issueKey: string): Promise<JiraChangelogHistory[]> {
    try {
      const response = await axios.get(
        `${this.jiraUrl}/rest/api/3/issue/${issueKey}?expand=changelog`,
        {
          auth: {
            username: this.jiraEmail,
            password: this.jiraToken,
          },
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      const issue: JiraIssueWithChangelog = response.data;
      return issue.changelog?.histories || [];
    } catch (error) {
      logger.error(`💥 Error fetching changelog from Jira for issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Check if a changelog item is relevant for our metrics
   */
  private isRelevantChange(item: JiraChangelogItem): boolean {
    const relevantFields = ['Sprint', 'Story Points', 'customfield_10020']; // customfield_10020 is often story points
    return relevantFields.some(field => 
      item.field === field || item.fieldId === field
    );
  }

  /**
   * Create a changelog entry in our database
   */
  private async createChangelogEntry(
    issue: Issue,
    history: JiraChangelogHistory,
    item: JiraChangelogItem
  ): Promise<void> {
    try {
      let changeType: 'sprint_added' | 'sprint_removed' | 'sprint_changed' | 'story_points_changed' | 'other' = 'other';
      let fromSprintId: number | null = null;
      let toSprintId: number | null = null;
      let storyPointsChange: number | null = null;

      // Determine change type and extract sprint IDs
      if (item.field === 'Sprint') {
        if (item.from && item.to) {
          changeType = 'sprint_changed';
          fromSprintId = await this.extractSprintId(item.fromString);
          toSprintId = await this.extractSprintId(item.toString);
        } else if (item.to && !item.from) {
          changeType = 'sprint_added';
          toSprintId = await this.extractSprintId(item.toString);
        } else if (item.from && !item.to) {
          changeType = 'sprint_removed';
          fromSprintId = await this.extractSprintId(item.fromString);
        }
      } else if (item.field === 'Story Points' || item.fieldId === 'customfield_10020') {
        changeType = 'story_points_changed';
        const fromPoints = parseFloat(item.from || '0') || 0;
        const toPoints = parseFloat(item.to || '0') || 0;
        storyPointsChange = toPoints - fromPoints;
      }

      // Build the create data, only including fields with values
      const createData: any = {
        issueId: issue.id,
        jiraIssueKey: issue.key,
        changeDate: new Date(history.created),
        field: item.field,
        changeType,
        author: history.author.displayName,
      };

      if (item.fromString) createData.fromValue = item.fromString;
      if (item.toString) createData.toValue = item.toString;
      if (fromSprintId) createData.fromSprintId = fromSprintId;
      if (toSprintId) createData.toSprintId = toSprintId;
      if (storyPointsChange !== null) createData.storyPointsChange = storyPointsChange;

      await IssueChangelog.create(createData);

      logger.debug(`📝 Created changelog entry for ${issue.key}: ${changeType}`);
    } catch (error) {
      logger.error(`💥 Error creating changelog entry for ${issue.key}:`, error);
      throw error;
    }
  }

  /**
   * Extract sprint ID from sprint string (e.g., "Sprint 123" -> 123)
   */
  private async extractSprintId(sprintString: string | null): Promise<number | null> {
    if (!sprintString) return null;

    try {
      // Try to find sprint by name first
      const sprint = await Sprint.findOne({
        where: { name: sprintString },
      });

      if (sprint) {
        return sprint.id;
      }

      // If not found by name, try to extract ID from string patterns
      const sprintIdMatch = sprintString.match(/Sprint\s+(\d+)/i) || 
                           sprintString.match(/(\d+)/);
      
      if (sprintIdMatch) {
        const potentialId = parseInt(sprintIdMatch[1]);
        const sprintById = await Sprint.findByPk(potentialId);
        if (sprintById) {
          return sprintById.id;
        }
      }

      logger.warn(`⚠️ Could not extract sprint ID from: ${sprintString}`);
      return null;
    } catch (error) {
      logger.error(`💥 Error extracting sprint ID from ${sprintString}:`, error);
      return null;
    }
  }

  /**
   * Get changelog entries for churn rate calculation
   */
  async getSprintChangelogForChurn(sprintId: number, sprintStartDate: Date, sprintEndDate: Date): Promise<{
    addedStoryPoints: number;
    removedStoryPoints: number;
    addedIssues: number;
    removedIssues: number;
  }> {
    try {
      // Validate and convert input parameters
      if (!sprintId || sprintId <= 0) {
        throw new Error(`Invalid sprintId: ${sprintId}`);
      }
      
      if (!sprintStartDate || !sprintEndDate) {
        throw new Error(`Invalid date parameters: startDate=${sprintStartDate}, endDate=${sprintEndDate}`);
      }

      // Ensure dates are Date objects
      const startDate = sprintStartDate instanceof Date ? sprintStartDate : new Date(sprintStartDate);
      const endDate = sprintEndDate instanceof Date ? sprintEndDate : new Date(sprintEndDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`Invalid date objects: startDate=${startDate}, endDate=${endDate}`);
      }

      logger.info(`🔍 Querying changelog for sprint ${sprintId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);

      // Check if IssueChangelog table has any data
      try {
        const changelogCount = await IssueChangelog.count();
        logger.info(`📊 IssueChangelog table contains ${changelogCount} entries`);
        
        if (changelogCount === 0) {
          logger.warn(`No changelog data available, returning zero churn for sprint ${sprintId}`);
          return {
            addedStoryPoints: 0,
            removedStoryPoints: 0,
            addedIssues: 0,
            removedIssues: 0,
          };
        }
      } catch (countError) {
        logger.error('Error counting changelog entries:', countError);
        const errorMessage = countError instanceof Error ? countError.message : 'Unknown error';
        throw new Error(`Cannot access IssueChangelog table: ${errorMessage}`);
      }

      // Get all changelog entries for this sprint within the sprint period
      const whereConditions = {
        changeDate: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
        [Op.or]: [
          { fromSprintId: sprintId },
          { toSprintId: sprintId },
        ],
      };

      logger.debug('Query conditions:', JSON.stringify(whereConditions, null, 2));

      const changelogEntries = await IssueChangelog.findAll({
        where: whereConditions,
        include: [
          {
            model: Issue,
            as: 'issue',
            required: true,
          },
        ],
      });

      logger.info(`📊 Found ${changelogEntries.length} changelog entries for sprint ${sprintId}`);

      let addedStoryPoints = 0;
      let removedStoryPoints = 0;
      let addedIssues = 0;
      let removedIssues = 0;

      for (const entry of changelogEntries) {
        logger.debug(`Processing changelog entry:`, {
          issueKey: entry.jiraIssueKey,
          changeType: entry.changeType,
          fromSprintId: entry.fromSprintId,
          toSprintId: entry.toSprintId,
          storyPoints: entry.issue?.storyPoints || 0
        });

        if (entry.changeType === 'sprint_added' && entry.toSprintId === sprintId) {
          // Issue added to this sprint
          addedIssues++;
          const points = parseFloat(String(entry.issue?.storyPoints || 0)) || 0;
          addedStoryPoints += points;
          logger.debug(`Added issue ${entry.jiraIssueKey}: ${points} points`);
        } else if (entry.changeType === 'sprint_removed' && entry.fromSprintId === sprintId) {
          // Issue removed from this sprint
          removedIssues++;
          const points = parseFloat(String(entry.issue?.storyPoints || 0)) || 0;
          removedStoryPoints += points;
          logger.debug(`Removed issue ${entry.jiraIssueKey}: ${points} points`);
        } else if (entry.changeType === 'sprint_changed') {
          if (entry.toSprintId === sprintId && entry.fromSprintId !== sprintId) {
            // Issue moved to this sprint from another sprint
            addedIssues++;
            const points = parseFloat(String(entry.issue?.storyPoints || 0)) || 0;
            addedStoryPoints += points;
            logger.debug(`Moved to sprint ${entry.jiraIssueKey}: ${points} points`);
          } else if (entry.fromSprintId === sprintId && entry.toSprintId !== sprintId) {
            // Issue moved from this sprint to another sprint
            removedIssues++;
            const points = parseFloat(String(entry.issue?.storyPoints || 0)) || 0;
            removedStoryPoints += points;
            logger.debug(`Moved from sprint ${entry.jiraIssueKey}: ${points} points`);
          }
        } else if (entry.changeType === 'story_points_changed' && 
                   (entry.fromSprintId === sprintId || entry.toSprintId === sprintId)) {
          // Story points changed while issue was in this sprint
          const pointsChange = entry.storyPointsChange || 0;
          if (pointsChange > 0) {
            addedStoryPoints += pointsChange;
            logger.debug(`Story points increased for ${entry.jiraIssueKey}: +${pointsChange} points`);
          } else if (pointsChange < 0) {
            removedStoryPoints += Math.abs(pointsChange);
            logger.debug(`Story points decreased for ${entry.jiraIssueKey}: ${pointsChange} points`);
          }
        }
      }

      logger.info(`📊 Sprint ${sprintId} churn data:`, {
        addedStoryPoints,
        removedStoryPoints,
        addedIssues,
        removedIssues,
        totalChangelogEntries: changelogEntries.length,
      });

      return {
        addedStoryPoints,
        removedStoryPoints,
        addedIssues,
        removedIssues,
      };
    } catch (error) {
      logger.error(`💥 Error getting sprint changelog for churn calculation:`, error);
      throw error;
    }
  }
}
