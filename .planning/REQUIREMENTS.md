# Requirements: Claude Control v1.1

**Defined:** 2026-02-23
**Core Value:** Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.

## v1.1 Requirements

Requirements for v1.1 Dashboard UX & Interactivity. Each maps to roadmap phases.

### Navigation

- [x] **NAV-01**: Dashboard sidebar groups items under section headers (Configuration, Extensions, Workspace) instead of flat list
- [ ] **NAV-02**: Keyboard combos (G+S, G+M, etc.) navigate to any dashboard page without mouse
- [ ] **NAV-03**: Keyboard shortcut help overlay shows all available combos
- [ ] **NAV-04**: Projects page shows breadcrumb trail for discover → select → compare flow
- [ ] **NAV-05**: Breadcrumbs are clickable to navigate back to any prior step

### Guidance

- [ ] **GUIDE-01**: Every dashboard page shows contextual empty state when no data exists
- [ ] **GUIDE-02**: Empty states explain WHY nothing is configured and WHAT to do next
- [ ] **GUIDE-03**: Health recommendations link directly to the relevant dashboard page
- [ ] **GUIDE-04**: Overview page displays subscription type and rate limit tier prominently alongside stat cards

### Workflow

- [x] **WORK-01**: Global refresh button in layout header re-fetches all data without full page reload
- [x] **WORK-02**: Refresh button shows loading state during data fetch
- [ ] **WORK-03**: Error states on each page include a retry button
- [ ] **WORK-04**: Retry button re-fetches only the failed page's data

### Write Capabilities

- [ ] **WRITE-01**: Permissions page has an "Add rule" form with tool name, pattern, and allow/deny/ask selection
- [ ] **WRITE-02**: Permission rules write to user-scope settings.json only
- [ ] **WRITE-03**: Added permission rules appear immediately in the permissions list without page reload
- [ ] **WRITE-04**: Settings page shows toggle switches for boolean settings
- [ ] **WRITE-05**: Boolean toggle writes to user-scope settings.json only
- [ ] **WRITE-06**: Toggle change is reflected immediately in the settings display

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Write Capabilities

- **WRITE-V2-01**: Full JSON editor for settings values beyond booleans
- **WRITE-V2-02**: Permission rules targeting project-scope and local-scope
- **WRITE-V2-03**: CLAUDE.md editing from the dashboard

### Real-Time Updates

- **RT-V2-01**: File watching for automatic dashboard refresh when config changes
- **RT-V2-02**: WebSocket push for live updates

### Advanced Navigation

- **NAV-V2-01**: In-page vim-style keyboard bindings
- **NAV-V2-02**: Command palette (Cmd+K) for fuzzy search across all config

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| MCP server start/stop/restart | Belongs to Claude Code itself |
| Config validation/linting | Claude Code is authority on validity |
| Config sync across machines | Separate tool domain (chezmoi, etc.) |
| New CLI commands for v1.1 | Milestone focus is dashboard UX only |
| Mobile-specific layouts | Existing responsive design is sufficient |
| Dark/light theme toggle | Current dark theme works well |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 8 | Complete |
| NAV-02 | Phase 11 | Pending |
| NAV-03 | Phase 11 | Pending |
| NAV-04 | Phase 11 | Pending |
| NAV-05 | Phase 11 | Pending |
| GUIDE-01 | Phase 9 | Pending |
| GUIDE-02 | Phase 9 | Pending |
| GUIDE-03 | Phase 10 | Pending |
| GUIDE-04 | Phase 9 | Pending |
| WORK-01 | Phase 8 | Complete |
| WORK-02 | Phase 8 | Complete |
| WORK-03 | Phase 10 | Pending |
| WORK-04 | Phase 10 | Pending |
| WRITE-01 | Phase 12 | Pending |
| WRITE-02 | Phase 12 | Pending |
| WRITE-03 | Phase 12 | Pending |
| WRITE-04 | Phase 13 | Pending |
| WRITE-05 | Phase 13 | Pending |
| WRITE-06 | Phase 13 | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 after roadmap creation*
