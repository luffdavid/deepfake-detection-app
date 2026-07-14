#!/bin/bash

# Analytics Setup Script
# This script helps set up the analytics system for local development

echo "🚀 TrustCheck Analytics Setup"
echo "================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo "⚠️  .env.local not found!"
    echo ""
    echo "To use the analytics database, you need to:"
    echo ""
    echo "1. Create a Vercel Postgres database:"
    echo "   - Visit: https://vercel.com/dashboard/projects"
    echo "   - Select your project"
    echo "   - Go to Storage → Create Database → Postgres"
    echo ""
    echo "2. Get the connection string:"
    echo "   - In Vercel Dashboard: Storage → Postgres → .env.local"
    echo "   - Copy the DATABASE_URL"
    echo ""
    echo "3. Create .env.local file:"
    echo "   - Copy from .env.example"
    echo "   - Add your DATABASE_URL"
    echo ""
    echo "Example:"
    cat .env.example
    echo ""
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env.local; then
    echo "❌ DATABASE_URL not found in .env.local"
    echo "Please add: DATABASE_URL=your_connection_string"
    exit 1
fi

echo "✅ .env.local found with DATABASE_URL"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Initialize database
echo ""
echo "🗄️  Initializing analytics database..."
echo ""
echo "Starting dev server..."
pnpm dev &
DEV_PID=$!

# Wait for dev server to start
sleep 5

# Call init endpoint
echo "Calling initialization endpoint..."
INIT_RESPONSE=$(curl -s http://localhost:3000/api/analytics/init)

echo "$INIT_RESPONSE" | grep -q "success" && echo "✅ Database initialized successfully" || echo "⚠️  Database initialization response: $INIT_RESPONSE"

# Stop dev server
kill $DEV_PID 2>/dev/null

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the dev server: pnpm dev"
echo "2. Open: http://localhost:3000"
echo "3. Test the app - events will be tracked automatically"
echo "4. View analytics: http://localhost:3000/dashboard/analytics"
echo ""
echo "To debug events in browser console, run:"
echo "  localStorage.setItem('DEBUG_ANALYTICS', 'true')"
echo ""
