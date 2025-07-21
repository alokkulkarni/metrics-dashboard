import { Sprint } from '../models/Sprint';

export interface SprintCommentaryData {
  commentary: string;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'warning' | 'negative';
}

export class SprintCommentaryService {
  
  /**
   * Generate intelligent commentary for a sprint based on its metrics
   */
  generateSprintCommentary(
    sprint: Sprint,
    metrics: {
      velocity: number | string;
      churnRate: number | string;
      completionRate: number | string;
      scopeChangePercent: number | string;
      averageCycleTime?: number | string;
      averageLeadTime?: number | string;
      totalStoryPoints: number | string;
      completedStoryPoints: number | string;
      totalIssues: number;
      completedIssues: number;
      defectLeakageRate: number | string;
      qualityRate: number | string;
      totalDefects: number;
      completedDefects: number;
    }
  ): SprintCommentaryData {
    // Convert string values to numbers (Sequelize sometimes returns numerics as strings)
    const numericMetrics = {
      velocity: typeof metrics.velocity === 'string' ? parseFloat(metrics.velocity) : metrics.velocity,
      churnRate: typeof metrics.churnRate === 'string' ? parseFloat(metrics.churnRate) : metrics.churnRate,
      completionRate: typeof metrics.completionRate === 'string' ? parseFloat(metrics.completionRate) : metrics.completionRate,
      scopeChangePercent: typeof metrics.scopeChangePercent === 'string' ? parseFloat(metrics.scopeChangePercent) : metrics.scopeChangePercent,
      averageCycleTime: metrics.averageCycleTime ? (typeof metrics.averageCycleTime === 'string' ? parseFloat(metrics.averageCycleTime) : metrics.averageCycleTime) : undefined,
      averageLeadTime: metrics.averageLeadTime ? (typeof metrics.averageLeadTime === 'string' ? parseFloat(metrics.averageLeadTime) : metrics.averageLeadTime) : undefined,
      totalStoryPoints: typeof metrics.totalStoryPoints === 'string' ? parseFloat(metrics.totalStoryPoints) : metrics.totalStoryPoints,
      completedStoryPoints: typeof metrics.completedStoryPoints === 'string' ? parseFloat(metrics.completedStoryPoints) : metrics.completedStoryPoints,
      totalIssues: metrics.totalIssues,
      completedIssues: metrics.completedIssues,
      defectLeakageRate: typeof metrics.defectLeakageRate === 'string' ? parseFloat(metrics.defectLeakageRate) : metrics.defectLeakageRate,
      qualityRate: typeof metrics.qualityRate === 'string' ? parseFloat(metrics.qualityRate) : metrics.qualityRate,
      totalDefects: metrics.totalDefects,
      completedDefects: metrics.completedDefects,
    };
    const recommendations: string[] = [];
    let sentiment: 'positive' | 'neutral' | 'warning' | 'negative' = 'neutral';
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    // Calculate sprint progress (for active sprints)
    const isActive = sprint.state === 'active';
    const isCompleted = sprint.state === 'closed';
    const now = new Date();
    const sprintStart = sprint.startDate ? new Date(sprint.startDate) : now;
    const sprintEnd = sprint.endDate ? new Date(sprint.endDate) : now;
    const sprintDuration = sprintEnd.getTime() - sprintStart.getTime();
    const timeElapsed = now.getTime() - sprintStart.getTime();
    const progressPercent = isActive && sprintDuration > 0 ? Math.min(100, Math.max(0, (timeElapsed / sprintDuration) * 100)) : 100;
    
    // Analysis factors
    const analysisFactors = {
      velocity: this.analyzeVelocity(numericMetrics.velocity, numericMetrics.totalStoryPoints),
      completion: this.analyzeCompletionRate(numericMetrics.completionRate, progressPercent, isActive),
      churn: this.analyzeChurnRate(numericMetrics.churnRate),
      scope: this.analyzeScopeChange(numericMetrics.scopeChangePercent),
      cycleTime: this.analyzeCycleTime(numericMetrics.averageCycleTime),
      leadTime: this.analyzeLeadTime(numericMetrics.averageLeadTime),
      quality: this.analyzeQuality(numericMetrics.qualityRate, numericMetrics.defectLeakageRate, numericMetrics.totalDefects)
    };

    // Generate recommendations based on analysis
    if (analysisFactors.churn.severity >= 3) {
      recommendations.push("🔄 High churn detected - Review sprint planning and scope management");
      priority = priority === 'low' ? 'high' : priority;
    }
    
    if (analysisFactors.completion.severity >= 3 && isActive) {
      recommendations.push("⚡ Sprint may be at risk - Consider scope adjustment or additional resources");
      priority = priority === 'low' ? 'high' : priority;
    }
    
    if (analysisFactors.scope.severity >= 2) {
      recommendations.push("📋 Scope changes detected - Improve initial sprint planning and stakeholder alignment");
      priority = priority === 'low' ? 'medium' : priority;
    }
    
    if (analysisFactors.cycleTime.severity >= 3) {
      recommendations.push("🚀 Long cycle times - Review development process and remove blockers");
      priority = priority === 'low' ? 'medium' : priority;
    }
    
    if (analysisFactors.quality.severity >= 3) {
      recommendations.push("🐛 High defect rate detected - Strengthen code review and testing practices");
      priority = priority === 'low' ? 'high' : priority;
    } else if (analysisFactors.quality.severity >= 2) {
      recommendations.push("🔍 Quality concerns - Consider additional testing and quality gates");
      priority = priority === 'low' ? 'medium' : priority;
    }
    
    if (analysisFactors.velocity.severity === 0 && analysisFactors.completion.severity <= 1) {
      recommendations.push("✨ Great performance! Continue current practices");
      sentiment = 'positive';
    }

    // Determine overall sentiment
    const avgSeverity = Object.values(analysisFactors).reduce((sum, factor) => sum + factor.severity, 0) / Object.keys(analysisFactors).length;
    
    if (avgSeverity >= 3) {
      sentiment = 'negative';
      priority = 'critical';
    } else if (avgSeverity >= 2) {
      sentiment = 'warning';
      priority = priority === 'low' ? 'high' : priority;
    } else if (avgSeverity <= 0.5) {
      sentiment = 'positive';
    }

    // Generate commentary text
    const commentary = this.generateCommentaryText(sprint, numericMetrics, analysisFactors, progressPercent, isActive, isCompleted);

    return {
      commentary,
      recommendations,
      priority,
      sentiment
    };
  }

