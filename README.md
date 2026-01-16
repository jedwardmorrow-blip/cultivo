# Cult Cannabis Post-Production Management System

A comprehensive post-production management system for cannabis cultivation and distribution operations.

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── features/           # Feature-based modules (orders, customers, analytics, etc.)
│   ├── orders/         # Order management
│   ├── customers/      # Customer management
│   ├── products/       # Product catalog
│   ├── inventory/      # Inventory tracking
│   ├── batches/        # Batch management
│   ├── sessions/       # Trim & packaging sessions
│   ├── delivery/       # Routing & delivery
│   ├── analytics/      # Analytics & reporting
│   ├── coa/            # Certificate of Analysis
│   ├── dashboard/      # Dashboard widgets
│   ├── settings/       # Application settings
│   ├── order-form/     # Public order form
│   └── auth/           # Authentication
├── types/              # Centralized type definitions ✨ NEW!
├── shared/             # Shared components, hooks, and services
├── lib/                # Core utilities (auth, supabase, database types)
├── pages/              # Public pages (COA library, coversheet, menu)
├── services/           # Global services (being migrated to features)
└── App.tsx             # React Router application ✨ UPDATED!
```

## Documentation

### 📚 Core Documentation

**Data Architecture (Start Here!)**
- **[Quick Reference](./docs/data-architecture/QUICK_REFERENCE.md)** - Fast lookup for common questions
- **[Architecture Overview](./docs/data-architecture/OVERVIEW.md)** - System architecture and principles
- **[Batch Tracking](./docs/data-architecture/batch-tracking.md)** - Complete batch system reference
- **[Inventory Tracking](./docs/data-architecture/inventory-tracking.md)** - Inventory management details

**Getting Started**
- **[Quick Start Guide](./docs/QUICK_START_GUIDE.md)** - Getting started with development
- **[CSV Format Guide](./docs/CSV_FORMAT_GUIDE.md)** - Data import formats

### Implementation Documentation

See `/docs` for detailed implementation guides on:
- Batch management and tracking
- Inventory management system
- Order fulfillment workflow
- Customer management with geocoding
- Routing and delivery management
- COA (Certificate of Analysis) system

> **Important:** Before making any database changes, review the [Data Architecture documentation](./docs/data-architecture/)

## Key Features

- Order management and tracking
- Batch-centric inventory system
- Trim and packaging session management
- Customer relationship management with geocoding
- Delivery route optimization
- COA management and label generation
- Analytics and reporting
- Multi-stage production workflow

## Technology Stack

- React + TypeScript
- Vite
- Supabase (Database & Auth)
- Tailwind CSS
- Leaflet (Maps)

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run linter
npm run typecheck    # Check TypeScript types
npm run types:generate  # Regenerate database types from Supabase
```

### Database Type Generation

> **🚨 CRITICAL:** This project uses TypeScript types generated from the Supabase database schema. Outdated types will cause compilation errors and block development.

#### Quick Type Generation

```bash
# 1. Set your Supabase access token (one-time setup)
export SUPABASE_ACCESS_TOKEN='your-token-here'

# 2. Generate types
npm run types:generate
```

#### Getting Your Access Token

1. Visit [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. Click "Generate New Token"
3. Name it "Type Generation" and copy the token
4. Set environment variable: `export SUPABASE_ACCESS_TOKEN='your-token-here'`

> **Note:** The access token is separate from your project's `VITE_SUPABASE_ANON_KEY`. It's your personal Supabase account token for CLI access.

#### When to Regenerate Types

**MUST regenerate after:**
- Database migrations are applied
- New tables or columns are added
- Any schema changes in Supabase

**Should regenerate when:**
- TypeScript errors mention missing types (e.g., `Module has no exported member 'BatchRegistry'`)
- Starting work on features that touch the database
- After pulling changes that include new migrations

#### Expected Results

After successful type generation:
- `src/lib/database/database.types.ts` will be updated
- TypeScript errors should drop from ~44 to ~14
- New tables like `batch_registry` and `inventory_movements` will be available

#### Troubleshooting

**Error: "Failed to connect to Supabase"**
- Check that `SUPABASE_ACCESS_TOKEN` is set correctly
- Verify token has not expired
- Ensure you have access to the project

**Error: "Command not found: supabase"**
- The CLI is installed via `devDependencies` - run `npm install` first
- Use `npx supabase` if the command isn't found

**Types are generated but errors persist:**
- Clear TypeScript cache: Delete `node_modules/.vite` and restart dev server
- Restart your IDE/editor to reload type definitions
- Run `npm run typecheck` to verify the issue

#### Complete Documentation

For detailed type generation procedures, verification steps, and deployment workflows:
- [TESTING-&-MIGRATION.md](./docs/TESTING-&-MIGRATION.md) - Database Type System section
- [DOCS-INTEGRATION-PROGRESS.md](./docs/DOCS-INTEGRATION-PROGRESS.md) - Type generation strategy
- [docs/README.md](./docs/README.md) - Full documentation index

## Environment Variables

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
