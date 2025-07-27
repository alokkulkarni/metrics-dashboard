import { KanbanIssue } from '../models/KanbanIssue';
import { QueryTypes } from 'sequelize';

async function testKanbanQuery() {
    try {
        console.log('Testing Kanban issue query for board 95...');
        
        // Test raw query first
        const issues = await KanbanIssue.findAll({
            where: { kanbanBoardId: 95 },
            limit: 5
        });
        
        console.log(`Found ${issues.length} issues for board 95`);
        
        if (issues.length > 0) {
            console.log('Sample issue:', {
                id: issues[0].id,
                key: issues[0].key,
                kanbanBoardId: issues[0].kanbanBoardId
            });
        }
        
        // Test with raw SQL to compare
        const rawIssues = await KanbanIssue.sequelize?.query(
            'SELECT id, key, kanban_board_id FROM kanban_issues WHERE kanban_board_id = 95 LIMIT 5',
            { type: QueryTypes.SELECT }
        );
        
        console.log(`Raw query found ${rawIssues?.length || 0} issues`);
        if (rawIssues && rawIssues.length > 0) {
            console.log('Sample raw issue:', rawIssues[0]);
        }
        
    } catch (error) {
        console.error('Error testing query:', error);
    }
}

export { testKanbanQuery };
