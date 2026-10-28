import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import './App.css';
import BookList from './components/BookList/BookList';
import FeaturedBook from './components/FeaturedBook/FeaturedBook';
import SuggestBookForm from './components/SuggestBookForm/SuggestBookForm';
import ContactForm from './components/ContactForm/ContactForm';
import AdminLogin from './components/AdminLogin/AdminLogin';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import { AdminLoginModal } from './components/AdminLogin/AdminLoginModal';
import { Navigation } from './components/Navigation';
import { useScrollToTop } from './hooks/useScrollToTop';
import { API_URL, URL_PREFIX, apiFetch, buildUrl } from './utils/api';

import ReactGA from 'react-ga4';
const TRACKING_ID = "G-SFFY2DBJ1B";
ReactGA.initialize(TRACKING_ID);

// Older builds stored the admin JWT here. It is removed on load (FR-017).
const LEGACY_TOKEN_KEY = "authToken";

// Create a component wrapper that has access to routing hooks
/**
 * Manages the application content and handles user authentication, routing, and API requests.
 *
 * Admin authentication uses an HTTP-only session cookie set by the API. The page never sees the
 * session itself. It keeps only the CSRF token (in memory) and the logged-in state, and sends
 * the CSRF token on writes through `authFetch`.
 *
 * @returns JSX elements representing the application's UI components.
 */
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState<string>("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const navigate = useNavigate();
  useScrollToTop();

  const clearSession = useCallback(() => {
    setIsAuthenticated(false);
    setUsername("");
    setCsrfToken(null);
  }, []);

  useEffect(() => {
    localStorage.removeItem(LEGACY_TOKEN_KEY);

    if (!API_URL || !URL_PREFIX) {
      console.error('Error: Missing API URL or Prefix.');
      return;
    }

    /**
     * Asks the API whether the session cookie is still valid. The cookie is sent automatically.
     * A valid session returns a fresh CSRF token, so a page reload keeps the admin signed in.
     */
    const checkAuth = async () => {
      try {
        const response = await apiFetch(buildUrl(API_URL, "/api/admin/validate"), { method: "GET" });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUsername(data.user?.username || "");
          setCsrfToken(data.csrfToken || null);
        } else {
          clearSession();
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        clearSession();
      }
    };

    checkAuth();
  }, [clearSession]);

  /**
   * Handles the login process for admin users.
   *
   * Submits the credentials. On success the API sets the session cookie and returns a CSRF token,
   * which is kept in memory, then navigates to the admin dashboard.
   *
   * @param e - The form event object that triggered the login action.
   */
  const handleLogin = async (e: React.FormEvent, username: string, password: string) => {
    e.preventDefault();
    setError("");

    try {
      const response = await apiFetch(buildUrl(API_URL, "/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.csrfToken) {
        setIsAuthenticated(true);
        setUsername(username);
        setCsrfToken(data.csrfToken);
        navigate("/admin");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
    }
  };

  /**
   * Ends the admin session on the server (clears the cookie), then resets local state.
   */
  const handleLogout = async () => {
    try {
      await apiFetch(buildUrl(API_URL, "/api/admin/logout"), { method: "POST" }, csrfToken);
    } catch (err) {
      console.error("Logout error:", err);
    }
    clearSession();
    navigate("/");
  };

  /**
   * Handles admin login from modal
   */
  const handleAdminLoginSuccess = (token: string) => {
    setIsAuthenticated(true);
    setCsrfToken(token);
    setIsAdminLoginModalOpen(false);
    navigate("/admin");
  };

  /**
   * Fetches from the API with the session cookie, and the CSRF token for writes.
   */
  const authFetch = (url: string, options: RequestInit = {}) => apiFetch(url, options, csrfToken);

  return (
    <>
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        apiUrl={API_URL}
      />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <>
              <Navigation
                isAuthenticated={isAuthenticated}
                username={username}
                onAdminClick={() => setIsAdminLoginModalOpen(true)}
                onLogout={handleLogout}
              />
              <h1>Banned Books Hub</h1>
              <p>This is a one-stop hub for finding, supporting, and reporting books that have been banned or censored.</p>
              <FeaturedBook apiUrl={API_URL} />
              <BookList apiUrl={API_URL} />
              <SuggestBookForm apiUrl={API_URL} />
              <ContactForm apiUrl={API_URL} />
            </>
          }
        />

      {/* Admin Login Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ?
            <Navigate to="/admin" /> :
            <AdminLogin
              handleLogin={handleLogin}
              error={error}
            />
        }
      />

        {/* Protected Admin Route */}
        <Route
          path="/admin"
          element={
            isAuthenticated ?
              <AdminDashboard
                apiUrl={API_URL}
                handleLogout={handleLogout}
                username={username}
                authFetch={authFetch}
              /> :
              <Navigate to="/login" />
          }
        />
      </Routes>
    </>
  );
}

/**
 * Main application component that tracks page views using Google Analytics.
 */
function App() {
  const location = useLocation();
  //Effect for Google Analytics plugin
  useEffect(() => {
    ReactGA.send({
      hitType: 'pageview',
      page: location.pathname + location.search + location.hash,
      title: document.title,
      location: window.location.href,
    });
  }, [location]);
  return (
      <AppContent />
  );
}

export default App;
