# Kanban Metrics System 📊

A comprehensive sprint-aligned Kanban metrics calculation and display system that synchronizes with active sprint periods and provides detailed analytics for Kanban boards.

## 🎯 Overview

This system calculates and displays comprehensive Kanban metrics that are synchronized with active sprint periods, using two-week time periods aligned with currently active sprints in scrum boards. The system provides:

- **Sprint-synchronized calculations** - All metrics align with active sprint periods
- **Two-week period alignment** - Uses 14-day periods that sync with sprint dates
- **Comprehensive metrics** - Cycle time, lead time, throughput, WIP violations, flow efficiency
- **Real-time calculation** - Metrics are calculated on-demand or scheduled
- **Historical tracking** - Complete metrics history with trend analysis
- **API endpoints** - RESTful API for integration and data access

## 🏗️ Architecture

### Core Components

1. **KanbanMetricsCalculationService** - Core calculation engine
2. **KanbanMetricsDisplayService** - Data formatting and presentation
3. **KanbanMetrics Model** - Database storage with sprint period tracking
4. **API Routes** - REST endpoints for metrics access
5. **Demo Script** - Comprehensive testing and demonstration

### Models

#### KanbanMetrics
```typescript
interface KanbanMetricsAttributes {
  id: number;
  kanbanBoardId: number;
  calculatedAt: Date;
  sprintPeriodStart?: Date;     // NEW: Sprint period start
  sprintPeriodEnd?: Date;       // NEW: Sprint period end
  
  // Status Metrics
  totalIssues: number;
  todoIssues: number;
  inProgressIssues: number;
  doneIssues: number;
  blockedIssues: number;
  flaggedIssues: number;
  
  // Time Metrics
  averageCycleTime?: number;
  medianCycleTime?: number;
  cycleTimes: number[];
  averageLeadTime?: number;
  medianLeadTime?: number;
  leadTimes: number[];
  
  // Throughput Metrics
  weeklyThroughput: number[];
  monthlyThroughput: number[];
  currentSprintThroughput?: number;  // NEW: Sprint-aligned throughput
  
  // Quality Metrics
  wipViolations: number;
  wipUtilization: any;
  averageAgeInProgress?: number;
  oldestIssueAge?: number;
  flowEfficiency?: number;
  
  // Breakdown Metrics
  issueTypeBreakdown: any;
  priorityBreakdown: any;
  assigneeBreakdown: any;
  columnMetrics: any;
}
```

## 🚀 Features

### Sprint Alignment 🎯
- **Active Sprint Detection**: Automatically finds the current active sprint for each project
- **Two-Week Fallback**: If no active sprint exists, creates a 14-day period ending today
- **Period Synchronization**: All throughput calculations use sprint-aligned periods
- **Sprint Period Tracking**: Stores sprint start/end dates with each metrics calculation

### Comprehensive Metrics 📊

#### Status Metrics
- Total issues across all statuses
- Breakdown by status: Todo, In Progress, Done, Blocked, Flagged
- Real-time status distribution

#### Time Metrics ⏱️
- **Cycle Time**: Time from start to completion (in-progress time)
- **Lead Time**: Time from creation to completion (total time)
- Average and median calculations for both metrics
- Historical time tracking for trend analysis

#### Throughput Metrics 🚀
- **Current Sprint Throughput**: Issues completed in the active sprint period
- **Weekly Throughput**: Last 12 two-week periods (aligned with sprints)
- **Monthly Throughput**: Last 6 months of completion data
- Sprint-synchronized calculation periods

#### Quality Metrics 💫
- **WIP Violations**: Count of columns exceeding WIP limits
- **WIP Utilization**: Utilization percentage per column
- **Flow Efficiency**: Percentage of active work time vs waiting time
- **Age Metrics**: Average and oldest issue ages in progress

#### Breakdown Analytics 📋
- **Issue Type Breakdown**: Distribution by story, bug, task, etc.
- **Priority Breakdown**: Distribution by priority levels
- **Assignee Breakdown**: Work distribution across team members
- **Column Metrics**: Detailed analysis per Kanban column

