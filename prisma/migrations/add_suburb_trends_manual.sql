-- Migration: Add suburb-level market trends to AgentMarketCache
-- Purpose: Store neighborhood intelligence for Domain/REA data parity
-- Date: 2026-06-21

-- Add suburb-level market trend columns
ALTER TABLE agent_market_cache
ADD COLUMN "suburbMedianPrice" INTEGER,
ADD COLUMN "suburbGrowthRate" DOUBLE PRECISION,
ADD COLUMN "averageDaysOnMarket" INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN agent_market_cache."suburbMedianPrice" IS 'Median property price for the suburb (AUD)';
COMMENT ON COLUMN agent_market_cache."suburbGrowthRate" IS 'Annual property price growth rate (percentage)';
COMMENT ON COLUMN agent_market_cache."averageDaysOnMarket" IS 'Average days properties stay on market in this suburb';

-- No indexes needed - these fields are not used for filtering
-- They are always retrieved alongside the cached property data
