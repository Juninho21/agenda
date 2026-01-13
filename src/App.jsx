import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { supabase } from './supabaseClient'
import CalendarApp from "./Components/CalendarApp"
import Login from "./Components/Login"

import Activities from "./Components/Activities"
import Settings from "./Components/Settings"
import CompanySettings from "./Components/CompanySettings"
import Products from "./Components/Products"
import Clients from "./Components/Clients"
import UserManagement from "./Components/UserManagement"
import Quotes from "./Components/Quotes"
import './Components/CalendarApp.css'

import Layout from "./Components/Layout"

const App = () => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="container" style={{ color: '#fff', fontSize: '2rem' }}>
        Carregando...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

        {/* Protected Routes with Layout (Header + Navbar) */}
        <Route element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<CalendarApp />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/company" element={<CompanySettings />} />
          <Route path="/settings/clients" element={<Clients />} />
          <Route path="/settings/products" element={<Products />} />
          <Route path="/settings/users" element={<UserManagement />} />
          <Route path="/settings/quotes" element={<Quotes />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App