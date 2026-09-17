import React from "react";
import "./Signup.css";
import { Link } from "react-router-dom";

const Signup = () => {
  return (
    <div className="signup-page">
      <h3>Sign up</h3>
      <form className="signup-form">
        <div className="signup-inputGroup">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            autoComplete="off"
            placeholder="Enter your name"
          />
          <label htmlFor="email">Email:</label>
          <input
            type="text"
            id="email"
            autoComplete="off"
            placeholder="Enter your email"
          />
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            autoComplete="off"
            placeholder="Enter your password"
          />

          <button type="button" className="btn btn-success signup-btn">
            Sign up
          </button>
        </div>
      </form>
      <div className="signup-login">
        <p>Already have an account?</p>
        <Link to="/login" className="btn btn-primary signup-btn">
          Login
        </Link>
      </div>
    </div>
  );
};

export default Signup;
