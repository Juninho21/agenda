import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { supabase } from './supabaseClient'
import CalendarApp from "./Components/CalendarApp"
import Login from "./Components/Login"
import Navbar from "./Components/Navbar"
import Activities from "./Components/Activities"
import Settings from "./Components/Settings"
import CompanySettings from "./Components/CompanySettings"
import './Components/CalendarApp.css'

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

        {/* Protected Routes with Navbar */}
        <Route element={session ? (
          <div className="container">
            <Outlet />
            <Navbar />
          </div>
        ) : (
          <Navigate to="/login" />
        )
        }>
          <Route path="/" element={<CalendarApp />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/company" element={<CompanySettings />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App