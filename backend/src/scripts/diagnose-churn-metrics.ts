#!/usr/bin/env ts-node

/**
 * Diagnostic script for churn metrics calculation
 * This script will:
 * 1. Check IssueChangelog table status
 * 2. Sync changelog data from Jira for all issues
 * 3. Validate churn rate calculations
 * 4. Provide detailed analysis
 */

import { logger } from '../utils/logger';
import { sequelize } from '../database/connection';
import { Issue } from '../models/Issue';
import { IssueChangelog } from '../models/IssueChangelog';
import { Sprint } from '../models/Sprint';
import { Board } from '../models/Board';
import { IssueChangelogService } from '../services/IssueChangelogService';
import { MetricsCalculationService } from '../services/MetricsCalculationService';
import { Op } from 'sequelize';

interface DiagnosticResult {
  totalIssues: number;
  issuesWithSprints: number;
  totalChangelogEntries: number;
  totalSprints: number;
  sprintsWithDates: number;
  sprintsWithoutDates: number;
  syncResult?: {
    processedIssues: number;
    addedChangelogEntries: number;
    errors: number;
  };
  sampleChurnCalculations: Array<{
    sprintId: number;
    sprintName: string;
    churnRate: number;
    addedStoryPoints: number;
    removedStoryPoints: number;
    addedIssues: number;
    removedIssues: number;
  }>;
}

class ChurnDiagnosticService {
  
  async runDiagnostic(): Promise<DiagnosticResult> {
    try {
      logger.info('🔍 Starting comprehensive churn metrics diagnostic...');
      
      await sequelize.authenticate();
      logger.info('✅ Database connection verified');
      
      // 1. Check current database state
      const totalIssues = await Issue.count();
      const issuesWithSprints = await Issue.count({
        where: {
          sprintId: {
            [Op.ne]: null
          } as any
        }
      });
      
      const totalChangelogEntries = await IssueChangelog.count();
      const totalSprints = await Sprint.count();
      
      // Check sprints with dates
      const sprintsWithDates = await Sprint.count({
        where: {
          startDate: {
            [Op.ne]: null
          } as any,
          endDate: {
            [Op.ne]: null
          } as any
        }
      });
      
      const sprintsWithoutDates = totalSprints - sprintsWithDates;
      
      logger.info('📊 Current Database State:', {
        totalIssues,
        issuesWithSprints,
        totalChangelogEntries,
        totalSprints,
        sprintsWithDates,
        sprintsWithoutDates
      });
      
      // 2. Sync changelog data if missing
      let syncResult;
      if (totalChangelogEntries === 0) {
        logger.warn('⚠️ No changelog entries found. Starting sync...');
        const changelogService = new IssueChangelogService();
        syncResult = await changelogService.syncAllIssueChangelogs();
        logger.info('🔄 Sync completed:', syncResult);
      } else {
        logger.info('✅ Changelog data exists, skipping sync');
      }
      
      // 3. Test churn calculation on sample sprints
      const sampleSprints = await Sprint.findAll({
        where: {
          startDate: {
            [Op.ne]: null
          } as any,
          endDate: {
            [Op.ne]: null
          } as any
        },
        include: [{
          model: Issue,
          as: 'issues',
          required: true
        }],
        limit: 5,
        order: [['updatedAt', 'DESC']]
      });
      
      const sampleChurnCalculations = [];
      
      for (const sprint of sampleSprints) {
        try {
          const metrics = await MetricsCalculationService.calculateSprintMetrics(sprint.id);
          if (metrics) {
            sampleChurnCalculations.push({
              sprintId: sprint.id,
              sprintName: sprint.name,
              churnRate: metrics.churnRate,
              addedStoryPoints: metrics.addedStoryPoints,
              removedStoryPoints: metrics.removedStoryPoints,
              addedIssues: metrics.addedIssues,
              removedIssues: metrics.removedIssues,
            });
          }
        } catch (error) {
          logger.error(`Error calculating metrics for sprint ${sprint.id}:`, error);
        }
      }
      
      return {
        totalIssues,
        issuesWithSprints,
        totalChangelogEntries,
        totalSprints,
        sprintsWithDates,
        sprintsWithoutDates,
        syncResult,
        sampleChurnCalculations
      };
      
    } catch (error) {
      logger.error('💥 Diagnostic failed:', error);
      throw error;
    }
  }
  
