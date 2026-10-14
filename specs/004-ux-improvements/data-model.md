# Data Model: UX Improvements

This feature primarily involves frontend component state and doesn't introduce persistent data entities. This document describes the frontend state management patterns.

## Frontend Component State

### 1. Navigation & Routing State

**Entity**: Route/Location (via React Router)

**State Variables**:
- `location` (from `useLocation()` hook) - current URL path and state
- `scrollPosition` - window.scrollY position before navigation

**Transitions**:
```
User navigates → location changes → detect via useLocation() → scroll to top → render new page
```

**Validation**: N/A (native React Router behavior)

**Related Components**:
- App.tsx (route detection)
- All page components (respond to route)

---

### 2. Image Loading State

**Entity**: ImageLoadingState (per image)

**Fields**:
- `src` (string) - image URL from props
- `isLoading` (boolean) - true while fetching from network
- `isLoaded` (boolean) - true once image renders
- `hasError` (boolean) - true if load failed

**Transitions**:
```
Initial → [setIsLoading(true)] → Fetching → [onLoad] → [setIsLoaded(true)] → Loaded
                                        ↓ [onError] → [setHasError(true)] → Error State
```

**Validation**: Image must have valid src URL; alt text required for accessibility

**Related Components**:
- OptimizedImage.tsx (NEW - custom image component)
- BookCard.tsx (uses OptimizedImage)
- BookList.tsx (renders BookCards)
- FeaturedBook.tsx (displays featured images)

---

### 3. Admin Login Modal State

**Entity**: AdminLoginModalState (in App.tsx)

**Fields**:
- `isModalOpen` (boolean) - whether to show admin login form
- `isLoginLoading` (boolean) - API call in progress
- `loginError` (string | null) - error message from failed login
- `token` (string | null, in localStorage) - JWT token from successful login
- `role` (string | null, decoded from token) - 'admin' or null

**Transitions**:
```
Init → [User clicks Admin] → [setIsModalOpen(true)] → Modal Open
                                                         ↓
                                    [User submits form] → [setIsLoginLoading(true)]
                                                         ↓
                       [API returns error] → [setLoginError(msg)] → Show Error
                                ↓
                    [API returns token] → [setToken()] → [setIsModalOpen(false)] → Logged In
                                                         ↓
                                        [Show admin dashboard]
```

**Validation**: 
- Username: required, non-empty string
- Password: required, non-empty string
- Token: must be valid JWT; must include 'admin' role

**Related Components**:
- App.tsx (owns state)
- AdminLoginModal.tsx (NEW - form component)
- Navigation.tsx (login/logout button)
- AdminDashboard.tsx (protected route)

---

### 4. Admin Session State

**Entity**: AdminSessionState (in App.tsx)

**Fields**:
- `isAuthenticated` (boolean) - user has valid token
- `isAdmin` (boolean) - token includes admin role
- `username` (string | null) - decoded from token (if available)

**Relationships**:
- Derived from `token` in localStorage
- Displayed in Navigation component
- Controls access to AdminDashboard route

**Validation**: Token must be valid JWT with 'admin' role

---

## State Management Patterns

### Pattern 1: Scroll Reset on Navigation

**Location**: App.tsx

```typescript
// Pseudo-code
const location = useLocation();

useEffect(() => {
  window.scrollTo(0, 0);
}, [location]);
```

**Dependencies**: React Router's useLocation hook

**Side Effects**: Modifies window.scrollY on route change

---

### Pattern 2: Image Lazy Loading

**Location**: OptimizedImage.tsx (NEW)

```typescript
// Pseudo-code
const [isVisible, setIsVisible] = useState(false);
const ref = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      setIsVisible(true);
      observer.unobserve(entry.target);
    }
  });
  
  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);

// Render: src={isVisible ? props.src : undefined}
```

**Dependencies**: IntersectionObserver API (modern browsers)

**Fallback**: Browsers without IntersectionObserver show images immediately

---

### Pattern 3: Admin Login Modal

**Location**: App.tsx + AdminLoginModal.tsx

**State Owner**: App.tsx (single source of truth for auth state)

**State Consumers**:
- AdminLoginModal.tsx (form submission)
- Navigation.tsx (login/logout button)
- Route guards (protect /admin routes)

**Communication**: Props down, callbacks up (no context/redux)

---

## No Persistent Data Entities

This feature does **not** create new database tables or API models. All state is:
- Transient (frontend session only)
- Derived from existing APIs (/api/admin/login)
- Stored in browser localStorage (existing token pattern)

**Why**: This is a UX flow improvement, not a data model expansion.

---

## Related Existing Entities

### Book (unchanged)

Already defined in `frontend/src/types/book.ts`:
```typescript
interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  image_url?: string;
  // ... other fields
}
```

**Usage**: BookCard, BookList display Book objects (no changes)

### AuthState (existing)

Managed in App.tsx:
```typescript
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [token, setToken] = useState(localStorage.getItem('token'));
```

**Enhancement**: Add role field to track admin status

---

## Migration Path (if needed in future)

If this feature later expands to persistent admin preferences:
1. Create new `admin_preferences` table
2. Add new API endpoint `GET /api/admin/preferences`
3. Modify App.tsx to load preferences on admin login
4. Store in component state (no new global state library)

**Current Plan**: Not needed for v1; defer to future enhancement.
