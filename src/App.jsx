import React, { useState } from 'react'
import './App.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardCajera from './pages/DashboardCajera'
import { authService } from './services/authService'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('sermab_logged_in') === 'true'
  })

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('sermab_user_role') || ''
  })

  const handleLogin = (role) => {
    // La información detallada (token, user) ya se guarda en authService.login
    // Aquí solo actualizamos el estado reactivo del rol
    setIsLoggedIn(true)
    setUserRole(role)
  }

  const handleLogout = () => {
    authService.logout()
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
