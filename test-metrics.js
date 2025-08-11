const express = require('express');
const path = require('path');

// Create a simple server to test metrics endpoint
const app = express();

app.get('/test-metrics/:boardId', async (req, res) => {
  try {
    const boardId = req.params.boardId;
    
    // Make a request to the backend API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`http://localhost:3001/api/boards/${boardId}/metrics`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('=== METRICS DATA ANALYSIS ===');
    console.log('Board ID:', boardId);
    console.log('Response success:', data.success);
    
    if (data.data && data.data.sprintMetrics) {
      console.log('\n=== SPRINT METRICS ===');
      console.log('Total sprints:', data.data.sprintMetrics.length);
      
      data.data.sprintMetrics.forEach((sprint, index) => {
        console.log(`\nSprint ${index + 1} (${sprint.sprintName}):`);
        console.log('  Status:', sprint.state);
        console.log('  Completion Rate:', sprint.completionRate);
        console.log('  Quality Rate:', sprint.qualityRate);
        console.log('  Churn Rate:', sprint.churnRate);
        console.log('  Velocity:', sprint.velocity);
        console.log('  Total Story Points:', sprint.totalStoryPoints);
        console.log('  Completed Story Points:', sprint.completedStoryPoints);
      });
    }
    
    if (data.data && data.data.overallMetrics) {
      console.log('\n=== OVERALL METRICS ===');
      console.log('Average Completion Rate:', data.data.overallMetrics.averageCompletionRate);
      console.log('Average Quality Rate:', data.data.overallMetrics.averageQualityRate);
      console.log('Average Churn Rate:', data.data.overallMetrics.averageChurnRate);
    }
    
    res.json({
      analysis: 'Check console for detailed metrics analysis',
      data: data
    });
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Usage: http://localhost:3002/test-metrics/{boardId}');
});
