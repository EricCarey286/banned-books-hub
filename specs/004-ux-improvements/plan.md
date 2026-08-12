# Implementation Plan: UX Improvements

**Branch**: `004-ux-improvements` | **Date**: 2026-08-12 | **Spec**: [Feature Spec](./spec.md)

**Input**: Feature specification from `/specs/004-ux-improvements/spec.md`

## Summary

This feature improves user experience by addressing three key friction points:
1. **Auto-scroll to top on navigation** - React Router scroll reset on route changes
2. **Seamless admin navigation** - Integrated login modal and dashboard switching without context loss
3. **Faster image loading** - Image optimization and lazy loading strategies

The implementation is frontend-only, leveraging React Router's location-aware behavior, modal UI patterns, and modern image loading techniques. No backend API changes required.

## Technical Context

**Language/Version**: TypeScript (React 18, Node.js 18+)

**Primary Dependencies**: React Router v6, Tailwind CSS v4, React hooks (useState, useEffect, useLocation)

**Storage**: N/A (frontend state only; auth token in localStorage per existing pattern)

**Testing**: Manual testing (no automated test framework configured per constitution)

**Target Platform**: Web browsers (desktop + mobile)

**Project Type**: React SPA with Express backend

**Performance Goals**: 
- Page transitions complete in <100ms
- Images load in <2 seconds on 3G/4G
- Admin login form appears in <50ms

**Constraints**:
- No new global state library (per constitution Principle IV)
- Auth state managed in App.tsx only
- All image URLs served from MinIO via env vars

**Scale/Scope**: 
- 3 main pages (home, books list, book detail)
- 3 admin sections (books, contact forms, suggested books)
- 100+ book images per session

## Constitution Check

**Gate Status**: ✅ PASS - Feature complies with all core principles

| Principle | Assessment | Details |
|-----------|-----------|---------|
| I. Security-First | ✅ Pass | Admin login already uses JWT; no security-adjacent changes |
| II. Layered Architecture | ✅ Pass | Frontend-only feature; no backend changes; existing routes/services unchanged |
| III. Validation at Boundary | ✅ Pass | No new validation logic required |
| IV. Lean Frontend State | ✅ Pass | Auth state remains in App.tsx; scroll/image loading state is local component state |
| V. Environment-Driven Config | ✅ Pass | Image URLs already from env vars; no new configuration needed |

**Post-Design Re-check**: Will re-validate after Phase 1 design artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/004-ux-improvements/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # (Phase 0 - if needed)
├── data-model.md        # (Phase 1 - if applicable)
├── quickstart.md        # (Phase 1 - validation guide)
├── contracts/           # (Phase 1 - if applicable)
└── checklists/
    └── requirements.md  # Quality validation
```

### Source Code (repository)

```text
frontend/
├── src/
│   ├── App.tsx                    # Modify: add scroll handler on route change
│   ├── components/
│   │   ├── AdminLogin/
│   │   │   └── AdminLoginModal.tsx     # NEW: modal-based admin login
│   │   ├── AdminDashboard/
│   │   │   └── AdminDashboard.tsx      # Modify: add "Back to Main" button
│   │   ├── BookList/
│   │   │   └── BookList.tsx            # Modify: add lazy loading for images
│   │   ├── FeaturedBook/
│   │   │   └── FeaturedBook.tsx        # Modify: optimize image loading
│   │   ├── generic/
│   │   │   ├── Card/
│   │   │   │   └── BookCard.tsx        # Modify: lazy load images
│   │   │   └── Image/
│   │   │       └── OptimizedImage.tsx  # NEW: lazy loading wrapper
│   │   └── Navigation/
│   │       └── Navigation.tsx          # Modify: add Admin link
│   ├── hooks/
│   │   └── useScrollToTop.ts           # NEW: custom hook for scroll reset
│   ├── types/
│   │   └── book.ts                     # Already exists
│   └── utils/
│       └── api.ts                      # Already exists
└── tests/                              # Manual testing (no automated framework)

