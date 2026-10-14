# Tasks: UX Improvements

**Feature**: UX Improvements  
**Spec**: [Feature Specification](./spec.md)  
**Plan**: [Implementation Plan](./plan.md)  
**Date**: 2026-08-12

---

## Phase 1: Setup & Foundation

**Goal**: Initialize infrastructure and prepare component foundation

- [x] T001 Create new `useScrollToTop` custom hook in `frontend/src/hooks/useScrollToTop.ts`
- [x] T002 Create new `OptimizedImage` component in `frontend/src/components/generic/Image/OptimizedImage.tsx`
- [x] T003 Create new `AdminLoginModal` component in `frontend/src/components/AdminLogin/AdminLoginModal.tsx`
- [x] T004 Create navigation state types in `frontend/src/types/navigation.ts` (route, scroll history) — file removed in T058

---

## Phase 2: Foundational Components

**Goal**: Establish reusable patterns and shared utilities

- [x] T005 [P] Implement `useScrollToTop` hook with `useLocation()` and `useEffect` in `frontend/src/hooks/useScrollToTop.ts`
- [x] T006 [P] Implement `OptimizedImage` base structure with `loading` state in `frontend/src/components/generic/Image/OptimizedImage.tsx`
- [x] T007 [P] Implement `AdminLoginModal` form structure in `frontend/src/components/AdminLogin/AdminLoginModal.tsx`
- [x] T008 Add Tailwind CSS classes for modal overlay and form styling in `frontend/src/components/AdminLogin/AdminLoginModal.tsx`

---

## Phase 3: User Story 1 - Auto-Scroll to Top on Navigation

**Story Goal**: Users automatically scroll to top when navigating between pages

**Independent Test**: Navigate between home → books list → book detail with scroll position at different depths; verify each page loads with scroll at y=0

**Acceptance Criteria**:
- [x] Page loads with scroll position at top (y=0)
- [x] Works with React Router navigation links
- [x] Works with browser back/forward buttons
- [x] No scroll stuttering or jank
- [x] Mobile viewports handled correctly

### Implementation Tasks

- [x] T009 [US1] Import and use `useScrollToTop` hook in `frontend/src/App.tsx`
- [x] T010 [US1] Add scroll reset logic on route change in `frontend/src/App.tsx` using `useEffect` and `useLocation()`
- [x] T011 [US1] Test auto-scroll on navigation from home to books list in `frontend/src/App.tsx`
- [x] T012 [US1] Test auto-scroll when clicking book detail link in `frontend/src/App.tsx`
- [x] T013 [US1] Test scroll behavior with browser back button navigation in `frontend/src/App.tsx`
- [ ] T014 [US1] Add debounce to scroll function to prevent jank in `frontend/src/hooks/useScrollToTop.ts` (not implemented; the hook calls `window.scrollTo(0,0)` directly)
- [x] T015 [US1] Test mobile scroll-to-top on viewport sizes 375px-768px in `frontend/src/App.tsx`
- [x] T015a [US1] Implement scroll restoration for back/forward (FR-008) in `frontend/src/hooks/useScrollToTop.ts`: save scroll Y per location key on leave, restore on POP navigation, scroll to top on PUSH/REPLACE (spec US1 AC3)

---

## Phase 4: User Story 2 - Seamless Main/Admin Navigation

**Story Goal**: Users can log in as admin, access dashboard, and return to main app without disruption

**Independent Test**: Click "Admin" → login → view dashboard → click "Back to Main"; verify smooth transitions and state preservation

**Acceptance Criteria**:
- [x] Admin login modal appears without page reload
- [x] Modal has working login form
- [x] After login, user can access admin dashboard
- [x] Clear indication of admin login status in navigation
- [x] One-click logout available
- [x] Returning to main app preserves main app state

### Implementation Tasks

- [x] T016 [US2] Modify `frontend/src/components/Navigation.tsx` to add "Admin" link with modal trigger
- [x] T017 [US2] Implement modal open/close state in `frontend/src/App.tsx`
- [x] T018 [US2] Connect `AdminLoginModal` to existing login API in `frontend/src/components/AdminLogin/AdminLoginModal.tsx`
- [x] T019 [US2] Add login error handling and display in `frontend/src/components/AdminLogin/AdminLoginModal.tsx`
- [x] T020 [US2] Update `frontend/src/App.tsx` auth state on successful admin login
- [x] T021 [US2] Update `frontend/src/components/Navigation.tsx` to show login status and logout button
- [x] T022 [US2] Add "Back to Main App" button in `frontend/src/components/AdminDashboard/AdminDashboard.tsx`
- [x] T023 [US2] Implement navigation back to main app in `frontend/src/components/AdminDashboard/AdminDashboard.tsx` (route to `/`)
- [x] T024 [US2] Test admin login flow: click Admin → enter credentials → verify dashboard access
- [x] T025 [US2] Test logout: click logout button → verify returned to home page and logged out
- [x] T026 [US2] Test context switching: main app → admin → back to main preserves scroll position and state
- [x] T027 [US2] Test admin-only route protection: verify non-admin users cannot access `/admin` routes
- [x] T027a [US2] Logout handler in `frontend/src/App.tsx` clears the token and resets auth state (spec FR-003). Already present before this pass; verified.
- [x] T027b [US2] (deferred: FR-005 moved to Out of Scope in spec.md) Smooth transition between admin sections (spec FR-005). Not implemented: the dashboard renders all sections on one page with no section switching, so there is no transition to add. Needs a spec decision (drop FR-005 or define what "section transition" means).

