Distribution v2 · Step 2 decision note (Lane 1, 2026-04-26 evening)

V2 closes the three honest gaps Justin called out in the v1 self-rating: missing map artboard, missing responsive collapse rules, busy expanded OrderReadinessCard. v1 files retained for diff visibility; v2 files supersede where they overlap.

1. Atoms new in v2: route polyline (svg, --accent solid for selected, --op-line dashed for inactive), facility marker (rotated diamond, --accent), zone customer pin (sized by amount, opacity reduced for unselected zones), map tooltip (--accent left rule with --op-line-strong border), aggregate progress summary line (single mono number with semantic color: --status-ok ready, --accent partial, --status-bad blocked), view-switch chip-pill row (Map · Calendar · Unscheduled), collapse-rules annotation block for portrait artboard.
2. Atoms reused / atoms revised: OrderReadinessCard expanded layer flattened from three nested visual layers (line-row + per-line progress + per-line stage dot) to two (single aggregate summary + two-column hairline line list); document chips moved above the line list so they read as a state declaration rather than a footnote; calendar day-cell typography unchanged so the desktop and portrait artboards share the same atom.
3. Tokens touched: zero. The five --zone-* additions in distribution-token-delta-v1.css remain the only proposed delta; v2 introduces no further token requests. The map artboard demonstrates --zone-* in pin form (sized by amount), confirming the palette reads at 4-14px against --op-canvas without losing zone identity.
4. Question answered: the calendar surface, the map surface, and the unscheduled list are three states of the same primary panel slot. View-switch lives in the calendar header (calendar mode) or as a tile in the secondary panel (map mode). Selection in one state hydrates the other (clicking a route row in map mode swaps the primary panel back to calendar with the date highlighted; clicking a date in mini-cal swaps back to calendar mode at that date). The DayDetailStrip below adapts to whichever state is primary: today's orders in calendar mode, selected route's stops in driving order in map mode, queued unscheduled list in unscheduled mode. Portrait collapse keeps the three-state model intact via a view-switch button group in the header.
5. Question open: the map artboard shows route polylines as an --accent solid line for the selected route and --op-line dashed for inactive routes; this works for one zone selected but does not yet show the multi-route comparison case (Friday with three routes simultaneously dispatched). v2 punts that to v3 if Justin signals it's needed; the recommendation is to ship v2 as the implementation contract and let real-data screenshots from Step 5 verification determine whether multi-route map comparison needs a dedicated artboard.

Files in mockups/distribution/ at v2:
- distribution-default-v1.html, distribution-crisis-v1.html (v1 retained for diff)
- distribution-default-v2.html, distribution-crisis-v2.html (v2 supersedes for shipping decisions)
- distribution-map-v1.html (NEW, fills the load-bearing gap)
- distribution-portrait-1024.html (NEW, responsive collapse rules)
- distribution-token-delta-v1.css (unchanged)
- distribution-decision-note-v1.md (preserved as historical), distribution-decision-note-v2.md (this file, current)
