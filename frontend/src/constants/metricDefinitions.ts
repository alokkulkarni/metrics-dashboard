export const METRIC_DEFINITIONS = {
  // Sprint Level Metrics
  velocity: {
    title: 'Velocity',
    definition: 'The amount of work a team completes during a sprint, measured in story points.',
    calculation: 'Sum of story points for all completed issues in the sprint',
    example: 'If a team completes issues worth 25 story points in a sprint, their velocity is 25.'
  },
  
  completionRate: {
    title: 'Completion Rate',
    definition: 'The percentage of planned work that was completed during the sprint.',
    calculation: '(Completed Story Points / Total Planned Story Points) × 100',
    example: 'If 20 out of 25 planned story points were completed, the completion rate is 80%.'
  },
  
  churnRate: {
    title: 'Churn Rate',
    definition: 'The percentage of scope change during a sprint, including added and removed work.',
    calculation: '((Added Story Points + Removed Story Points) / Original Story Points) × 100',
    example: 'If 5 points were added and 3 points removed from a 25-point sprint, churn rate is 32%.'
  },
  
  cycleTime: {
    title: 'Cycle Time',
    definition: 'The average time it takes for an issue to go from "In Progress" to "Done" during the sprint.',
    calculation: 'Average of (Resolution Date - Created Date) for all completed issues',
    example: 'If issues took 3, 5, and 7 days to complete, average cycle time is 5 days.'
  },
  
  leadTime: {
    title: 'Lead Time',
    definition: 'The average total time from when an issue is created until it is resolved.',
    calculation: 'Average of (Resolution Date - Created Date) for all completed issues',
    example: 'If issues were created and resolved after 10, 12, and 14 days, average lead time is 12 days.'
  },
  
  storyPoints: {
    title: 'Story Points',
    definition: 'A unit of measure for expressing the relative effort required to implement a user story or feature.',
    calculation: 'Sum of story point estimates assigned to issues',
    example: 'Completed: 20 points, Total: 25 points means 20 of 25 planned points were finished.'
  },
  
  issues: {
    title: 'Issues',
    definition: 'The total count of work items (user stories, bugs, tasks) in the sprint.',
    calculation: 'Count of all issues in the sprint by status',
    example: 'Completed: 8 issues, Total: 10 issues means 8 out of 10 items were finished.'
  },

  defectLeakageRate: {
    title: 'Defect Leakage Rate',
    definition: 'The percentage of defects (bugs) relative to development work items in the sprint.',
    calculation: '(Number of Defects / Development Work Items) × 100 (excludes Bug, Sub-task, Release, Spike types)',
    example: 'If there are 2 defects out of 18 development items, defect leakage rate is 11.1%.'
  },

  qualityRate: {
    title: 'Quality Rate',
    definition: 'The percentage of non-defect development work delivered, indicating development quality.',
    calculation: '((Development Work Items - Defects) / Development Work Items) × 100',
    example: 'If 16 out of 18 development items are not defects, quality rate is 88.9%.'
  },

  // Board Level Metrics
  averageVelocity: {
    title: 'Average Velocity',
    definition: 'The mean velocity across all completed sprints for this board.',
    calculation: 'Sum of all sprint velocities / Number of completed sprints',
    example: 'If 4 sprints had velocities of 20, 25, 22, 23, average velocity is 22.5.'
  },
  
  averageCompletionRate: {
    title: 'Average Completion Rate',
    definition: 'The mean completion rate across all completed sprints for this board.',
    calculation: 'Sum of all sprint completion rates / Number of completed sprints',
    example: 'If completion rates were 80%, 85%, 90%, average completion rate is 85%.'
  },
  
  totalStoryPoints: {
    title: 'Total Story Points',
    definition: 'The cumulative sum of all story points completed across all sprints on this board.',
    calculation: 'Sum of completed story points from all sprints',
    example: 'If 5 sprints completed 20, 25, 22, 23, 21 points, total is 111 points.'
  },
  
  predictedVelocity: {
    title: 'Predicted Velocity',
    definition: 'The forecasted velocity for the next sprint based on historical performance.',
    calculation: 'Weighted average of recent sprint velocities with trend analysis',
    example: 'Based on recent performance trending upward, predicted velocity might be 26.'
  },
  
  velocityTrend: {
    title: 'Velocity Trend',
    definition: 'The direction of velocity change over recent sprints (improving, declining, or steady).',
    calculation: 'Linear regression analysis of last 3-5 sprint velocities',
    example: 'If velocities increased from 20 → 22 → 25, trend is "up" (improving).'
  },
  
  averageCycleTime: {
    title: 'Average Cycle Time',
    definition: 'The mean cycle time across all completed sprints for this board.',
    calculation: 'Sum of all sprint average cycle times / Number of completed sprints',
    example: 'If sprints had cycle times of 5, 6, 4 days, average cycle time is 5 days.'
  },
  
  averageLeadTime: {
    title: 'Average Lead Time',
    definition: 'The mean lead time across all completed sprints for this board.',
    calculation: 'Sum of all sprint average lead times / Number of completed sprints',
    example: 'If sprints had lead times of 10, 12, 11 days, average lead time is 11 days.'
  },

  averageDefectLeakageRate: {
    title: 'Average Defect Leakage Rate',
    definition: 'The mean defect leakage rate across all completed sprints, measuring defects relative to development work.',
    calculation: 'Sum of all sprint defect leakage rates / Number of completed sprints',
    example: 'If sprints had defect rates of 5%, 8%, 3%, average defect leakage rate is 5.3%.'
  },

  averageQualityRate: {
    title: 'Average Quality Rate',
    definition: 'The mean quality rate across all completed sprints, measuring non-defect development work delivery.',
    calculation: 'Sum of all sprint quality rates / Number of completed sprints',
    example: 'If sprints had quality rates of 95%, 92%, 97%, average quality rate is 94.7%.'
  },

  // Dashboard Level Metrics
  totalBoards: {
    title: 'Total Boards',
    definition: 'The total number of Jira boards being tracked in the system.',
    calculation: 'Count of all active boards in the database',
    example: 'If there are 3 development teams with their own boards, total boards is 3.'
  },
  
  activeSprints: {
    title: 'Active Sprints',
    definition: 'The total number of sprints currently in progress across all boards.',
    calculation: 'Count of all sprints with status "active"',
    example: 'If 2 teams have ongoing sprints, active sprints count is 2.'
  },
  
  // Kanban-specific metrics
  wipViolations: {
    title: 'WIP Violations',
    definition: 'The number of columns that exceed their Work-in-Progress limits.',
    calculation: 'Count of columns where current issue count > WIP limit',
    example: 'If "In Progress" has 8 issues but limit is 5, that\'s 1 WIP violation.'
  },
  
  flowEfficiency: {
    title: 'Flow Efficiency',
    definition: 'The percentage of time issues spend in active work states vs waiting states.',
    calculation: '(Active Time / Total Time) × 100',
    example: 'If issues spend 6 days active out of 10 total days, flow efficiency is 60%.'
  },
  
  throughput: {
    title: 'Throughput',
    definition: 'The number of issues completed within a specific time period.',
    calculation: 'Count of issues completed in the time period',
    example: 'If 12 issues were completed in a 2-week sprint, throughput is 12.'
  },
  
  averageThroughput: {
    title: 'Average Throughput',
    definition: 'The average number of issues completed per board per time period.',
    calculation: 'Total completed issues / number of boards / time period',
    example: 'If 3 boards completed 24 issues total in a week, average throughput is 8/week per board.'
  },

  replanningRate: {
    title: 'Replanning Rate',
    definition: 'The percentage of issues that were moved between sprints during planning or execution.',
    calculation: '(Issues Moved to/from Sprint / Total Issues in Sprint) × 100',
    example: 'If 3 out of 15 issues were moved to/from the sprint, the replanning rate is 20%.'
  },

  averageChurnRate: {
    title: 'Average Churn Rate',
    definition: 'The average percentage of scope change across all sprints and boards.',
    calculation: 'Average of all churn rates from completed sprints across boards',
    example: 'If boards have churn rates of 10%, 20%, and 15%, the average churn rate is 15%.'
  }
}

export type MetricKey = keyof typeof METRIC_DEFINITIONS
