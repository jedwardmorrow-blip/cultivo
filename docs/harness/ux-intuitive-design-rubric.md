# UX / Intuitive Design Rubric

Purpose: make the planner harness ask whether the screen feels natural to use, not just whether the code and data contracts are correct.

Intuitive design means: a user can tell what matters, what to do next, and where to go for detail without being taught the screen.

## 1. Orientation

Can the user tell where they are and what mode they are in?

- Surface name is visible.
- Current mode is visible.
- Selected room, batch, strain, or date horizon is clear.
- The screen does not rely on memory from the previous route.

## 2. Primary Action

Can the user tell what they are supposed to do next?

- One final action is visually and verbally dominant.
- Secondary actions are quieter.
- Escape actions are obvious but not competing.
- Disabled actions explain why or are visibly tied to missing inputs.

## 3. Information Hierarchy

Does the eye land in the right order?

- Status and mode first.
- Planning substrate second.
- Exceptions third.
- Detailed rows and drilldowns fourth.

For Production Planner, this usually means: mode, room/cohort context, mother/capacity context, alerts, then batch/strain detail.

## 4. Decision Proximity

Is needed context close to the action it affects?

- Room capacity near plant-count entry.
- Mother availability near strain selection.
- Data-honesty warnings before create/save.
- Projected dates near target flip/flower date.

## 5. Navigation Obviousness

Can the user tell where to go for more?

- Clickable rooms, batches, warnings, and controls have visible or accessible affordance.
- Icons are named or familiar.
- Drilldowns do not depend only on hover title text.
- The next destination is not mysterious.

## 6. Recovery

If the user changes their mind or makes a mistake, is the escape obvious?

- Close/cancel path exists.
- Back path exists for drilldowns.
- Remove-row actions are visible when there is something to remove.
- Destructive actions are separated from primary creation.

## Harness Rule

The harness should not claim a UI is beautiful. It should name specific comprehension risks:

- "Primary action hierarchy is muddy."
- "Risk context appears after commitment."
- "Navigation relies only on hover title."
- "Capacity context is far from plant-count entry."

This keeps UX review actionable instead of taste-based.
