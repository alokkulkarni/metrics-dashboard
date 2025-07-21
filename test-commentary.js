#!/usr/bin/env node

// Simple test to check commentary generation
const testData = {
  sprint: {
    id: 724,
    name: "Group SIEM Sprint 51",
    state: "active",
    startDate: "2025-07-10T13:08:36.448Z",
    endDate: "2025-07-23T00:00:00.000Z"
  },
  metrics: {
    velocity: 0.00,
    churnRate: 0.00,
    completionRate: 40.00,
    scopeChangePercent: 0.00,
    averageCycleTime: 0.10,
    averageLeadTime: 0.10,
    totalStoryPoints: 2.00,
    completedStoryPoints: 0.00,
    totalIssues: 5,
    completedIssues: 2
  }
};

console.log('Testing commentary generation for sprint:', testData.sprint.name);
console.log('Sprint state:', testData.sprint.state);
console.log('Completion rate:', testData.metrics.completionRate + '%');

// Simple commentary logic test
let commentary = '';
let sentiment = 'neutral';

if (testData.metrics.completionRate < 50) {
  sentiment = 'warning';
  commentary = 'Sprint progress is below expectations. ';
} else if (testData.metrics.completionRate > 80) {
  sentiment = 'positive';
  commentary = 'Sprint is performing well. ';
} else {
  commentary = 'Sprint progress is on track. ';
}

if (testData.metrics.churnRate > 20) {
  commentary += 'High scope changes detected. ';
}

if (testData.metrics.velocity < 5) {
  commentary += 'Low velocity - consider reviewing team capacity. ';
}

commentary += 'Focus on completing remaining work items.';

console.log('Generated commentary:', commentary);
console.log('Sentiment:', sentiment);
