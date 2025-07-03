import React, { useEffect, useState } from "react";
import "./App.css";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import UserSettings from "./pages/UserSettings";
import DailyIncome from "./components/RoleWidgets/Freelancer/DailyIncome";
import JobBoard from "./pages/JobBoard";
import TaxSummary from "./pages/TaxSummary";
import Reimbursements from "./pages/Reimbursements";
import Layout from "./components/Navbar/Layout";
import AboutPage from "./pages/About";
import Messaging from "./components/Messaging/Messaging";
import Deductions from "./pages/Deductions";
import GlobalNotification from "./components/Notifications/GlobalNotification";
import ReceiptUploader from "./pages/ReceiptUploader";
import { onAuthStateChanged } from "firebase/auth"; // Import Firebase auth listener
import { auth } from "./firebase"; // Import your Firebase config

import FreelancerDetail from "./components/RoleWidgets/Employer/FreelancerDetail";
import AddIncomeForm from "./components/RoleWidgets/Employer/AddIncomeForm";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div></div>; // Loading state
  }

  const handleSelectedMessagingUser = (user) => {
      setSelectedUser(user)
  }
  return (
    <Router>
      {isLoggedIn && <GlobalNotification />}{" "}
      {/* Show GlobalNotification only if logged in */}
      <Routes>
        {/* Default route */}
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
            element={isLoggedIn ? <Messaging /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/profile/:uid"
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
            path="/job-board"
            element={isLoggedIn ? <JobBoard /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/tax-summary"
            element={isLoggedIn ? <TaxSummary /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/deductions"
            element={isLoggedIn ? <Deductions /> : <Navigate to="/sign-in" />}
          />
          <Route
            path="/uploader"
            element={isLoggedIn ? <ReceiptUploader /> : <Navigate to="/uploader" />}
          />
          <Route
            path="/reimbursements"
            element={
              isLoggedIn ? <Reimbursements /> : <Navigate to="/sign-in" />
            }
          />
          <Route
            path="/freelancer/:freelancerId"
            element={
              isLoggedIn ? <FreelancerDetail /> : <Navigate to="/sign-in" />
            }
          />
          <Route
            path="/add-income/:freelancerId"
            element={
              isLoggedIn ? <AddIncomeForm /> : <Navigate to="/sign-in" />
            }
          />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
