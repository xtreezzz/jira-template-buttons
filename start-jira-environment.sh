#!/bin/bash

set -e

echo "🐳 Starting Jira Template Buttons Test Environment"
echo "=================================================="

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "🔨 Building Chrome extension..."
./build.sh

echo "🚀 Starting Docker services..."
docker-compose -f docker-compose.jira.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "📊 Service Status:"
docker-compose -f docker-compose.jira.yml ps

echo "🔧 Running Jira bootstrap..."
chmod +x jira-setup/jira-bootstrap.sh
./jira-setup/jira-bootstrap.sh

echo ""
echo "✅ Environment Started Successfully!"
echo ""
echo "🌐 Access Points:"
echo "- Jira Software: http://localhost:8080"
echo "- Test Page: http://localhost:8081/test.html"
echo "- Extension Files: http://localhost:8081/extension/"
echo "- PostgreSQL: localhost:5432 (user: jira, password: jira123, db: jiradb)"
echo ""
echo "📋 Next Steps:"
echo "1. Load the Chrome extension from the 'dist/' folder"
echo "2. Open Jira at http://localhost:8080"
echo "3. Complete initial setup if needed (admin/admin123)"
echo "4. Create a test project and task"
echo "5. Test the extension functionality"
echo ""
echo "🛑 To stop: docker-compose -f docker-compose.jira.yml down"
echo "🗑️  To reset: docker-compose -f docker-compose.jira.yml down -v"
