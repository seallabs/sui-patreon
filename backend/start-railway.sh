#!/bin/bash
# Combined startup script for Railway deployment
# Runs Prisma migrations, then starts API server and indexer in parallel

set -e  # Exit on error

echo "🚀 Starting Sui Patreon Backend (API + Indexer)"
echo "================================================"

# 1. Run database migrations
echo "📊 Running Prisma migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migration failed"
  exit 1
fi

# 2. Generate Prisma client (in case it's not already generated)
echo "🔧 Generating Prisma client..."
npx prisma generate

# 3. Start API server and indexer in parallel
echo "🌐 Starting API server and indexer..."
echo "================================================"

# Use npx tsx to run both TypeScript processes
npx tsx src/index.ts &
API_PID=$!

npx tsx src/indexer.ts &
INDEXER_PID=$!

echo "✅ API server started (PID: $API_PID)"
echo "✅ Indexer started (PID: $INDEXER_PID)"

# Handle graceful shutdown
trap "echo '⚠️ Shutting down...'; kill $API_PID $INDEXER_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# Wait for both processes
wait
