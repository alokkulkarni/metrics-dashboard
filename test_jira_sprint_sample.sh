#!/bin/bash

# JIRA API credentials from .env
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

echo "🔍 Testing JIRA Sprint Count (First 5 Boards Only) - Same Filtering Logic as Sync Service"
echo "========================================================================================="

# Get first 5 board IDs from database
echo "📊 Getting first 5 boards from database..."
BOARD_IDS=$(docker-compose exec -T postgres psql -U postgres -d metrics_dashboard -t -c "SELECT jira_board_id FROM boards ORDER BY jira_board_id LIMIT 5;" | tr -d ' ' | grep -v '^$')

total_boards=0
total_sprints_found=0
total_sprints_filtered=0
total_active_sprints=0
total_closed_sprints=0

echo "🔄 Processing boards and applying sync filtering logic..."
echo

for board_id in $BOARD_IDS; do
    if [[ "$board_id" =~ ^[0-9]+$ ]]; then
        ((total_boards++))
        
        echo "Processing Board $board_id..."
        
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
                echo "❌ Failed to fetch sprints for board $board_id"
                break
            fi
            
            # Check if response is valid JSON and has values
            if ! echo "$response" | jq . > /dev/null 2>&1; then
                echo "❌ Invalid JSON response for board $board_id"
                break
            fi
            
            # Check for error in response
            error_msg=$(echo "$response" | jq -r '.errorMessages[0] // empty')
            if [ ! -z "$error_msg" ]; then
                echo "❌ JIRA API Error for board $board_id: $error_msg"
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
        
        echo "  📈 Board $board_id: $sprints_found total, $active_count active, $closed_count recent closed, $filtered_count to sync"
    fi
done

echo
echo "📊 RESULTS SUMMARY (First 5 Boards)"
echo "====================================="
echo "🏢 Boards Processed: $total_boards"
echo "🔍 Total Sprints Found in JIRA: $total_sprints_found"
echo "🎯 Total Sprints After Filtering: $total_sprints_filtered"
echo "   └─ Active Sprints: $total_active_sprints"
echo "   └─ Recent Closed Sprints: $total_closed_sprints"
echo

# Compare with database for these boards
echo "🔍 DATABASE COMPARISON (Same 5 Boards)"
echo "======================================"
db_sprints_sample=$(docker-compose exec -T postgres psql -U postgres -d metrics_dashboard -t -c "SELECT COUNT(*) FROM sprints s JOIN boards b ON s.board_id = b.id WHERE b.jira_board_id IN (9,11,13,15,17);" | tr -d ' ')

echo "📊 Database Sprints (for these 5 boards): $db_sprints_sample"
echo

echo "🎯 SAMPLE COMPARISON"
echo "==================="
if [ "$total_sprints_filtered" -eq "$db_sprints_sample" ]; then
    echo "✅ MATCH: JIRA filtered count ($total_sprints_filtered) equals database count ($db_sprints_sample) for sample boards"
else
    echo "❌ MISMATCH: JIRA filtered count ($total_sprints_filtered) vs database count ($db_sprints_sample) for sample boards"
    echo "   Difference: $((total_sprints_filtered - db_sprints_sample))"
fi

echo
echo "💡 This is a test run with the first 5 boards. If results look good, run the full script."
