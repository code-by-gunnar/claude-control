# Roadmap: Claude Control v1.1

## Overview

Dashboard UX and interactivity improvements. Better navigation (sidebar groups, keyboard shortcuts, breadcrumbs), new-user guidance (empty states), workflow improvements (refresh, retry), and initial write capabilities (boolean settings, permission rules). Builds on the v1.0 foundation (phases 1-7) with 6 new phases targeting dashboard polish and first write features.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- v1.0 phases: 1-7 (complete)
- v1.1 phases: 8-13

- [x] **Phase 8: Dashboard Layout** - Sidebar groups + global refresh button
- [x] **Phase 9: Empty States & Guidance** - Contextual help on every page + account info
- [x] **Phase 10: Health Deeplinks & Error Recovery** - Health recommendation links + error retry
- [x] **Phase 11: Keyboard Navigation & Breadcrumbs** - G+key combos + Projects breadcrumbs
- [x] **Phase 12: Permission Write Rules** - Add rule form with user-scope writes
- [x] **Phase 13: Settings Boolean Toggles** - Toggle switches with user-scope writes

## Phase Details

### Phase 8: Dashboard Layout
**Goal**: Restructure sidebar with grouped sections and add global refresh
**Depends on**: Nothing (first v1.1 phase, builds on v1.0 dashboard)
**Requirements**: NAV-01, WORK-01, WORK-02
**Success Criteria** (what must be TRUE):
  1. Sidebar shows items grouped under "Configuration", "Extensions", "Workspace" section headers
  2. Refresh button visible in layout header
  3. Clicking refresh re-fetches all data without full page reload
  4. Refresh button shows loading indicator during fetch
**Research**: Unlikely (internal UI refactor, established React/Tailwind patterns)
**Plans**: TBD

### Phase 9: Empty States & Guidance
**Goal**: Every page guides users when no data exists, account info visible on overview
**Depends on**: Phase 8
**Requirements**: GUIDE-01, GUIDE-02, GUIDE-04
**Success Criteria** (what must be TRUE):
  1. Every dashboard page shows helpful message when no data exists for that config type
  2. Empty state messages explain why nothing is configured and suggest next steps
  3. Overview page displays subscription type and rate limit tier alongside stat cards
**Research**: Unlikely (static content + existing API endpoint for credentials)
**Plans**: TBD

### Phase 10: Health Deeplinks & Error Recovery
**Goal**: Health recommendations link to relevant pages, errors have retry buttons
**Depends on**: Phase 9
**Requirements**: GUIDE-03, WORK-03, WORK-04
**Success Criteria** (what must be TRUE):
  1. Health recommendations include clickable links to relevant dashboard pages
  2. Error states on each page show retry button instead of bare error text
  3. Retry button re-fetches only the failed page's data (not all data)
**Research**: Unlikely (internal wiring, existing health and error patterns)
**Plans**: TBD

### Phase 11: Keyboard Navigation & Breadcrumbs
**Goal**: Mouse-free page navigation and Projects page breadcrumb trail
**Depends on**: Phase 8 (needs sidebar route structure)
**Requirements**: NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. G+key combos navigate to any dashboard page without mouse
  2. Help overlay (triggered by ?) shows all available keyboard shortcuts
  3. Projects page shows breadcrumb trail for discover → select → compare flow
  4. Breadcrumb items are clickable to navigate back to prior steps
**Research**: Unlikely (vanilla key events, no dependencies needed)
**Plans**: TBD

### Phase 12: Permission Write Rules
**Goal**: Users can add permission rules from the dashboard
**Depends on**: Phase 8 (needs refresh for post-write updates)
**Requirements**: WRITE-01, WRITE-02, WRITE-03
**Success Criteria** (what must be TRUE):
  1. Permissions page has "Add rule" form with tool name, pattern, and allow/deny/ask selection
  2. Submitted rules write to user-scope settings.json only (never project/local)
  3. Added rules appear immediately in permissions list without page reload
**Research**: Likely (first write capability — JSONC write-back patterns)
**Research topics**: JSONC write-back with comment preservation, file write atomicity on Windows, user-scope path resolution
**Plans**: TBD

### Phase 13: Settings Boolean Toggles
**Goal**: Users can toggle boolean settings from the dashboard
**Depends on**: Phase 12 (reuses write pattern established there)
**Requirements**: WRITE-04, WRITE-05, WRITE-06
**Success Criteria** (what must be TRUE):
  1. Settings page shows toggle switches for all boolean settings
  2. Toggling writes to user-scope settings.json only (never project/local)
  3. Toggle change reflected immediately in settings display without reload
**Research**: Unlikely (same write pattern from Phase 12)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9 → 10 → 11 → 12 → 13

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 8. Dashboard Layout | 1/1 | Complete | 2026-02-23 |
| 9. Empty States & Guidance | 1/1 | Complete | 2026-02-23 |
| 10. Health Deeplinks & Error Recovery | 2/2 | Complete | 2026-02-23 |
| 11. Keyboard Navigation & Breadcrumbs | 2/2 | Complete | 2026-02-23 |
| 12. Permission Write Rules | 1/1 | Complete | 2026-02-23 |
| 13. Settings Boolean Toggles | 1/1 | Complete | 2026-02-23 |
