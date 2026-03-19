-- Create the proposed_context_updates table to act as an append-only draft table for AI updates
-- NOTE: Execute this on the uayyhluztelnfxfvdhyt Context Database
CREATE TABLE proposed_context_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    summary TEXT NOT NULL,
    files_touched TEXT[] DEFAULT '{}',
    next_steps TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    agent_id TEXT DEFAULT 'antigravity'
);

-- Note: The cultops_build_state_current in business_context should be updated manually
-- by Justin after reviewing these drafts, or via a linked UI button / DB Trigger.
