#!/bin/bash

# JIRA API credentials from .env
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

echo "🔍 Testing JIRA Sprint Count with Same Filtering Logic as Sync Service"
echo "=================================================================="

# Get all board IDs from database
echo "📊 Getting boards from database..."
BOARD_IDS=$(docker-compose exec -T postgres psql -U postgres -d metrics_dashboard -t -c "SELECT jira_board_id FROM boards ORDER BY jira_board_id;" | tr -d ' ' | grep -v '^$')

total_boards=0
total_sprints_found=0
total_sprints_filtered=0
total_active_sprints=0
total_closed_sprints=0

# Create temp file for detailed logging
temp_file="/tmp/jira_sprint_test.log"
> "$temp_file"

echo "🔄 Processing boards and applying sync filtering logic..."
echo

for board_id in $BOARD_IDS; do
    if [[ "$board_id" =~ ^[0-9]+$ ]]; then
        ((total_boards++))
        
        echo "Processing Board $board_id..." | tee -a "$temp_file"
        
        # Get all sprints for this board (paginated)
        all_sprints_json="[]"
        start_at=0
        max_results=50
        is_last=false
        
        while [ "$is_last" = "false" ]; do
            response=$(curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
                -H "Accept: application/json" \
                "$JIRA_BASE_URL/rest/agile/1.0/board/$board_id/sprint?startAt=$start_at&maxResults=$max_results")
            
            if [ $? -ne 0 ]; then
                echo "❌ Failed to fetch sprints for board $board_id" | tee -a "$temp_file"
                break
            fi
            
            # Check if response is valid JSON
            if ! echo "$response" | jq . > /dev/null 2>&1; then
                echo "❌ Invalid JSON response for board $board_id" | tee -a "$temp_file"
                break
            fi
            
            # Extract sprints from this page
            page_sprints=$(echo "$response" | jq '.values // []')
            
            # Merge with all sprints
            all_sprints_json=$(echo "$all_sprints_json $page_sprints" | jq -s 'add')
            
            # Check if this is the last page
            is_last=$(echo "$response" | jq -r '.isLast // true')
            page_count=$(echo "$page_sprints" | jq 'length')
            
            if [ "$page_count" -lt "$max_results" ]; then
                is_last="true"
            fi
            
            start_at=$((start_at + max_results))
        done
        
        # Count total sprints found
        sprints_found=$(echo "$all_sprints_json" | jq 'length')
        total_sprints_found=$((total_sprints_found + sprints_found))
        
        # Apply the same filtering logic as sync service
        # 1. Sort by startDate or endDate (newest first)
        # 2. Filter to active sprints
        # 3. Filter to last 6 closed sprints
        # 4. Combine them
        
        active_sprints=$(echo "$all_sprints_json" | jq '[.[] | select(.state == "active")]')
        active_count=$(echo "$active_sprints" | jq 'length')
        
        closed_sprints=$(echo "$all_sprints_json" | jq '
            [.[] | select(.state == "closed")] |
            sort_by(.startDate // .endDate // "") |
            reverse |
            .[0:6]
        ')
        closed_count=$(echo "$closed_sprints" | jq 'length')
        
        # Combine active and closed sprints (remove duplicates by id)
        filtered_sprints=$(echo "$active_sprints $closed_sprints" | jq -s 'add | unique_by(.id)')
        filtered_count=$(echo "$filtered_sprints" | jq 'length')
        
        total_sprints_filtered=$((total_sprints_filtered + filtered_count))
        total_active_sprints=$((total_active_sprints + active_count))
        total_closed_sprints=$((total_closed_sprints + closed_count))
        
        echo "  📈 Board $board_id: $sprints_found total, $active_count active, $closed_count recent closed, $filtered_count to sync" | tee -a "$temp_file"
        
        # Progress indicator
        if [ $((total_boards % 10)) -eq 0 ]; then
            echo "✅ Processed $total_boards boards so far..."
        fi
    fi
done

echo
echo "📊 RESULTS SUMMARY"
echo "=================="
echo "🏢 Total Boards Processed: $total_boards"
echo "🔍 Total Sprints Found in JIRA: $total_sprints_found"
echo "🎯 Total Sprints After Filtering: $total_sprints_filtered"
echo "   └─ Active Sprints: $total_active_sprints"
echo "   └─ Recent Closed Sprints: $total_closed_sprints"
echo

# Compare with database
echo "🔍 DATABASE COMPARISON"
echo "====================="
db_boards=$(docker-compose exec -T postgres psql -U postgres -d metrics_dashboard -t -c "SELECT COUNT(*) FROM boards;" | tr -d ' ')
db_sprints=$(docker-compose exec -T postgres psql -U postgres -d metrics_dashboard -t -c "SELECT COUNT(*) FROM sprints;" | tr -d ' ')

echo "📊 Database Boards: $db_boards"
echo "📊 Database Sprints: $db_sprints"
echo

echo "🎯 COMPARISON RESULTS"
echo "===================="
if [ "$total_sprints_filtered" -eq "$db_sprints" ]; then
    echo "✅ MATCH: JIRA filtered count ($total_sprints_filtered) equals database count ($db_sprints)"
else
    echo "❌ MISMATCH: JIRA filtered count ($total_sprints_filtered) vs database count ($db_sprints)"
    echo "   Difference: $((total_sprints_filtered - db_sprints))"
fi

if [ "$total_boards" -eq "$db_boards" ]; then
    echo "✅ MATCH: Board counts match ($total_boards)"
else
    echo "❌ MISMATCH: Board counts differ (JIRA: $total_boards, DB: $db_boards)"
fi

echo
echo "📝 Detailed log saved to: $temp_file"
echo "💡 This script uses the exact same filtering logic as the sync service:"
echo "   - Active sprints + last 6 closed sprints per board"
echo "   - Sorted by date (newest first)"
echo "   - Deduplicated by sprint ID"
