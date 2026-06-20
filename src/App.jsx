import React, { useState } from 'react'
import './App.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardCajera from './pages/DashboardCajera'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('sermab_logged_in') === 'true'
  })

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('sermab_user_role') || ''
  })

  const handleLogin = (role) => {
    localStorage.setItem('sermab_logged_in', 'true')
    localStorage.setItem('sermab_user_role', role)
    setIsLoggedIn(true)
    setUserRole(role)
  }

  const handleLogout = () => {
    localStorage.removeItem('sermab_logged_in')
    localStorage.removeItem('sermab_user_role')
    setIsLoggedIn(false)
    setUserRole('')
  }

  return isLoggedIn ? (
    userRole === 'admin' ? (
      <Dashboard onLogout={handleLogout} />
    ) : (
      <DashboardCajera onLogout={handleLogout} />
    )
  ) : (
    <Login onLogin={handleLogin} />
  )
}

export default App