  private analyzeVelocity(velocity: number, totalStoryPoints: number) {
    // Good velocity: close to planned story points, moderate severity for deviations
    const efficiency = totalStoryPoints > 0 ? (velocity / totalStoryPoints) * 100 : 0;
    
    if (efficiency >= 95) return { severity: 0, note: "Excellent story point velocity" };
    if (efficiency >= 80) return { severity: 1, note: "Good story point velocity" };
    if (efficiency >= 65) return { severity: 2, note: "Moderate story point velocity" };
    if (efficiency >= 45) return { severity: 3, note: "Low story point velocity" };
    return { severity: 4, note: "Very low story point velocity" };
  }

  private analyzeCompletionRate(completionRate: number, progressPercent: number, isActive: boolean) {
    if (!isActive) {
      // For completed sprints, focus on final story point completion rate
      if (completionRate >= 90) return { severity: 0, note: "Excellent story point delivery" };
      if (completionRate >= 75) return { severity: 1, note: "Good story point delivery" };
      if (completionRate >= 60) return { severity: 2, note: "Moderate story point delivery" };
      if (completionRate >= 40) return { severity: 3, note: "Poor story point delivery" };
      return { severity: 4, note: "Very poor story point delivery" };
    }
    
    // For active sprints, compare story point completion rate to time progress
    const expectedCompletion = progressPercent;
    const actualCompletion = completionRate;
    const gap = expectedCompletion - actualCompletion;
    
    if (gap <= 5) return { severity: 0, note: "On track with story points" };
    if (gap <= 15) return { severity: 1, note: "Slightly behind on story points" };
    if (gap <= 30) return { severity: 2, note: "Behind schedule on story points" };
    return { severity: 3, note: "Significantly behind on story points" };
  }

  private analyzeChurnRate(churnRate: number) {
    if (churnRate <= 5) return { severity: 0, note: "Excellent stability" };
    if (churnRate <= 15) return { severity: 1, note: "Good stability" };
    if (churnRate <= 25) return { severity: 2, note: "Moderate churn" };
    if (churnRate <= 40) return { severity: 3, note: "High churn" };
    return { severity: 4, note: "Excessive churn" };
  }

  private analyzeScopeChange(scopeChangePercent: number) {
    if (scopeChangePercent <= 5) return { severity: 0, note: "Stable scope" };
    if (scopeChangePercent <= 15) return { severity: 1, note: "Minor scope changes" };
    if (scopeChangePercent <= 30) return { severity: 2, note: "Moderate scope changes" };
    return { severity: 3, note: "Significant scope changes" };
  }

  private analyzeCycleTime(averageCycleTime?: number) {
    if (!averageCycleTime) return { severity: 0, note: "Cycle time not available" };
    
    if (averageCycleTime <= 2) return { severity: 0, note: "Fast cycle time" };
    if (averageCycleTime <= 5) return { severity: 1, note: "Good cycle time" };
    if (averageCycleTime <= 10) return { severity: 2, note: "Moderate cycle time" };
    return { severity: 3, note: "Slow cycle time" };
  }

  private analyzeLeadTime(averageLeadTime?: number) {
    if (!averageLeadTime) return { severity: 0, note: "Lead time not available" };
    
    if (averageLeadTime <= 5) return { severity: 0, note: "Fast lead time" };
    if (averageLeadTime <= 10) return { severity: 1, note: "Good lead time" };
    if (averageLeadTime <= 20) return { severity: 2, note: "Moderate lead time" };
    return { severity: 3, note: "Slow lead time" };
  }

