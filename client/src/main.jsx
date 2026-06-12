import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1a2332',
              color: '#e8f5f0',
              borderRadius: '12px',
              border: '1px solid rgba(45, 212, 191, 0.2)',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#2dd4bf', secondary: '#1a2332' }
            },
            error: {
              iconTheme: { primary: '#f43f5e', secondary: '#1a2332' }
            }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