### Column Analysis 📋
Each column provides:
- Issue count and average age
- WIP limit compliance checking
- Oldest issue identification
- Violation alerts for exceeded limits

## 🔧 Usage

### API Endpoints

#### Get All Kanban Metrics
```http
GET /api/kanban-metrics
```
Returns metrics for all Kanban boards with sprint alignment status.

#### Get Metrics Summary
```http
GET /api/kanban-metrics/summary
```
Returns aggregated summary statistics across all boards.

#### Get Board-Specific Metrics
```http
GET /api/kanban-metrics/board/:boardId
```
Returns detailed metrics for a specific Kanban board.

#### Get Metrics History
```http
GET /api/kanban-metrics/board/:boardId/history?limit=10
```
Returns historical metrics for trend analysis.

#### Calculate Metrics
```http
POST /api/kanban-metrics/board/:boardId/calculate
```
Triggers metric calculation for a specific board.

```http
POST /api/kanban-metrics/calculate-all
```
Triggers metric calculation for all boards.

#### Get Formatted Display
```http
GET /api/kanban-metrics/board/:boardId/display
```
Returns formatted console-style metrics display.

### Programmatic Usage

#### Calculate Metrics for All Boards
```typescript
import { KanbanMetricsCalculationService } from '../services/KanbanMetricsCalculationService';

const results = await KanbanMetricsCalculationService.calculateMetricsForAllBoards();
console.log(`Calculated: ${results.calculatedBoards.length}, Skipped: ${results.skippedBoards.length}`);
```

#### Display Metrics for a Board
```typescript
import { KanbanMetricsDisplayService } from '../services/KanbanMetricsDisplayService';

const metrics = await KanbanMetricsDisplayService.getKanbanBoardMetrics(boardId);
if (metrics) {
  const formatted = KanbanMetricsDisplayService.formatMetricsForDisplay(metrics);
  console.log(formatted);
}
```

#### Get Metrics Summary
```typescript
const summary = await KanbanMetricsDisplayService.getKanbanMetricsSummary();
console.log(\`Total boards: \${summary.totalBoards}\`);
console.log(\`Sprint-aligned: \${summary.sprintAlignedBoards}\`);
```

### Demo Script
```typescript
import { KanbanMetricsDemo } from '../scripts/kanbanMetricsDemo';

// Run comprehensive demo
await KanbanMetricsDemo.runDemo();

// Quick test for specific board
await KanbanMetricsDemo.quickTest(boardId);
```

## 📊 Sprint Synchronization

### How It Works
1. **Active Sprint Detection**: For each board, the system queries for active sprints in the associated project
2. **Period Alignment**: If an active sprint exists, uses its start/end dates for metric calculations
3. **Two-Week Fallback**: If no active sprint, creates a 14-day period ending today
4. **Throughput Calculation**: All throughput metrics use these aligned periods instead of calendar weeks

### Benefits
- **Consistent Periods**: Metrics align with actual work cycles (sprints)
- **Meaningful Throughput**: Sprint throughput shows actual delivery within sprint boundaries
- **Trend Analysis**: Historical data maintains sprint context for better insights
- **Team Alignment**: Metrics reflect how teams actually work (in sprints)

## 🎨 Output Examples

