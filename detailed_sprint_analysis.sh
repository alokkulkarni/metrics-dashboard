#!/bin/bash

# JIRA API credentials from .env
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

echo "🔍 Detailed JIRA Sprint Analysis for Board 9"
echo "============================================="

board_id=9

echo "📊 Getting all sprints for board $board_id..."

# Get all sprints for this board
response=$(curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -H "Accept: application/json" \
    "$JIRA_BASE_URL/rest/agile/1.0/board/$board_id/sprint?maxResults=100")

echo "🔍 Total sprints found: $(echo "$response" | jq '.values | length')"
echo

echo "📋 All sprints (newest first by start date):"
echo "$response" | jq -r '.values | sort_by(.startDate // .endDate // "") | reverse | .[] | "ID: \(.id) | \(.name) | State: \(.state) | Start: \(.startDate // "N/A") | End: \(.endDate // "N/A")"'

echo
echo "🎯 Active sprints:"
active_sprints=$(echo "$response" | jq '[.values[] | select(.state == "active")]')
echo "$active_sprints" | jq -r '.[] | "ID: \(.id) | \(.name) | State: \(.state)"'
echo "Active count: $(echo "$active_sprints" | jq 'length')"

echo
echo "🎯 Last 6 closed sprints (by date, newest first):"
closed_sprints=$(echo "$response" | jq '
    [.values[] | select(.state == "closed")] |
    sort_by(.startDate // .endDate // "") |
    reverse |
    .[0:6]
')
echo "$closed_sprints" | jq -r '.[] | "ID: \(.id) | \(.name) | Start: \(.startDate // "N/A") | End: \(.endDate // "N/A")"'
echo "Recent closed count: $(echo "$closed_sprints" | jq 'length')"

echo
echo "🎯 Combined filtered sprints (what should be synced):"
filtered_sprints=$(echo "$active_sprints $closed_sprints" | jq -s 'add | unique_by(.id)')
echo "$filtered_sprints" | jq -r '.[] | "ID: \(.id) | \(.name) | State: \(.state)"'
echo "Total filtered count: $(echo "$filtered_sprints" | jq 'length')"

echo
echo "🔍 Compare with database for board $board_id:"
docker-compose exec -T postgres psql -U postgres -d metrics_dashboard -c "
SELECT 
  s.jira_id,
  s.name,
  s.state,
  s.start_date,
  s.end_date
FROM sprints s 
JOIN boards b ON s.board_id = b.id 
WHERE b.jira_board_id = $board_id
ORDER BY s.start_date DESC NULLS LAST;
"
