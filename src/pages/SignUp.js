import { useState } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, set, query, orderByChild, equalTo, get } from "firebase/database";
import "./SignUp.css";

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    role: "", // Default empty role, to force selection
    businessName: "", // New business name for employers
  });

  const navigate = useNavigate();
  const { firstname, lastname, email, password, role, businessName } = formData;

  // Update form data when typing in input fields
  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.id]: e.target.value,
    }));
  };

  // Register user with Firebase auth and store additional data in Realtime Database
  const onSubmit = async (e) => {
    e.preventDefault();

    // Prevent submission if the user has not selected a valid role
    if (role === "") {
      alert("Please select an account type.");
      return;
    }
    
    if (role === "Employer"){
    const userRef = ref(db, "users")
    const usersQuery = query (userRef, orderByChild("businessName"),equalTo(businessName))
    const snapshot = await get(usersQuery)
    if (snapshot.exists()){
    alert("Business name already exists. Try another.")
    return
    }
  }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Data to store in Firebase, including the business name if the user is an employer
      const userData = {
        firstname,
        lastname,
        email,
        role,
      };

      // If the user is an employer, include the business name in their data
      if (role === "Employer") {
        userData.businessName = businessName;
      }

      // Store user details in Realtime Database
      // Shows the business name
      await set(ref(db, "users/" + user.uid), userData);
      await set (ref(db, "businesses/" + businessName),{
        owner: user.uid
      })

      // Show browser confirmation popup
      const confirmation = window.confirm(
        "User registered successfully! Redirect to the sign-in page?"
      );
      if (confirmation) {
        // Redirect to sign-in page if they click "Ok"
        navigate("/sign-in");
      } else {
        // Stay on the current page if they click "Cancel"
        console.log("User chose to stay on the current page.");
      }
    } catch (error) {
      console.error("Error during registration:", error.message);
    }
  };

  return (
    <section className="sign-up-container">
      <div className="sign-up-box">
        <h1>Sign Up</h1>

        <form onSubmit={onSubmit}>
          {/* First Name input */}
          <input
            type="text"
            id="firstname"
            value={firstname}
            onChange={onChange}
            placeholder="First Name"
          />

          {/* Last Name input */}
          <input
            type="text"
            id="lastname"
            value={lastname}
            onChange={onChange}
            placeholder="Last Name"
          />

          {/* Email input */}
          <input
            type="email"
            id="email"
            value={email}
            onChange={onChange}
            placeholder="Email address"
          />

          <div className="password-input-container">
            {/* Password input */}
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={onChange}
              placeholder="Password"
            />

            {/* Show/hide password icon */}
            {showPassword ? (
              <AiFillEyeInvisible
                className="password-toggle-icon"
                onClick={() => setShowPassword((prevState) => !prevState)}
              />
            ) : (
              <AiFillEye
                className="password-toggle-icon"
                onClick={() => setShowPassword((prevState) => !prevState)}
              />
            )}
          </div>

          {/* Role selection dropdown */}
          <div className="roleselector">
            <select
              onChange={onChange}
              id="role"
              value={role}
              required
              style={{ marginTop: "10px" }}
            >
              <option value="">Select an account type</option>{" "}
              {/* Default option */}
              <option value="Employer">Employer</option>
              <option value="Freelancer">Freelancer</option>
            </select>
          </div>

          {/* Business Name input (only visible for Employers) */}
          {role === "Employer" && (
            <input
              type="text"
              id="businessName"
              value={businessName}
              onChange={onChange}
              placeholder="Business Name"
              required
            />
          )}

          {/* Submit button */}
          <button className="custom-btn" type="submit">
            Register
          </button>
        </form>

        {/* Links container */}
        <div className="link-container">
          <p className="sign-in-text">
            Already have an account? <Link to="/sign-in">Sign In!</Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default SignUp;