### Formatted Metrics Display
```
╔══════════════════════════════════════════════════════════════╗
║                    KANBAN BOARD METRICS                     ║
╠══════════════════════════════════════════════════════════════╣
║ Board: Development Board                                     ║
║ Board ID: 1                                                  ║
║ Last Calculated: 7/21/2024, 3:45:23 PM                     ║
╠══════════════════════════════════════════════════════════════╣
║                     SPRINT ALIGNMENT                        ║
╠══════════════════════════════════════════════════════════════╣
║ Sprint Aligned: Yes                                          ║
║ Sprint Period: 7/8/2024 - 7/21/2024                        ║
║ Sprint Duration: 14 days                                     ║
╠══════════════════════════════════════════════════════════════╣
║                      STATUS METRICS                         ║
╠══════════════════════════════════════════════════════════════╣
║ Total Issues: 45                                             ║
║ Todo: 12                                                     ║
║ In Progress: 8                                               ║
║ Done: 23                                                     ║
║ Blocked: 2                                                   ║
║ Flagged: 0                                                   ║
╠══════════════════════════════════════════════════════════════╣
║                       TIME METRICS                          ║
╠══════════════════════════════════════════════════════════════╣
║ Avg Cycle Time: 3.2 days                                    ║
║ Median Cycle Time: 2.8 days                                 ║
║ Avg Lead Time: 5.1 days                                     ║
║ Median Lead Time: 4.5 days                                  ║
║ Avg Age in Progress: 4.2 days                               ║
║ Oldest Issue Age: 12.0 days                                 ║
╠══════════════════════════════════════════════════════════════╣
║                    THROUGHPUT METRICS                       ║
╠══════════════════════════════════════════════════════════════╣
║ Current Sprint Throughput: 15                               ║
║ Weekly Throughput: 12, 18, 15, 14                          ║
║ Monthly Throughput: 45, 52, 48                             ║
╠══════════════════════════════════════════════════════════════╣
║                     QUALITY METRICS                         ║
╠══════════════════════════════════════════════════════════════╣
║ WIP Violations: 1                                            ║
║ Flow Efficiency: 60.0%                                      ║
╚══════════════════════════════════════════════════════════════╝
```

### API Response Example
```json
{
  "success": true,
  "data": {
    "boardInfo": {
      "id": 1,
      "name": "Development Board",
      "projectId": 10001
    },
    "sprintInfo": {
      "isSprintAligned": true,
      "sprintPeriodStart": "2024-07-08T00:00:00.000Z",
      "sprintPeriodEnd": "2024-07-21T23:59:59.999Z",
      "sprintDuration": 14
    },
    "statusMetrics": {
      "totalIssues": 45,
      "todoIssues": 12,
      "inProgressIssues": 8,
      "doneIssues": 23,
      "blockedIssues": 2,
      "flaggedIssues": 0
    },
    "timeMetrics": {
      "averageCycleTime": 3.2,
      "medianCycleTime": 2.8,
      "averageLeadTime": 5.1,
      "medianLeadTime": 4.5
    },
    "throughputMetrics": {
      "currentSprintThroughput": 15,
      "weeklyThroughput": [12, 18, 15, 14],
      "monthlyThroughput": [45, 52, 48]
    }
  }
}
```

## 🔮 Future Enhancements

- **Predictive Analytics**: Forecast completion dates based on current metrics
- **Team Performance**: Individual and team-level analytics
- **Custom Dashboards**: Configurable metrics displays
- **Automated Alerts**: Notifications for metric thresholds
- **Integration**: Connect with other project management tools
- **Advanced Flow**: Detailed flow efficiency calculations with actual time tracking

## 🛠️ Installation & Setup

1. **Database Migration**: Update the kanban_metrics table to include sprint period fields
2. **Service Integration**: Import the calculation and display services
3. **API Routes**: Add the kanban metrics routes to your Express app
4. **Scheduled Calculation**: Set up cron jobs for automatic metric calculation
5. **Frontend Integration**: Connect your UI to the API endpoints

## 📝 Database Schema Updates

Add these fields to your kanban_metrics table:
```sql
ALTER TABLE kanban_metrics 
ADD COLUMN sprint_period_start TIMESTAMP NULL,
ADD COLUMN sprint_period_end TIMESTAMP NULL,
ADD COLUMN current_sprint_throughput INTEGER NULL;

CREATE INDEX idx_kanban_metrics_sprint_period 
ON kanban_metrics(sprint_period_start, sprint_period_end);
```

---

**The Kanban metrics system is now fully operational with sprint synchronization! 🎉**

All metrics calculations are aligned with active sprint periods, providing meaningful insights that reflect how teams actually work in two-week sprint cycles.