---

## Phase 5: User Story 3 - Faster Image Loading

**Story Goal**: Images load quickly and don't block user interaction

**Independent Test**: Load page with images → verify images display within 2s → scroll and verify lazy loading activates for below-fold images

**Acceptance Criteria**:
- [x] Images load within 2 seconds
- [x] Lazy loading for below-fold images
- [x] Placeholder shows while loading
- [x] No layout shift when image loads
- [x] Scrolling not blocked by image loading
- [x] Works on 3G/4G connections

### Implementation Tasks

- [x] T028 [P] [US3] Implement lazy loading in `OptimizedImage` using `IntersectionObserver` in `frontend/src/components/generic/Image/OptimizedImage.tsx`
- [x] T029 [P] [US3] Add placeholder/skeleton UI in `OptimizedImage` component in `frontend/src/components/generic/Image/OptimizedImage.tsx`
- [x] T030 [P] [US3] Add error handling for failed image loads in `frontend/src/components/generic/Image/OptimizedImage.tsx`
- [x] T031 [US3] Replace `<img>` tags in `frontend/src/components/generic/Card/BookCard.tsx` with `<OptimizedImage>`
- [x] T032 [US3] Replace `<img>` tags in `frontend/src/components/FeaturedBook/FeaturedBook.tsx` with `<OptimizedImage>`
- [x] T033 [US3] Replace `<img>` tags in `frontend/src/components/BookList/BookList.tsx` with `<OptimizedImage>`
- [x] T034 [US3] Add native HTML `loading="lazy"` attribute as fallback in `frontend/src/components/generic/Image/OptimizedImage.tsx`
- [x] T035 [US3] Test image loading time on home page using DevTools Network tab
- [x] T036 [US3] Test lazy loading: scroll through books list and verify images load on-scroll
- [x] T037 [US3] Test placeholder display: verify skeleton/placeholder shown while image loads
- [x] T038 [US3] Test no layout shift: measure Cumulative Layout Shift (CLS) using Lighthouse in `frontend/`
- [x] T039 [US3] Test on simulated 3G connection using DevTools throttling

---

## Phase 6: Integration & Polish

**Goal**: Verify all features work together and meet acceptance criteria

- [x] T040 Test full user flow: home → scroll → click book → admin login → dashboard → back to main
- [x] T041 Test all three stories together: scroll, admin nav, image loading all working simultaneously
- [x] T042 Run Lighthouse performance audit on all pages in `frontend/`
- [x] T043 Verify mobile responsiveness across all new components (375px-768px viewports)
- [x] T044 Check accessibility: modal focus management, image alt text, keyboard navigation
- [x] T045 Clean up console warnings and debug statements in `frontend/src/**/*.tsx`
- [x] T046 Commit implementation to feature branch `004-ux-improvements`
- [ ] T047 Create PR from `004-ux-improvements` to `development` with test results

---

## Phase 7: Manual Test Feedback (Round 2)

**Goal**: Address issues found in browser testing of Phases 3-5

- [x] T048 [FR-011] Fix white-on-white text in admin login modal: set panel and heading text to `text-gray-900` (global `:root` color is white) in `frontend/src/components/AdminLogin/AdminLoginModal.tsx`
- [x] T049 [FR-009] Add "Dashboard" link to the navigation when admin is logged in, using `<Link to="/admin">`, in `frontend/src/components/Navigation.tsx`
- [x] T050 [FR-010] Stop offering "next page" when the following page is empty: `BookList.tsx` steps back on an empty page and disables next from that page on
- [x] T051 [FR-011] Restyle navigation and admin header buttons to a minimal style (ghost and pill buttons, muted username) in `Navigation.tsx` and `AdminDashboard.tsx`
- [ ] T052 [FR-010] Root-cause the empty page 2: check `GET /books?page=1` and `?page=2` responses and `SELECT COUNT(*) FROM banned_books`; suspect stale Redis list cache (SWR serves stale `meta.hasNextPage`) after data changed outside the API (e.g. migrations)
- [x] T053 Re-test in browser: login modal contrast, Dashboard button on main page, next-page behavior, nav styling on mobile widths

---

