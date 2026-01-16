#!/bin/bash

# Database Type Generation Script
# This script generates TypeScript types from the Supabase database schema

set -e

echo "🔄 Generating database types from Supabase..."

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo ""
    echo "❌ Error: SUPABASE_ACCESS_TOKEN not found"
    echo ""
    echo "To generate types, you need a Supabase access token:"
    echo ""
    echo "1. Go to https://supabase.com/dashboard/account/tokens"
    echo "2. Generate a new access token"
    echo "3. Set the environment variable:"
    echo "   export SUPABASE_ACCESS_TOKEN='your-token-here'"
    echo ""
    echo "Then run this script again:"
    echo "   npm run types:generate"
    echo ""
    exit 1
fi

# Generate types
npx supabase gen types typescript --project-id fonreynkfeqywshijqpi > src/lib/database/database.types.ts

echo "✅ Database types generated successfully!"
echo "📄 File: src/lib/database/database.types.ts"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff src/lib/database/database.types.ts"
echo "  2. Run type check: npm run typecheck"
echo "  3. Commit the changes if everything looks good"
echo ""
