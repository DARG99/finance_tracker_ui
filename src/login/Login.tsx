import React from "react";
import "./Login.css";
import { Link } from "react-router-dom";

const Login = () => {
  return (
    <div className="login-page">
      <h3>Login</h3>
      <form className="login-form">
        <div className="login-inputGroup">
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

          <button type="button" className="btn btn-success login-btn">
            Login
          </button>
        </div>
      </form>
      <div className="login-switch">
        <p>Don't have an account?</p>
        <Link to="/" type="button" className="btn btn-primary login-btn">
          Sign up
        </Link>
      </div>
    </div>
  );
};

export default Login;
