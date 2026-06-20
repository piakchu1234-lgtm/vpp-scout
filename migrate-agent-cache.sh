#!/bin/bash
# Agent Market Cache Migration Script

echo "🔧 Generating Prisma Client with new AgentMarketCache model..."
npx prisma generate

echo ""
echo "📊 Creating database migration..."
npx prisma migrate dev --name add_agent_market_cache

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Verify the migration:"
echo "   1. Check that agent_market_cache table was created"
echo "   2. Verify indexes on address and updatedAt columns"
echo ""
