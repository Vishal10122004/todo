import React, { useState } from 'react';
import './Login.css';

function Login({ onLoginSuccess, switchToSignup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const res = await fetch('https://todo-m39x.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        onLoginSuccess(username);
      } else {
        const errorText = await res.text();
        if (errorText.includes('Invalid credentials')) {
          setErrorMessage("Account doesn't exist or password is wrong. Please sign up if needed.");
        } else {
          setErrorMessage('Something went wrong. Please try again.');
        }
      }
    } catch (err) {
      setErrorMessage('Server not reachable. Please try later.');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="login-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="login-input"
        />
        <button type="submit" className="login-button">
          Login
        </button>
      </form>

      {errorMessage && <p className="login-error">{errorMessage}</p>}

      <p className="login-switch">
        Don’t have an account?{' '}
        <button onClick={switchToSignup}>Sign Up</button>
      </p>
    </div>
  );
}

export default Login;
