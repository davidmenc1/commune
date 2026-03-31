#!/bin/bash
# Create Test Database - Manual Setup Script

echo "🔧 Creating test database for E2E tests..."
echo ""

# Database configuration from .env.test
DB_NAME="chat-app-test"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "📍 Database: $DB_NAME"
echo "📍 Host: $DB_HOST:$DB_PORT"
echo "📍 User: $DB_USER"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER &> /dev/null; then
  echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
  echo ""
  echo "Please start PostgreSQL first:"
  echo "  macOS (Homebrew): brew services start postgresql"
  echo "  Linux: sudo systemctl start postgresql"
  echo "  Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15"
  exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Drop existing test database if it exists
echo "🗑️  Dropping existing test database (if any)..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>&1 | grep -v "does not exist" || true

# Create new test database
echo "🆕 Creating fresh test database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Test database created successfully!"
  echo ""
  echo "📍 Connection string:"
  echo "   postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
  echo ""
  echo "🎉 You can now run tests with: npm run test:e2e"
else
  echo ""
  echo "❌ Failed to create test database"
  echo ""
  echo "Troubleshooting:"
  echo "1. Make sure PostgreSQL is running"
  echo "2. Check your credentials in .env.test"
  echo "3. Ensure user has CREATE DATABASE permission"
  exit 1
fi
