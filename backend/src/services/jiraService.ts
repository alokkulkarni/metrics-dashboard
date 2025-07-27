import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config';

interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectType?: string;
  projectTypeKey?: string;
  lead?: {
    accountId: string;
    displayName: string;
  };
  url?: string;
  avatarUrls?: {
    '48x48': string;
  };
}

interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: {
    projectId: number;
    projectKey: string;
    projectName: string;
  };
  canEdit: boolean;
}

interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
  boardId: number;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: {
      name: string;
    };
    status: {
      name: string;
    };
    priority: {
      name: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
    };
    reporter?: {
      accountId: string;
      displayName: string;
    };
    customfield_10030?: number; // Story Points (actual field used in this org)
    customfield_10016?: number; // Story point estimate (not used in this org)
    created: string;
    updated: string;
    resolutiondate?: string;
    parent?: {
      id: string;
      key: string;
    };
    labels: string[];
    components: Array<{ name: string }>;
    fixVersions: Array<{ name: string }>;
  };
}

class JiraService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.jira.baseUrl,
      auth: {
        username: config.jira.email,
        password: config.jira.apiToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`JIRA API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('JIRA API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`JIRA API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('JIRA API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async getProjects(): Promise<JiraProject[]> {
    try {
      const response = await this.client.get('/rest/api/3/project');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch projects from JIRA:', error);
      throw error;
    }
  }

  async getProject(projectKey: string): Promise<JiraProject> {
    try {
      const response = await this.client.get(`/rest/api/3/project/${projectKey}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch project ${projectKey} from JIRA:`, error);
      throw error;
    }
  }

  async getBoardsForProject(projectKey: string): Promise<JiraBoard[]> {
    try {
      const allBoards: JiraBoard[] = [];
      let startAt = 0;
      const maxResults = 50; // Jira's maximum for boards endpoint
      let isLastPage = false;

      while (!isLastPage) {
        const response = await this.client.get(`/rest/agile/1.0/board`, {
          params: {
            projectKeyOrId: projectKey,
            type: 'scrum',
            startAt,
            maxResults,
          },
        });

        const boards = response.data.values || [];
        allBoards.push(...boards);

        // Check if we've reached the last page
        isLastPage = response.data.isLast || boards.length < maxResults;
        startAt += maxResults;

        logger.debug(`Fetched ${boards.length} scrum boards for project ${projectKey} (total so far: ${allBoards.length})`);
      }

      logger.info(`Successfully fetched ${allBoards.length} scrum boards for project ${projectKey}`);
      return allBoards;
    } catch (error) {
      logger.error(`Failed to fetch boards for project ${projectKey}:`, error);
      throw error;
    }
  }

  async getAllBoards(): Promise<JiraBoard[]> {
    try {
      const allBoards: JiraBoard[] = [];
      let startAt = 0;
      const maxResults = 50; // Jira's maximum for boards endpoint
      let isLastPage = false;

      while (!isLastPage) {
        const response = await this.client.get(`/rest/agile/1.0/board`, {
          params: {
            startAt,
            maxResults,
          },
        });

        const boards = response.data.values || [];
        allBoards.push(...boards);

        // Check if we've reached the last page
        isLastPage = response.data.isLast || boards.length < maxResults;
        startAt += maxResults;

        logger.debug(`Fetched ${boards.length} boards (total so far: ${allBoards.length})`);
      }

      logger.info(`Successfully fetched ${allBoards.length} total boards from Jira`);
      return allBoards;
    } catch (error) {
      logger.error('Failed to fetch all boards from JIRA:', error);
      throw error;
    }
  }

  async getBoard(boardId: number): Promise<JiraBoard> {
    try {
      const response = await this.client.get(`/rest/agile/1.0/board/${boardId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch board ${boardId} from JIRA:`, error);
      throw error;
    }
  }

  async getSprintsForBoard(boardId: number): Promise<JiraSprint[]> {
    try {
      const allSprints: JiraSprint[] = [];
      let startAt = 0;
      const maxResults = 50; // Jira's maximum for sprints endpoint
      let isLastPage = false;

      while (!isLastPage) {
        const response = await this.client.get(`/rest/agile/1.0/board/${boardId}/sprint`, {
          params: {
            startAt,
            maxResults,
          },
        });

        const sprints = response.data.values || [];
        allSprints.push(...sprints);

        // Check if we've reached the last page
        isLastPage = response.data.isLast || sprints.length < maxResults;
        startAt += maxResults;

        logger.debug(`Fetched ${sprints.length} sprints for board ${boardId} (total so far: ${allSprints.length})`);
      }

      logger.info(`Successfully fetched ${allSprints.length} sprints for board ${boardId}`);
      return allSprints;
    } catch (error) {
      logger.error(`Failed to fetch sprints for board ${boardId}:`, error);
      throw error;
    }
  }

  async getSprint(sprintId: number): Promise<JiraSprint> {
    try {
      const response = await this.client.get(`/rest/agile/1.0/sprint/${sprintId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch sprint ${sprintId} from JIRA:`, error);
      throw error;
    }
  }

  async getIssuesForSprint(sprintId: number): Promise<JiraIssue[]> {
    try {
      const response = await this.client.get(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
        params: {
          maxResults: 1000,
          fields: 'summary,description,issuetype,status,priority,assignee,reporter,customfield_10030,created,updated,resolutiondate,parent,labels,components,fixVersions',
        },
      });
      return response.data.issues;
    } catch (error) {
      logger.error(`Failed to fetch issues for sprint ${sprintId}:`, error);
      throw error;
    }
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await this.client.get(`/rest/api/3/issue/${issueKey}`, {
        params: {
          fields: 'summary,description,issuetype,status,priority,assignee,reporter,customfield_10030,created,updated,resolutiondate,parent,labels,components,fixVersions',
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch issue ${issueKey} from JIRA:`, error);
      throw error;
    }
  }

  async searchIssues(jql: string, maxResults: number = 100): Promise<JiraIssue[]> {
    try {
      const response = await this.client.post('/rest/api/3/search', {
        jql,
        maxResults,
        fields: ['summary', 'description', 'issuetype', 'status', 'priority', 'assignee', 'reporter', 'customfield_10030', 'created', 'updated', 'resolutiondate', 'parent', 'labels', 'components', 'fixVersions'],
      });
      return response.data.issues;
    } catch (error) {
      logger.error(`Failed to search issues with JQL: ${jql}`, error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/rest/api/3/myself');
      logger.info('JIRA connection test successful:', response.data.displayName);
      return true;
    } catch (error) {
      logger.error('JIRA connection test failed:', error);
      return false;
    }
  }

  async getIssueWithAllFields(issueKey: string): Promise<any> {
    try {
      const response = await this.client.get(`/rest/api/3/issue/${issueKey}`, {
        params: {
          expand: 'names',
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch issue ${issueKey} with all fields:`, error);
      throw error;
    }
  }

  async getSprintReport(sprintId: number): Promise<any> {
    try {
      const response = await this.client.get(`/rest/greenhopper/1.0/rapid/charts/sprintreport`, {
        params: {
          rapidViewId: 60, // Board ID - should be dynamic
          sprintId: sprintId,
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch sprint report for sprint ${sprintId}:`, error);
      throw error;
    }
  }

  async getSprintWithDetails(sprintId: number): Promise<any> {
    try {
      const response = await this.client.get(`/rest/agile/1.0/sprint/${sprintId}`, {
        params: {
          expand: 'all',
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch detailed sprint ${sprintId}:`, error);
      throw error;
    }
  }

  async getSprintIssuesWithHistory(sprintId: number, boardId: number): Promise<any> {
    try {
      // Try to get sprint report which might contain added/removed issue information
      const response = await this.client.get(`/rest/greenhopper/1.0/rapid/charts/sprintreport`, {
        params: {
          rapidViewId: boardId,
          sprintId: sprintId,
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch sprint issues with history for sprint ${sprintId}:`, error);
      
      // Fallback to regular sprint issues
      try {
        const fallbackResponse = await this.client.get(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
          params: {
            maxResults: 1000,
            fields: 'summary,description,issuetype,status,priority,assignee,reporter,customfield_10030,created,updated,resolutiondate,parent,labels,components,fixVersions',
            expand: 'changelog',
          },
        });
        return { issues: fallbackResponse.data.issues };
      } catch (fallbackError) {
        logger.error(`Fallback also failed for sprint ${sprintId}:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  // Kanban-specific methods
  async getKanbanBoardsForProject(projectKey: string): Promise<JiraBoard[]> {
    try {
      const allBoards: JiraBoard[] = [];
      let startAt = 0;
      const maxResults = 50;
      let isLastPage = false;

      while (!isLastPage) {
        const response = await this.client.get(`/rest/agile/1.0/board`, {
          params: {
            projectKeyOrId: projectKey,
            type: 'kanban',
            startAt,
            maxResults,
          },
        });

        const boards = response.data.values || [];
        allBoards.push(...boards);

        isLastPage = response.data.isLast || boards.length < maxResults;
        startAt += maxResults;

        logger.debug(`Fetched ${boards.length} kanban boards for project ${projectKey} (total so far: ${allBoards.length})`);
      }

      logger.info(`Successfully fetched ${allBoards.length} kanban boards for project ${projectKey}`);
      return allBoards;
    } catch (error) {
      logger.error(`Failed to fetch kanban boards for project ${projectKey}:`, error);
      throw error;
    }
  }

  async getAllKanbanBoards(): Promise<JiraBoard[]> {
    try {
      const allBoards: JiraBoard[] = [];
      let startAt = 0;
      const maxResults = 50;
      let isLastPage = false;

      while (!isLastPage) {
        const response = await this.client.get(`/rest/agile/1.0/board`, {
          params: {
            type: 'kanban',
            startAt,
            maxResults,
          },
        });

        const boards = response.data.values || [];
        allBoards.push(...boards);

        isLastPage = response.data.isLast || boards.length < maxResults;
        startAt += maxResults;

        logger.debug(`Fetched ${boards.length} kanban boards (total so far: ${allBoards.length})`);
      }

      logger.info(`Successfully fetched ${allBoards.length} kanban boards`);
      return allBoards;
    } catch (error) {
      logger.error('Failed to fetch all kanban boards:', error);
      throw error;
    }
  }

  async getKanbanBoardConfiguration(boardId: number): Promise<any> {
    try {
      const response = await this.client.get(`/rest/agile/1.0/board/${boardId}/configuration`);
      logger.debug(`Fetched configuration for kanban board ${boardId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch configuration for kanban board ${boardId}:`, error);
      throw error;
    }
  }

  async getIssuesForKanbanBoard(boardId: number): Promise<JiraIssue[]> {
    try {
      const allIssues: JiraIssue[] = [];
      let startAt = 0;
      const maxResults = 100;
      let isLastPage = false;

      while (!isLastPage) {
        const response = await this.client.get(`/rest/agile/1.0/board/${boardId}/issue`, {
          params: {
            startAt,
            maxResults,
            fields: 'summary,description,issuetype,status,priority,assignee,reporter,customfield_10030,created,updated,resolutiondate,parent,labels,components,fixVersions',
            expand: 'changelog',
          },
        });

        const issues = response.data.issues || [];
        allIssues.push(...issues);

        isLastPage = response.data.isLast || issues.length < maxResults;
        startAt += maxResults;

        logger.debug(`Fetched ${issues.length} issues for kanban board ${boardId} (total so far: ${allIssues.length})`);
      }

      logger.info(`Successfully fetched ${allIssues.length} issues for kanban board ${boardId}`);
      return allIssues;
    } catch (error) {
      logger.error(`Failed to fetch issues for kanban board ${boardId}:`, error);
      throw error;
    }
  }

  async getKanbanIssueWithBoardDetails(boardId: number, issueKey: string): Promise<any> {
    try {
      // Get issue details with board-specific information
      const response = await this.client.get(`/rest/agile/1.0/issue/${issueKey}`, {
        params: {
          fields: 'summary,description,issuetype,status,priority,assignee,reporter,customfield_10030,created,updated,resolutiondate,parent,labels,components,fixVersions',
          expand: 'changelog,names',
        },
      });

      const issue = response.data;

      // Try to get board-specific information like column and swimlane
      try {
        const boardConfig = await this.getKanbanBoardConfiguration(boardId);
        
        // Map status to column if possible
        const columns = boardConfig.columnConfig?.columns || [];
        const currentColumn = columns.find((col: any) => 
          col.statuses?.some((status: any) => status.id === issue.fields.status.id)
        );

        if (currentColumn) {
          issue.kanbanDetails = {
            columnId: currentColumn.id,
            columnName: currentColumn.name,
            columnConfig: currentColumn,
          };
        }

        // Add swimlane information if available
        if (boardConfig.ranking?.rankCustomFieldId) {
          issue.kanbanDetails = {
            ...issue.kanbanDetails,
            rankCustomFieldId: boardConfig.ranking.rankCustomFieldId,
          };
        }

      } catch (configError) {
        logger.warn(`Could not fetch board configuration for kanban board ${boardId}:`, configError);
        // Continue without board-specific details
      }

      return issue;
    } catch (error) {
      logger.error(`Failed to fetch kanban issue ${issueKey} for board ${boardId}:`, error);
      throw error;
    }
  }
}

export const jiraService = new JiraService();
export default jiraService;
export type { JiraProject, JiraBoard, JiraSprint, JiraIssue };
