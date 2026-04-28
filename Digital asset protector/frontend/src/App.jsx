import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/Layout"
import LandingPage from "./pages/LandingPage"
import SignInPage from "./pages/SignInPage"
import SignUpPage from "./pages/SignUpPage"
import OAuthGoogleCallback from "./pages/OAuthGoogleCallback"
import DashboardApp from "./pages/DashboardApp"
import { getToken, getSavedUser, clearTokens, authAPI, saveUser } from "./api.js"

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getToken()
      const saved = getSavedUser()
      if (token) {
        try {
          const res = await authAPI.me()
          const u = res.data?.user || res.data || res.user || res
          setUser(u)
          saveUser(u)
        } catch {
          if (saved) setUser(saved)
          else clearTokens()
        }
      }
      setLoading(false)
    }
    checkSession()
  }, [])

  const handleLogin = (userData) => setUser(userData)
  const handleLogout = () => { setUser(null); clearTokens() }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#03080f",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 32, height: 32,
            border: "3px solid #00d4ff", borderTopColor: "transparent",
            borderRadius: "50%", animation: "spin .8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: "#7a95b0", fontFamily: "Poppins" }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes with Navbar */}
        <Route element={<Layout />}>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/signin" element={user ? <Navigate to="/dashboard" /> : <SignInPage onLogin={handleLogin} />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <SignUpPage onLogin={handleLogin} />} />
          <Route path="/oauth/google" element={<OAuthGoogleCallback onLogin={handleLogin} />} />
        </Route>

        {/* Protected dashboard */}
        <Route path="/dashboard" element={
          user ? <DashboardApp user={user} onLogout={handleLogout} />
               : <Navigate to="/signin" />
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}