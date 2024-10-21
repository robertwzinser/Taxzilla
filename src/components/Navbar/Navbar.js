import React from "react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { ref, remove, onValue, equalTo, query, orderByChild, get } from "firebase/database";
import "./Navbar.css";

const Navbar = () => {
  const [firstname, setFirstname] = useState("User"); // Default to "User"
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true) 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading (true)
      console.log ("test")
      if (user) {
        const userId = user.uid;

        const userRef = ref(db, "users/" + userId);
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            setUserRole(userData.role || "No role assigned");
            setFirstname(userData.firstname || "User"); // Fetch firstname from Firebase
          }
        }); 
      } else {
        // User is signed out
        setUserRole(""); // Reset role or handle as needed
        setLoading(false);
      }
    });
    
     return () => unsubscribe(); // Clean up the subscription
  }, []);

  return (
    <nav className="navbar">
      {/* Left-side buttons */}
      <div className="left-buttons">
        <Link to="/dashboard" className="nav-item left">
          Dashboard
        </Link>
        <Link to="/job-board" className="nav-item left">
          Job Board
        </Link>
        <Link to="/inbox" className="nav-item left">
          Inbox
        </Link>
      </div>

      {/* Right-side buttons */}
      <div className="right-buttons">
        {userRole === "Employer"? 
       <Link to="/freelancerexpenses" className="nav-item profile-btn">
       FreelancerExpenses
     </Link>:
     <Link to="/expenses" className="nav-item profile-btn">
     Expenses
   </Link>
        }
        
        <Link to="/profile" className="nav-item profile-btn">
          Profile
        </Link>
        <Link to="/user-settings" className="nav-item settings-btn">
          Settings
        </Link>
        <Link to="/generate-1099" className="nav-item settings-btn">
          Generate 1099
        </Link>
        <Link to="/deductions" className="nav-item settings-btn">
            Deductions
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