  private analyzeQuality(qualityRate: number, defectLeakageRate: number, totalDefects: number) {
    // Analyze based on quality rate (higher is better)
    if (qualityRate >= 95) return { severity: 0, note: "Excellent quality - very few defects" };
    if (qualityRate >= 90) return { severity: 1, note: "Good quality - minimal defects" };
    if (qualityRate >= 80) return { severity: 2, note: "Moderate quality - some defects present" };
    if (qualityRate >= 70) return { severity: 3, note: "Poor quality - significant defects" };
    return { severity: 4, note: "Critical quality issues - high defect rate" };
  }

  private generateCommentaryText(
    sprint: Sprint,
    metrics: any,
    analysisFactors: any,
    progressPercent: number,
    isActive: boolean,
    isCompleted: boolean
  ): string {
    const parts: string[] = [];
    
    // Sprint status
    if (isActive) {
      parts.push(`Sprint is ${Math.round(progressPercent)}% complete by time.`);
    } else if (isCompleted) {
      parts.push(`Sprint completed with ${Math.round(metrics.completionRate)}% of story points delivered (${metrics.completedStoryPoints}/${metrics.totalStoryPoints} points).`);
    }
    
    // Performance summary
    if (analysisFactors.velocity.severity <= 1 && analysisFactors.completion.severity <= 1) {
      parts.push("🎯 Performance is strong with good velocity and story point completion rates.");
    } else if (analysisFactors.velocity.severity >= 3 || analysisFactors.completion.severity >= 3) {
      parts.push("⚠️ Performance concerns detected in velocity or story point completion metrics.");
    } else {
      parts.push("📊 Performance is moderate with room for improvement in story point delivery.");
    }
    
    // Specific insights
    if (metrics.churnRate > 20) {
      parts.push(`Churn rate of ${Math.round(metrics.churnRate)}% suggests scope instability.`);
    }
    
    // Story points vs issue completion analysis
    const issueCompletionRate = metrics.totalIssues > 0 ? (metrics.completedIssues / metrics.totalIssues) * 100 : 0;
    const storyPointCompletionRate = metrics.completionRate;
    const completionGap = Math.abs(storyPointCompletionRate - issueCompletionRate);
    
    if (completionGap > 15) {
      if (storyPointCompletionRate > issueCompletionRate) {
        parts.push(`Team focused on high-value stories (${Math.round(storyPointCompletionRate)}% story points vs ${Math.round(issueCompletionRate)}% issues completed).`);
      } else {
        parts.push(`Team completed many small tasks but fewer story points (${Math.round(issueCompletionRate)}% issues vs ${Math.round(storyPointCompletionRate)}% story points).`);
      }
    }
    
    if (metrics.scopeChangePercent > 15) {
      parts.push(`Scope changed by ${Math.round(metrics.scopeChangePercent)}% during sprint.`);
    }
    
    if (metrics.averageCycleTime && metrics.averageCycleTime > 7) {
      parts.push(`Average cycle time of ${Math.round(metrics.averageCycleTime)} days may indicate process bottlenecks.`);
    }
    
    // Quality insights
    if (metrics.totalDefects > 0) {
      parts.push(`Quality metrics: ${metrics.totalDefects} defects found (${Math.round(metrics.defectLeakageRate)}% of development work), resulting in ${Math.round(metrics.qualityRate)}% quality rate.`);
      
      if (metrics.defectLeakageRate > 20) {
        parts.push("High defect rate suggests need for improved testing and code review processes.");
      } else if (metrics.defectLeakageRate > 10) {
        parts.push("Moderate defect rate - consider strengthening quality gates.");
      } else if (metrics.defectLeakageRate <= 5) {
        parts.push("Excellent quality with minimal defects - good testing practices in place.");
      }
    } else {
      parts.push("🏆 Zero defects in this sprint - excellent quality delivery!");
    }
    
    // Actionable insights for active sprints
    if (isActive) {
      if (metrics.completionRate < progressPercent - 20) {
        parts.push("Consider adjusting scope or increasing focus to meet story point commitments.");
      } else if (metrics.completionRate > progressPercent + 10) {
        parts.push("Excellent progress - team is ahead of schedule on story point delivery.");
      }
      
      // Add velocity trend insight for active sprints
      if (metrics.velocity > 0 && metrics.totalStoryPoints > 0) {
        const projectedCompletion = (metrics.velocity / metrics.totalStoryPoints) * 100;
        if (projectedCompletion > 100) {
          parts.push("Current velocity suggests the team may exceed sprint goals.");
        } else if (projectedCompletion < 70) {
          parts.push("Current velocity indicates potential risk of missing sprint goals.");
        }
      }
    }
    
    return parts.join(" ");
  }
}

export default new SprintCommentaryService();
