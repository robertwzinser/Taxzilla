import React, { useEffect, useState } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import UserSettings from "./pages/UserSettings";
import DailyIncome from "./pages/DailyIncome";
import JobBoard from "./pages/JobBoard";
import Generate1099 from "./pages/1099";
import Expenses from "./pages/Expenses";
import Layout from "./components/Navbar/Layout";
import Messaging from "./components/Messaging";
import Deductions from './pages/Deductions';
import { onAuthStateChanged } from "firebase/auth"; // Import Firebase auth listener
import { auth } from "./firebase"; // Import your Firebase config
import FreelancerExpenses from "./pages/FreelancerExpenses";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state to wait for auth check

  useEffect(() => {
    // Listen for changes in the user's authentication state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true); // User is authenticated
      } else {
        setIsLoggedIn(false); // User is not authenticated
      }
      setLoading(false); // Set loading to false after auth check
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div></div>;
  }

  return (
    <Router>
      <Routes>
        {/* Default route - redirect to sign-in if not logged in */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/sign-in" />
            )
          }
        />

        {/* Public routes */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />

        {/* Protected routes */}
        <Route path="/" element={<Layout />}>
          <Route
            path="/dashboard"
            element={isLoggedIn ? <Dashboard /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/inbox"
            element={isLoggedIn ? <Messaging /> : <Navigate to="/inbox" />}
          />
          <Route
            path="/profile"
            element={isLoggedIn ? <Profile /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/user-settings"
            element={isLoggedIn ? <UserSettings /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/daily-income"
            element={isLoggedIn ? <DailyIncome /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/expenses"
            element={isLoggedIn ? <Expenses /> : <Navigate to="/sign-in" />}
          />
           <Route
            path="/freelancerexpenses"
            element={isLoggedIn ? <FreelancerExpenses /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/job-board"
            element={isLoggedIn ? <JobBoard /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/generate-1099"
            element={isLoggedIn ? <Generate1099 /> : <Navigate to="/sign-in" />}
          />
          <Route 
            path="/deductions" 
            element={isLoggedIn ? <Deductions /> : <Navigate to="/sign-in" />} 
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
