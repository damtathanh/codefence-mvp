import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// AuthProvider is already in App.tsx, no need to duplicate here
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)