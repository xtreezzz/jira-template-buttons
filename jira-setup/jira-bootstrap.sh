#!/bin/bash

set -e

echo "🚀 Starting Jira Bootstrap Process..."

wait_for_jira() {
    echo "⏳ Waiting for Jira to start..."
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:8080/status" > /dev/null 2>&1; then
            echo "✅ Jira is ready!"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts - Jira not ready yet..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo "❌ Jira failed to start within expected time"
    return 1
}

check_jira_setup() {
    echo "🔍 Checking if Jira is already configured..."
    local response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8080/secure/Dashboard.jspa" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo "✅ Jira is already configured and ready"
        return 0
    else
        echo "🔧 Jira needs initial setup"
        return 1
    fi
}

setup_instructions() {
    echo "📋 Manual Jira Setup Required:"
    echo "1. Open http://localhost:8080 in your browser"
    echo "2. Choose 'I'll set it up myself' for database"
    echo "3. Database connection is pre-configured via dbconfig.xml"
    echo "4. Use evaluation license (get from my.atlassian.com)"
    echo "5. Create admin user: admin/admin123"
    echo "6. Create sample project: 'Extension Testing' (key: EXT)"
    echo "7. Create sample task for testing extension buttons"
}

main() {
    wait_for_jira
    
    if check_jira_setup; then
        echo "🎉 Jira is ready for extension testing!"
        echo "📝 Access: http://localhost:8080"
    else
        setup_instructions
    fi
}

main "$@"