## Dependencies & Execution Order

### Critical Path (Sequential)

```
T001-T004 (Setup) 
  ↓
T005-T008 (Foundational)
  ↓
T009-T015 (US1: Scroll)
  ↓
T016-T027 (US2: Admin Nav)
  ↓
T028-T039 (US3: Images)
  ↓
T040-T047 (Integration & Polish)
```

### Parallelization Opportunities

**After T008, these can run in parallel**:
- T009-T015 (US1) — independent of US2 and US3
- T016-T027 (US2) — independent of US1 and US3
- T028-T039 (US3) — independent of US1 and US2

**Example parallel execution**:
```
Developer 1: T009-T015 (US1 scroll implementation)
Developer 2: T016-T027 (US2 admin navigation)
Developer 3: T028-T039 (US3 image optimization)
  ↓ (all complete)
Developer 1: T040-T047 (Integration & testing)
```

---

## Task Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| Setup | T001-T004 | Component stubs and types |
| Foundational | T005-T008 | Reusable hooks and patterns |
| US1 (P1) | T009-T015 | Auto-scroll to top on navigation |
| US2 (P2) | T016-T027 | Seamless admin/main navigation |
| US3 (P3) | T028-T039 | Faster image loading |
| Integration | T040-T047 | End-to-end validation and polish |

**Total Tasks**: 47  
**Parallelizable Tasks**: 11 ([P] markers)  
**Estimated Duration**: 2-3 days (full-time dev)  
**MVP Scope**: T001-T015 (Setup + US1 scroll) = ~1 day for core improvement

---

## Implementation Strategy

### MVP (1 day)
Implement Phase 1-3 only (Setup + US1 scroll to top):
- Deploy working scroll-to-top feature
- Delivers primary UX improvement
- Unblocks testing with other features

### Phase 2 (1 day)  
Add Phase 4 (US2 seamless admin navigation):
- Admin users can log in without leaving app context
- Better workflow for admin operations

### Phase 3 (0.5 days)
Add Phase 5 (US3 faster image loading):
- Performance optimization
- Completes feature scope

### Polish (0.5 days)
Phase 6 integration and testing:
- Cross-browser testing
- Mobile verification
- Performance audit

---

## Testing Strategy

**Manual Testing** (per constitution - no automated test framework):

1. **US1 Testing** (T011-T015):
   - Navigate between 3+ pages at different scroll depths
   - Verify scroll resets each time
   - Test browser back/forward

2. **US2 Testing** (T024-T027):
   - Login flow from main app
   - Dashboard access and state
   - Logout and return to main

3. **US3 Testing** (T035-T039):
   - Load time measurement via DevTools
   - Lazy loading verification via scroll
   - Performance metrics via Lighthouse

4. **Integration Testing** (T040-T044):
   - All features together
   - Mobile responsiveness
   - Accessibility checks

---

## Acceptance & Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Scroll-to-top coverage | 100% of pages | Manual navigation test |
| Admin login time | <5 seconds | Time modal → dashboard |
| Image load time | <2 seconds | DevTools Network tab |
| Layout shift (CLS) | <0.1 | Lighthouse audit |
| Mobile support | 375px+ | Device toolbar test |
| Accessibility | WCAG 2.1 AA | Manual keyboard/screen reader |


## Phase 8: Convergence

**Source**: `/speckit-converge` assessment of the code at commit `6b4617f` against spec, plan, and constitution

- [x] T054 [CRITICAL] Build the admin login URL through `frontend/src/utils/api.ts` instead of concatenating `apiUrl` in `frontend/src/components/AdminLogin/AdminLoginModal.tsx`; pass the host only, as the other components do (per Constitution II: components MUST NOT construct API URLs directly) (contradicts)
- [x] T055 [CRITICAL] Move the `VITE_API_URL` and `VITE_URL_PREFIX` reads in `frontend/src/App.tsx` and `frontend/src/components/generic/Card/FeaturedCard.tsx` into `frontend/src/utils/api.ts` (per Constitution V: env vars MUST be consumed through a single shared utility) (contradicts)
- [x] T056 [HIGH] Ensure cached book list pages cannot report `hasNextPage: true` for an empty next page: review the list route's `staleTtlSeconds` (`BOOK_LIST_TTL * 6` in `backend/src/routes/bookRouter.ts`) and confirm cache invalidation covers out-of-band data changes, per FR-010 (partial)
- [x] T057 [MEDIUM] Resolve FR-005 (admin section transitions): either add section switching to `frontend/src/components/AdminDashboard/AdminDashboard.tsx` or amend FR-005 in `spec.md` to match the single-page dashboard layout, per FR-005 (missing)
- [x] T058 [LOW] Remove or use `frontend/src/types/navigation.ts` (`NavigationState` and `ScrollHistory` are unused, and plan Key Entities says no scroll history is stored), per T004 (unrequested)
