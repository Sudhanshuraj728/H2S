import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { authAPI, clearTokens, saveUser, setTokens } from "../api.js"
import PurpleSpotlight from "../components/PurpleSpotlight.jsx"

export default function OAuthGoogleCallback({ onLogin }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = (location.hash || location.search || "").replace(/^[#?]/, "")
    const params = new URLSearchParams(raw)
    const accessToken = params.get("accessToken")
    const refreshToken = params.get("refreshToken")
    const redirect = params.get("redirect") || "/dashboard"
    const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard"

    window.history.replaceState({}, document.title, location.pathname)

    if (!accessToken) {
      setError("Google sign in failed. Please try again.")
      setLoading(false)
      return
    }

    setTokens(accessToken, refreshToken || "")
    authAPI.me()
      .then((res) => {
        const user = res.data?.user || res.data || res.user || res
        if (user) saveUser(user)
        if (onLogin) onLogin(user)
        navigate(safeRedirect, { replace: true })
      })
      .catch(() => {
        clearTokens()
        setError("Could not finish sign in. Please try again.")
        setLoading(false)
      })
  }, [location.hash, location.search, location.pathname, navigate, onLogin])

  return (
    <div style={{
      minHeight: "calc(100vh - 72px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      position: "relative",
      background: "#000",
    }}>
      <PurpleSpotlight />
      <div style={{ width: 360, height: 360, top: "10%", left: "-5%", background: "radial-gradient(circle, rgba(184,169,232,.06) 0%, transparent 70%)", position: "absolute", borderRadius: "50%", filter: "blur(60px)" }} />
      <div style={{ width: 280, height: 280, bottom: "10%", right: "0%", background: "radial-gradient(circle, rgba(184,169,232,.04) 0%, transparent 70%)", position: "absolute", borderRadius: "50%", filter: "blur(50px)" }} />

      <div className="fu" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 2 }}>
        <div className="glass" style={{ borderRadius: 20, padding: "32px 28px", textAlign: "center" }}>
          {loading && (
            <>
              <div style={{ width: 42, height: 42, margin: "0 auto 16px", border: "3px solid rgba(184,169,232,0.3)", borderTopColor: "#b8a9e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Signing you in</h2>
              <p style={{ color: "#a0a0b8", fontSize: 14 }}>Finalizing your Google account...</p>
            </>
          )}

          {!loading && error && (
            <>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 10 }}>Sign in failed</h2>
              <p style={{ color: "#e87e7e", fontSize: 14, marginBottom: 20 }}>{error}</p>
              <Link to="/signin" className="cta-secondary" style={{ justifyContent: "center", width: "100%" }}>Back to Sign In</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
