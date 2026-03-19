-- Restore candidates that were bulk-rejected by accident
UPDATE chat_knowledge_candidates
SET status = 'pending', reviewed_at = NULL
WHERE status = 'rejected' AND reviewed_by IS NULL;
