import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, AlertTriangle, Eye, EyeOff, ArrowRight } from "lucide-react"
import { authAPI, setTokens, saveUser } from "../api.js"
import PurpleSpotlight from "../components/PurpleSpotlight.jsx"

export default function SignInPage({ onLogin }) {
  const brandLogo = "/Gemini_Generated_Image_pszjk6pszjk6pszj.png"
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [touched, setTouched] = useState({})

  const handleGoogle = () => {
    window.location.href = authAPI.googleAuthUrl("/dashboard")
  }

  const validate = () => {
    if (!email.trim()) return "Email is required"
    if (!/\S+@\S+\.\S+/.test(email)) return "Enter a valid email address"
    if (!password) return "Password is required"
    if (password.length < 6) return "Password must be at least 6 characters"
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true); setError("")
    try {
      const res = await authAPI.login({ email, password })
      const data = res.data || res
      const token = data.accessToken || data.token
      const refresh = data.refreshToken || ""
      const user = data.user || data
      if (token) setTokens(token, refresh)
      if (user) saveUser(user)
      if (onLogin) onLogin(user)
      navigate("/dashboard")
    } catch (err) {
      // Show specific error messages
      let errorMsg = err.message || "Invalid email or password"
      if (err.message.includes("does not exist") || err.message.includes("No account found")) {
        errorMsg = "No account found with this email. Please sign up first."
      } else if (err.message.includes("Invalid") || err.message.includes("Incorrect")) {
        errorMsg = err.message
      }
      setError(errorMsg)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 72px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", position: "relative", background: "#000",
    }}>
      <PurpleSpotlight />
      <div style={{ width: 400, height: 400, top: "10%", left: "-5%", background: "radial-gradient(circle, rgba(184,169,232,.06) 0%, transparent 70%)", position: "absolute", borderRadius: "50%", filter: "blur(60px)" }} />
      <div style={{ width: 300, height: 300, bottom: "10%", right: "0%", background: "radial-gradient(circle, rgba(184,169,232,.04) 0%, transparent 70%)", position: "absolute", borderRadius: "50%", filter: "blur(50px)" }} />

      <div className="fu" style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, background: "#b8a9e8",
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            margin: "0 auto 20px", boxShadow: "0 0 30px rgba(184,169,232,0.2)",
          }}>
            <img src={brandLogo} alt="TRAQ logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 30, color: "#fff", marginBottom: 8 }}>Welcome Back</h1>
          <p style={{ color: "#a0a0b8", fontSize: 15 }}>Sign in to your TRAQ workspace</p>
        </div>

        <div className="glass" style={{ borderRadius: 20, padding: "36px 32px" }}>
          {error && (
            <div className="fu" style={{
              background: "rgba(232,126,126,0.06)", border: "1px solid rgba(232,126,126,0.15)",
              borderRadius: 12, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 20, fontSize: 13, color: "#e87e7e",
            }}><AlertTriangle size={16} /> {error}</div>
          )}

          <button type="button" onClick={handleGoogle} className="cta-secondary" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 31.4 29.2 34 24 34c-5.5 0-10.2-3.7-11.7-8.8-.3-.9-.4-1.9-.4-3 0-1 .1-2 .4-3 1.5-5.1 6.2-8.8 11.7-8.8 3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.2 4.1 29.4 2 24 2 14.8 2 7.2 7.6 4.5 15.7c-.8 2.3-1.3 4.8-1.3 7.3 0 2.5.5 5 1.3 7.3C7.2 40.4 14.8 46 24 46c9.4 0 17.2-6.2 19.6-14.7.5-1.8.8-3.7.8-5.8 0-1-.1-2-.3-3z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.2 4.1 29.4 2 24 2 16 2 9.1 6.5 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 46c5.1 0 9.8-2 13.3-5.2l-6.2-5.1C29.1 37.1 26.7 38 24 38c-5.2 0-9.7-3.3-11.4-8.1l-6.5 5C9 41.5 16 46 24 46z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.4-6.2 6.7l6.2 5.1c3.6-3.3 5.7-8.1 5.7-13.3 0-2.1-.3-4.1-.7-6z"/>
              </svg>
            </span>
            Continue with Google
          </button>
          <div style={{ textAlign: "center", color: "#6a6a80", fontSize: 12, marginBottom: 14 }}>or</div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>EMAIL</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                <input className="input" type="email" placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)} onBlur={() => setTouched(p => ({ ...p, email: true }))}
                  style={{ paddingLeft: 42 }} />
              </div>
              {touched.email && !email && <span style={{ fontSize: 12, color: "#e87e7e", marginTop: 4, display: "block" }}>Email is required</span>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                <input className="input" type={showPass ? "text" : "password"} placeholder="Min 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)} onBlur={() => setTouched(p => ({ ...p, password: true }))}
                  onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                  style={{ paddingLeft: 42, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#6a6a80", cursor: "pointer", padding: 4,
                }}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {touched.password && password && password.length < 6 && <span style={{ fontSize: 12, color: "#e87e7e", marginTop: 4, display: "block" }}>Password must be at least 6 characters</span>}
            </div>

            <button type="submit" disabled={loading} className="cta-primary" style={{
              width: "100%", justifyContent: "center", padding: "14px 24px",
              fontSize: 15, borderRadius: 12, border: "none",
            }}>
              {loading ? (
                <><div style={{ width: 18, height: 18, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Signing in...</>
              ) : (<>Sign In <ArrowRight size={16} /></>)}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <span style={{ fontSize: 14, color: "#6a6a80" }}>
              Don't have an account?{" "}
              <Link to="/signup" style={{ color: "#b8a9e8", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Create one</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
