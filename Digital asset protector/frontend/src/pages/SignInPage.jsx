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
