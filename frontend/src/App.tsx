import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import './App.css';
import BookList from './components/BookList/BookList';
import FeaturedBook from './components/FeaturedBook/FeaturedBook';
import SuggestBookForm from './components/SuggestBookForm/SuggestBookForm';
import ContactForm from './components/ContactForm/ContactForm';
import AdminLogin from './components/AdminLogin/AdminLogin';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';

import ReactGA from 'react-ga4';
const TRACKING_ID = "G-SFFY2DBJ1B";
ReactGA.initialize(TRACKING_ID);

const API_URL = import.meta.env.VITE_API_URL; //backend URL
const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

// Create a component wrapper that has access to routing hooks
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  
  // Helper function to get the auth token
  const getAuthToken = () => localStorage.getItem("authToken");
  
  // Helper function to get authorization headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {Authorization: `Bearer Empty`};
  }, []);
  
  useEffect(() => {
    if (!API_URL || !URL_PREFIX) {
      console.error('Error: Missing API URL or Prefix.');
      return;
    }
  
    const checkAuth = async () => {
      const token = getAuthToken();
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
  
      try {
        // Validate the token with the backend
        const response = await fetch(`${URL_PREFIX}://${API_URL}/api/admin/validate`, { 
          method: "GET",
          headers: getAuthHeaders(),
        });
  
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUsername(data.user?.username || "");
        } else {
          // Token is invalid, remove it
          localStorage.removeItem("authToken");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        localStorage.removeItem("authToken");
        setIsAuthenticated(false);
      }
    };
  
    checkAuth();
  }, [location.pathname, getAuthHeaders]); // Re-check auth when path changes

  const handleLogin = async (e: React.FormEvent, username: string, password: string) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${URL_PREFIX}://${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem("authToken", data.token);
        setIsAuthenticated(true);
        setUsername(username);
        navigate("/admin");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
    }
  };

  const handleLogout = () => {
    // With JWT, we just need to remove the token from localStorage
    localStorage.removeItem("authToken");
    setIsAuthenticated(false);
    setUsername("");
    navigate("/login");
  };

  // Function to make authenticated requests
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const authHeaders = getAuthHeaders();
    const headers = {
      ...options.headers,
      ...(authHeaders.Authorization ? authHeaders : {}), // Only add if Authorization exists
    };
  
    return fetch(url, { ...options, headers });
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <>
            <h1>Banned Books Hub</h1>
            <p>This is a one-stop hub for finding, supporting, and reporting books that have been banned or censored.</p>
            <FeaturedBook apiUrl={API_URL} />
            <BookList apiUrl={API_URL} />
            <SuggestBookForm apiUrl={API_URL} />
            <ContactForm apiUrl={API_URL} authFetch={authFetch}/>
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
  );
}

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
