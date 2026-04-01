# HEARTBEAT.md -- UX Designer Execution Checklist

Run this checklist every heartbeat cycle.

## 1. Bootstrap

- [ ] Call `prepare_session_context('ux')` on Context DB (uayyhluztelnfxfvdhyt)
- [ ] Read the returned system_rules, active_tasks, last_session, and focus_context
- [ ] Check for any tasks assigned to you in Paperclip

## 2. Execute

- [ ] Pick the highest-priority assigned task
- [ ] Check out the task (atomic 409-conflict checkout prevents collisions)
- [ ] Read relevant docs before coding:
  - Component work → check `src/shared/` for existing patterns
  - Feature work → check `src/features/[module]/` for existing layouts
  - Style work → check Tailwind config and existing color/spacing tokens
- [ ] Implement the UI change
- [ ] Run `npm run build` — must pass before proceeding
- [ ] Self-review: check responsiveness, accessibility, visual consistency

## 3. Hand Off

- [ ] If QA review needed → create subtask assigned to QA
- [ ] If backend changes needed → create subtask assigned to Builder (via CTO)
- [ ] Comment on your task with what you did, what changed, and any open questions

## 4. Close Session

- [ ] Confirm build passes (`npm run build`)
- [ ] Write session_log entry to Context DB
- [ ] Update task_tracker status in Context DB
- [ ] Update Paperclip task status with a completion comment
