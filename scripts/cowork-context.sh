#!/bin/bash
# cowork-context.sh — Session orientation for Cowork agent
# Run at the start of every build session. Output goes into context.
# This file should NEVER be modified by Cowork itself — it is meta-tooling.
# Only Justin or a claude_session should modify it.

echo "=== REPO: RECENT COMMITS (last 15) ==="
git log --oneline -15

echo ""
echo "=== REPO: CURRENT STATUS ==="
git status --short

echo ""
echo "=== REPO: RECENT CHANGES (last 3 commits, file-level) ==="
git diff HEAD~3 --name-status

echo ""
echo "=== TYPESCRIPT: CURRENT ERRORS (first 60 lines, tsconfig.app.json) ==="
timeout 45 npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -60 || echo "(tsc timed out — errors likely exceed 60 lines)"

echo ""
echo "=== TAILWIND CONFIG: CUSTOM KEYFRAMES + COLORS ==="
node -e "
const m = require('./tailwind.config.js');
const cfg = m.default || m;
const theme = cfg.theme?.extend || {};
console.log('Custom colors:', Object.keys(theme.colors || {}));
console.log('Custom keyframes:', Object.keys(theme.keyframes || {}));
console.log('Custom animations:', Object.keys(theme.animation || {}));
"

echo ""
echo "=== PACKAGE.JSON: KEY DEPS ==="
node -e "
const m = require('./package.json');
const pkg = m.default || m;
const deps = {...pkg.dependencies, ...pkg.devDependencies};
const key = ['react','typescript','vite','rollup','@supabase/supabase-js','tailwindcss','react-router-dom'];
key.forEach(k => console.log(k + ':', deps[k] || 'NOT INSTALLED'));
"

echo ""
echo "=== SUPABASE MIGRATIONS: LAST 10 ==="
ls -t supabase/migrations/ | head -10

echo ""
echo "=== CONTEXT LOAD COMPLETE ==="
