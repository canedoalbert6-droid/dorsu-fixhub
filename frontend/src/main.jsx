import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios';
import { clearAuth } from './models/authModel';
import './index.css'
import App from './App.jsx'

// Axios global interceptor for session expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Only clear if it's an auth error (not rate limit or validation)
      if (error.response.data?.error?.includes('token') || error.response.data?.error?.includes('denied')) {
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
