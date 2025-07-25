# Docker Jira Environment Setup

This document describes how to set up and use the complete Jira + PostgreSQL Docker environment for testing the Jira Template Buttons extension.

## Quick Start

```bash
# Start the complete environment
./start-jira-environment.sh

# Stop the environment
docker-compose -f docker-compose.jira.yml down

# Reset everything (removes data)
docker-compose -f docker-compose.jira.yml down -v
```

## Status: ✅ Working Docker Environment

The Docker environment is fully functional with:
- ✅ Jira Software 10.4.1 running on http://localhost:8080
- ✅ PostgreSQL 13 database with proper configuration
- ✅ Nginx serving extension files and test pages
- ✅ All containers healthy and communicating
- ⚠️ Manual license setup required (one-time, 30-day evaluation available)

## Services

- **Jira Software**: http://localhost:8080
- **PostgreSQL**: localhost:5432 (user: jira, password: jira123, db: jiradb)
- **Test Page**: http://localhost:8081/test.html
- **Extension Files**: http://localhost:8081/extension/

## Initial Setup

1. Run `./start-jira-environment.sh`
2. Open http://localhost:8080
3. Follow Jira setup wizard:
   - Choose "I'll set it up myself" for database
   - Database connection is pre-configured
   - Get evaluation license from my.atlassian.com
   - Create admin user: admin/admin123
4. Create test project: "Extension Testing" (key: EXT)
5. Create sample tasks for testing

## Extension Testing

1. Load extension from `dist/` folder in Chrome
2. Open Jira task for editing
3. Test extension buttons in description field
4. Verify LLM mocking works correctly

## Data Persistence

- Jira data: `jira-data` Docker volume
- PostgreSQL data: `jira-db-data` Docker volume
- Data persists between container restarts
- Use `docker-compose down -v` to reset all data

## Troubleshooting

- Check service status: `docker-compose -f docker-compose.jira.yml ps`
- View logs: `docker-compose -f docker-compose.jira.yml logs [service]`
- Restart services: `docker-compose -f docker-compose.jira.yml restart`

## Architecture

The environment consists of three Docker services:

1. **jira-db**: PostgreSQL 13 database with pre-configured Jira schema
2. **jira**: Atlassian Jira Software 10.4.1 with database connection configured
3. **nginx**: Web server for serving test pages and extension files

All services are connected via a custom Docker network and use persistent volumes for data storage.

## Manual Setup Steps

After running the startup script, you'll need to complete these one-time setup steps:

1. **License Setup**: Visit my.atlassian.com to get a free evaluation license
2. **Admin User**: Create admin user with credentials admin/admin123
3. **Test Project**: Create "Extension Testing" project with key "EXT"
4. **Sample Tasks**: Create a few test tasks with description fields for extension testing

## Development Workflow

1. Make changes to extension code
2. Run `./build.sh` to rebuild extension
3. Reload extension in Chrome
4. Test changes in Jira environment
5. Use `docker-compose -f docker-compose.jira.yml restart nginx` to refresh served files

## Environment Variables

The Docker environment uses these key configurations:

- `ATL_JDBC_URL`: PostgreSQL connection string
- `ATL_PROXY_NAME`: localhost for development
- `JVM_MINIMUM_MEMORY`: 2048m for adequate performance
- `JVM_MAXIMUM_MEMORY`: 4096m for development use

## Security Notes

This environment is designed for local development only:

- Uses default passwords (jira123)
- Exposes services on localhost ports
- Not suitable for production use
- Reset data volumes regularly for clean testing