backend/
├── src/
│   └── routes/
│       └── bookImageRouter.ts          # Already optimized; no changes needed
└── .env                                # No changes needed
```

**Structure Decision**: Feature modifies existing frontend structure with minimal new files:
- 2 new components (AdminLoginModal, OptimizedImage)
- 1 new hook (useScrollToTop)
- 5-6 component modifications (scroll reset, lazy loading)
- No backend changes required

## Phase 0: Research (if NEEDS CLARIFICATION exists)

**Status**: ✅ No clarifications needed - Spec is complete and unambiguous

No research.md needed. All technical decisions are straightforward:
- React Router provides `useLocation()` hook for route detection
- Modal pattern is standard React UI
- Lazy loading via standard HTML `loading="lazy"` attribute and IntersectionObserver
- Image optimization via existing MinIO CDN serving

## Phase 1: Design Artifacts

### Design Decisions & Patterns

**1. Scroll-to-Top Implementation**
- Use React Router's `useLocation()` hook in App.tsx
- Trigger window.scrollTo(0, 0) on location change
- Debounce to prevent scroll jank during rapid navigation
- Handle browser back/forward with scroll restoration where possible

**2. Admin Login Modal Pattern**
- Create reusable AdminLoginModal component (uncontrolled)
- Show modal on "Admin" link click
- Preserve main app context (don't unmount App children)
- Modal contains simple form (username/password) with existing login endpoint
- On success, close modal and update App.tsx auth state
- On error, show inline error message in modal

**3. Navigation Between Contexts**
- Add "Back to Main" button in AdminDashboard header
- Clicking returns to /admin route and shows "Not authenticated" state
- Alternative: show a dropdown in navigation showing login status and quick logout

**4. Image Optimization Strategy**
- Use native HTML `loading="lazy"` for initial page load
- Implement IntersectionObserver for below-fold images on scrolling pages
- Add placeholder/skeleton while image loads (optional Tailwind animations)
- Serve images from MinIO with CDN headers (already configured)
- No image resizing/compression needed (MinIO handles via URL params if needed)

**5. Admin Context Switching**
- Store admin login state in App.tsx (existing pattern)
- Add computed property: `isAdminLoggedIn = !!token && role === 'admin'`
- Navigation shows "Log in" vs "Log out" based on state
- No second authentication state variable needed

### Key Entities (Frontend State)

- **NavigationState**: Current route from useLocation()
- **ImageLoadingState**: Loading, loaded, error for each image via useEffect
- **AdminSessionState**: Token + role stored in localStorage (existing)
- **ModalOpenState**: Boolean for AdminLoginModal visibility

### Contracts (UI/Component)

No external API contracts needed. All changes are internal component refactoring.

**However, document these component interfaces**:

1. **OptimizedImage Component** (NEW)
   ```
   Props:
   - src: string (image URL)
   - alt: string (alt text)
   - className?: string (Tailwind classes)
   - placeholderClassName?: string (skeleton styling)
   
   Behavior:
   - Shows placeholder while loading
   - Lazy loads on scroll (IntersectionObserver)
   - Handles load and error states
   ```

2. **AdminLoginModal Component** (NEW)
   ```
   Props:
   - isOpen: boolean
   - onClose: () => void
   - onLoginSuccess: (token: string, role: string) => void
   
   Behavior:
   - Shows modal form with username/password fields
   - Calls existing /api/admin/login endpoint
   - Displays inline errors
   - Closes and callbacks on success
   ```

3. **useScrollToTop Hook** (NEW)
   ```
   Behavior:
   - Detects route changes via useLocation()
   - Scrolls to top (0,0) on navigation
   - Debounced to prevent rapid scroll calls
   - Works with browser back/forward
   ```

### Validation Guide (quickstart.md)

See quickstart.md for end-to-end test scenarios.

## Complexity Tracking

> No constitution violations — feature fully compliant.

---

## Next Phase

**Phase 2**: Tasks generation via `/speckit-tasks` will break this plan into:
- Component modification tasks (scroll reset, lazy loading)
- Component creation tasks (modal, optimized image)
- Hook creation task
- Integration/testing tasks

**Estimated Effort**: Medium (10-15 tasks, 2-3 day implementation)

**Risk Factors**: 
- Image lazy loading browser compatibility (mitigated by fallback to eager loading)
- Modal focus management (Tailwind + built-in HTML patterns sufficient)
- Scroll performance on mobile (tested manually after implementation)
