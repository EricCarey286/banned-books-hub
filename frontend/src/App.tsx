import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import './App.css';
import BookList from './components/BookList/BookList';
import FeaturedBook from './components/FeaturedBook/FeaturedBook';
import SuggestBookForm from './components/SuggestBookForm/SuggestBookForm';
import ContactForm from './components/ContactForm/ContactForm';
import AdminLogin from './components/AdminLogin/AdminLogin';
import AdminDashboard from './components/AdminDashboard/AdminDashboard'

const API_URL = import.meta.env.VITE_API_URL; //backend URL
const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check if the admin is authenticated when the app loads
    const checkAuth = async () => {
      const response = await fetch(`${URL_PREFIX}://${API_URL}/api/admin`, { credentials: "include" });
      setIsAuthenticated(response.ok);
    };
    checkAuth();
  }, []);

  return (
    <Router>
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
              <ContactForm apiUrl={API_URL} />
            </>
          }
        />

        {/* Admin Login Route */}
        <Route path="/login" element={<AdminLogin setAuth={setIsAuthenticated} apiUrl={API_URL} />} />

        {/* Protected Admin Route */}
        <Route
          path="/admin"
          element={isAuthenticated ? <AdminDashboard setAuth={setIsAuthenticated}/> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
