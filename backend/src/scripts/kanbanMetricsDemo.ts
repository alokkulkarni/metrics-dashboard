import { KanbanMetricsCalculationService } from '../services/KanbanMetricsCalculationService';
import { KanbanMetricsDisplayService } from '../services/KanbanMetricsDisplayService';
import { KanbanBoard } from '../models/KanbanBoard';
import { logger } from '../utils/logger';

/**
 * 🎯 Demo script to showcase Kanban metrics calculation and display
 */
export class KanbanMetricsDemo {

  /**
   * 🚀 Run a comprehensive demo of the Kanban metrics system
   */
  public static async runDemo(): Promise<void> {
    try {
      logger.info('🎉 Starting Kanban Metrics Demo');
      
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  KANBAN METRICS DEMO                        ║
║              Sprint-Aligned Calculations                    ║
╚══════════════════════════════════════════════════════════════╝
      `);

      // Step 1: Get all Kanban boards
      await this.step1_ShowAllKanbanBoards();

      // Step 2: Calculate metrics for all boards
      await this.step2_CalculateMetricsForAllBoards();

      // Step 3: Display metrics summary
      await this.step3_ShowMetricsSummary();

      // Step 4: Show detailed metrics for first board
      await this.step4_ShowDetailedMetricsForFirstBoard();

      // Step 5: Show metrics history
      await this.step5_ShowMetricsHistory();

      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DEMO COMPLETED! ✅                       ║
║                                                              ║
║  The Kanban metrics system is now fully operational and     ║
║  synchronized with active sprint periods. All metrics are   ║
║  calculated using two-week periods aligned with sprints.    ║
╚══════════════════════════════════════════════════════════════╝
      `);

    } catch (error) {
      logger.error(`❌ Demo error: ${error}`);
      throw error;
    }
  }

  /**
   * 📋 Step 1: Show all available Kanban boards
   */
  private static async step1_ShowAllKanbanBoards(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     STEP 1: KANBAN BOARDS                   ║
╚══════════════════════════════════════════════════════════════╝
    `);

    try {
      const boards = await KanbanBoard.findAll();
      
      if (boards.length === 0) {
        console.log('⚠️  No Kanban boards found in the system');
        return;
      }

      console.log(`📊 Found ${boards.length} Kanban board(s):`);
      
      boards.forEach((board, index) => {
        console.log(`   ${index + 1}. ${board.name} (ID: ${board.id}) - Project: ${board.projectId}`);
      });

    } catch (error) {
      logger.error(`❌ Error in step 1: ${error}`);
    }
  }

  /**
   * 🔄 Step 2: Calculate metrics for all boards
   */
  private static async step2_CalculateMetricsForAllBoards(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                STEP 2: CALCULATE METRICS                    ║
╚══════════════════════════════════════════════════════════════╝
    `);

    try {
      console.log('🔄 Calculating metrics for all Kanban boards...');
      
      const results = await KanbanMetricsCalculationService.calculateMetricsForAllBoards();
      
      console.log(`
✅ Metrics Calculation Results:
   📊 Successfully calculated: ${results.calculatedBoards.length} boards
   ⚠️  Skipped (no issues): ${results.skippedBoards.length} boards
   📈 Total processed: ${results.calculatedBoards.length + results.skippedBoards.length} boards
      `);

      if (results.calculatedBoards.length > 0) {
        console.log(`   🎯 Calculated boards: [${results.calculatedBoards.join(', ')}]`);
      }

      if (results.skippedBoards.length > 0) {
        console.log(`   ⚠️  Skipped boards: [${results.skippedBoards.join(', ')}]`);
      }

    } catch (error) {
      logger.error(`❌ Error in step 2: ${error}`);
    }
  }

  /**
   * 📊 Step 3: Show metrics summary
   */
  private static async step3_ShowMetricsSummary(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   STEP 3: METRICS SUMMARY                   ║
╚══════════════════════════════════════════════════════════════╝
    `);

    try {
      const summary = await KanbanMetricsDisplayService.getKanbanMetricsSummary();
      
      if (!summary) {
        console.log('⚠️  No metrics summary available');
        return;
      }

      console.log(`
📈 KANBAN METRICS SUMMARY:
   🏢 Total Boards: ${summary.totalBoards}
   🎯 Sprint-Aligned Boards: ${summary.sprintAlignedBoards}
   📋 Total Issues: ${summary.totalIssues}
   ⏱️  Average Cycle Time: ${summary.averageCycleTime?.toFixed(1) || 'N/A'} days
   📅 Average Lead Time: ${summary.averageLeadTime?.toFixed(1) || 'N/A'} days
   🚧 Total WIP Violations: ${summary.totalWipViolations}
   💫 Average Flow Efficiency: ${summary.averageFlowEfficiency?.toFixed(1) || 'N/A'}%
   🚀 Total Sprint Throughput: ${summary.totalSprintThroughput}
      `);

      console.log(`
📋 Boards with Metrics:
      `);
      
      summary.boardsWithMetrics.forEach((board: any, index: number) => {
        const sprintStatus = board.isSprintAligned ? '🎯' : '📅';
        console.log(`   ${index + 1}. ${sprintStatus} ${board.boardName} (ID: ${board.boardId}) - Last: ${new Date(board.lastCalculated).toLocaleDateString()}`);
      });

    } catch (error) {
      logger.error(`❌ Error in step 3: ${error}`);
    }
  }

  /**
   * 🎯 Step 4: Show detailed metrics for the first board
   */
  private static async step4_ShowDetailedMetricsForFirstBoard(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                STEP 4: DETAILED METRICS                     ║
╚══════════════════════════════════════════════════════════════╝
    `);

    try {
      const boards = await KanbanBoard.findAll();
      
      if (boards.length === 0) {
        console.log('⚠️  No boards available for detailed metrics');
        return;
      }

      const firstBoard = boards[0];
      console.log(`🎯 Showing detailed metrics for: ${firstBoard.name} (ID: ${firstBoard.id})`);
      
      const metrics = await KanbanMetricsDisplayService.getKanbanBoardMetrics(firstBoard.id);
      
      if (!metrics) {
        console.log(`⚠️  No metrics found for board ${firstBoard.id}`);
        return;
      }

      // Display the formatted metrics
      const formattedMetrics = KanbanMetricsDisplayService.formatMetricsForDisplay(metrics);
      console.log(formattedMetrics);

      // Show column details
      if (metrics.columnMetrics && metrics.columnMetrics.length > 0) {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      COLUMN DETAILS                         ║
╚══════════════════════════════════════════════════════════════╝
        `);
        
        metrics.columnMetrics.forEach((column: any) => {
          const wipStatus = column.wipViolation ? '🚨' : '✅';
          console.log(`   ${wipStatus} ${column.columnName}: ${column.issueCount} issues (Avg age: ${column.averageAge}d)`);
        });
      }

    } catch (error) {
      logger.error(`❌ Error in step 4: ${error}`);
    }
  }

  /**
   * 📜 Step 5: Show metrics history
   */
  private static async step5_ShowMetricsHistory(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  STEP 5: METRICS HISTORY                    ║
╚══════════════════════════════════════════════════════════════╝
    `);

    try {
      const boards = await KanbanBoard.findAll();
      
      if (boards.length === 0) {
        console.log('⚠️  No boards available for metrics history');
        return;
      }

      const firstBoard = boards[0];
      console.log(`📜 Showing metrics history for: ${firstBoard.name} (ID: ${firstBoard.id})`);
      
      const history = await KanbanMetricsDisplayService.getMetricsHistory(firstBoard.id, 5);
      
      if (history.length === 0) {
        console.log(`⚠️  No metrics history found for board ${firstBoard.id}`);
        return;
      }

      console.log(`
📊 Found ${history.length} historical metrics entries:
      `);
      
      history.forEach((entry, index) => {
        console.log(`   ${index + 1}. 📊 ${entry.calculatedAt.toLocaleString()} - ${entry.statusMetrics.totalIssues} issues`);
      });

    } catch (error) {
      logger.error(`❌ Error in step 5: ${error}`);
    }
  }

  /**
   * 🧪 Run a quick test of individual board metrics
   */
  public static async quickTest(boardId: number): Promise<void> {
    try {
      console.log(`🧪 Quick test for Kanban board ${boardId}`);
      
      // Calculate metrics
      console.log('🔄 Calculating metrics...');
      const metrics = await KanbanMetricsCalculationService.calculateMetricsForBoard(boardId);
      
      if (!metrics) {
        console.log(`❌ Could not calculate metrics for board ${boardId}`);
        return;
      }

      console.log(`✅ Metrics calculated successfully!`);
      
      // Display metrics
      const displayMetrics = await KanbanMetricsDisplayService.getKanbanBoardMetrics(boardId);
      
      if (displayMetrics) {
        const formatted = KanbanMetricsDisplayService.formatMetricsForDisplay(displayMetrics);
        console.log(formatted);
      }

    } catch (error) {
      logger.error(`❌ Quick test error: ${error}`);
    }
  }
}

export default KanbanMetricsDemo;