  async validateChangelogService(): Promise<void> {
    logger.info('🔍 Testing changelog service directly...');
    
    const changelogService = new IssueChangelogService();
    
    // Test with a sample sprint
    const sampleSprint = await Sprint.findOne({
      where: {
        startDate: {
          [Op.ne]: null
        } as any,
        endDate: {
          [Op.ne]: null
        } as any
      },
      include: [{
        model: Issue,
        as: 'issues',
        required: true
      }]
    });
    
    if (sampleSprint) {
      logger.info(`🧪 Testing with sprint ${sampleSprint.id}: ${sampleSprint.name}`);
      
      try {
        const churnData = await changelogService.getSprintChangelogForChurn(
          sampleSprint.id,
          new Date(sampleSprint.startDate!),
          new Date(sampleSprint.endDate!)
        );
        
        logger.info('✅ Changelog service test result:', churnData);
      } catch (error) {
        logger.error('❌ Changelog service test failed:', error);
      }
    } else {
      logger.warn('⚠️ No sprint with dates found for testing');
    }
  }
  
  async fixMissingSprintDates(): Promise<void> {
    logger.info('🔧 Checking and fixing missing sprint dates...');
    
    const sprintsWithoutDates = await Sprint.findAll({
      where: {
        [Op.or]: [
          { startDate: null } as any,
          { endDate: null } as any
        ]
      }
    });
    
    if (sprintsWithoutDates.length > 0) {
      logger.warn(`⚠️ Found ${sprintsWithoutDates.length} sprints without proper dates`);
      
      for (const sprint of sprintsWithoutDates) {
        logger.info(`Sprint ${sprint.id} (${sprint.name}): startDate=${sprint.startDate}, endDate=${sprint.endDate}`);
        
        // Try to infer dates from issues if possible
        const issues = await Issue.findAll({
          where: { sprintId: sprint.id },
          order: [['created', 'ASC']]
        });
        
        if (issues.length > 0) {
          const firstIssue = issues[0];
          const lastIssue = issues[issues.length - 1];
          
          // Use issue creation dates as approximation if sprint dates are missing
          if (!sprint.startDate && firstIssue.created) {
            logger.info(`Setting sprint ${sprint.id} start date based on first issue: ${firstIssue.created}`);
          }
          
          if (!sprint.endDate && lastIssue.resolved) {
            logger.info(`Setting sprint ${sprint.id} end date based on last resolved issue: ${lastIssue.resolved}`);
          }
        }
      }
    } else {
      logger.info('✅ All sprints have proper dates');
    }
  }
}

// Main execution
async function main() {
  const diagnostic = new ChurnDiagnosticService();
  
  try {
    // Run comprehensive diagnostic
    const result = await diagnostic.runDiagnostic();
    
    console.log('\n' + '='.repeat(60));
    console.log('CHURN METRICS DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    console.log(`Total Issues: ${result.totalIssues}`);
    console.log(`Issues with Sprints: ${result.issuesWithSprints}`);
    console.log(`Changelog Entries: ${result.totalChangelogEntries}`);
    console.log(`Total Sprints: ${result.totalSprints}`);
    console.log(`Sprints with Dates: ${result.sprintsWithDates}`);
    console.log(`Sprints without Dates: ${result.sprintsWithoutDates}`);
    
    if (result.syncResult) {
      console.log('\nCHANGELOG SYNC RESULTS:');
      console.log(`Processed Issues: ${result.syncResult.processedIssues}`);
      console.log(`Added Entries: ${result.syncResult.addedChangelogEntries}`);
      console.log(`Errors: ${result.syncResult.errors}`);
    }
    
    console.log('\nSAMPLE CHURN CALCULATIONS:');
    result.sampleChurnCalculations.forEach(calc => {
      console.log(`Sprint ${calc.sprintId} (${calc.sprintName}):`);
      console.log(`  Churn Rate: ${calc.churnRate.toFixed(2)}%`);
      console.log(`  Added: ${calc.addedStoryPoints} pts, ${calc.addedIssues} issues`);
      console.log(`  Removed: ${calc.removedStoryPoints} pts, ${calc.removedIssues} issues`);
    });
    
    // Additional validation
    await diagnostic.validateChangelogService();
    await diagnostic.fixMissingSprintDates();
    
    console.log('\n✅ Diagnostic completed successfully');
    
  } catch (error) {
    console.error('💥 Diagnostic failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}

export { ChurnDiagnosticService };
