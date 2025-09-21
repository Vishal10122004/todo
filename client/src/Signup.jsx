import React, { useState } from 'react';
import './Signup.css';

function Signup({ onSignupComplete, switchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const res = await fetch('https://todo-m39x.onrender.com/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        onSignupComplete();
      } else {
        const errorText = await res.text();
        if (errorText.includes('Username already exists')) {
          setErrorMessage('Signup failed. Username already exists. Please choose another.');
        } else {
          setErrorMessage('Something went wrong. Please try again.');
        }
      }
    } catch (err) {
      setErrorMessage('Server not reachable. Please try later.');
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup} className="signup-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="signup-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="signup-input"
        />
        <button type="submit" className="signup-button">
          Sign Up
        </button>
      </form>

      {errorMessage && <p className="signup-error">{errorMessage}</p>}

      <p className="signup-switch">
        Already have an account?{' '}
        <button onClick={switchToLogin}>Log In</button>
      </p>
    </div>
  );
}

export default Signup;
