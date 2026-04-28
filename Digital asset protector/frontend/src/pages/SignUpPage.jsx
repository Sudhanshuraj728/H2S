import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, User, Building2, AlertTriangle, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react"
import { authAPI, setTokens, saveUser } from "../api.js"
import PurpleSpotlight from "../components/PurpleSpotlight.jsx"

export default function SignUpPage({ onLogin }) {
  const brandLogo = "/Gemini_Generated_Image_pszjk6pszjk6pszj.png"
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", company: "" })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [touched, setTouched] = useState({})

  const handleGoogle = () => {
    window.location.href = authAPI.googleAuthUrl("/dashboard")
  }

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))
  const blur = (field) => () => setTouched(p => ({ ...p, [field]: true }))

  const passChecks = [
    { label: "At least 6 characters", ok: form.password.length >= 6 },
    { label: "Passwords match", ok: form.password && form.confirmPassword && form.password === form.confirmPassword },
  ]

  const validate = () => {
    if (!form.firstName.trim()) return "First name is required"
    if (!form.lastName.trim()) return "Last name is required"
    if (!form.email.trim()) return "Email is required"
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email address"
    if (!form.password) return "Password is required"
    if (form.password.length < 6) return "Password must be at least 6 characters"
    if (form.password !== form.confirmPassword) return "Passwords do not match"
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true); setError("")
    try {
      const res = await authAPI.register({
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim(), password: form.password,
        company: form.company.trim() || undefined,
      })
      const data = res.data || res
      const token = data.accessToken || data.token
      const user = data.user || data
      if (token) setTokens(token, data.refreshToken || "")
      if (user) saveUser(user)
      if (onLogin) onLogin(user)
      navigate("/dashboard")
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.")
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 72px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", position: "relative", background: "#000",
    }}>
      <PurpleSpotlight />
      <div style={{ width: 350, height: 350, top: "5%", right: "-3%", background: "radial-gradient(circle, rgba(184,169,232,.06) 0%, transparent 70%)", position: "absolute", borderRadius: "50%", filter: "blur(60px)" }} />
      <div style={{ width: 300, height: 300, bottom: "5%", left: "-2%", background: "radial-gradient(circle, rgba(184,169,232,.04) 0%, transparent 70%)", position: "absolute", borderRadius: "50%", filter: "blur(50px)" }} />

      <div className="fu" style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: "#b8a9e8",
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            margin: "0 auto 20px", boxShadow: "0 0 30px rgba(184,169,232,0.2)",
          }}>
            <img src={brandLogo} alt="TRAQ logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 30, color: "#fff", marginBottom: 8 }}>Create Your Account</h1>
          <p style={{ color: "#a0a0b8", fontSize: 15 }}>Start protecting your digital assets today</p>
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
            <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>FIRST NAME *</label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                  <input className="input" placeholder="John" value={form.firstName} onChange={set("firstName")} onBlur={blur("firstName")} style={{ paddingLeft: 42 }} />
                </div>
                {touched.firstName && !form.firstName.trim() && <span style={{ fontSize: 11, color: "#e87e7e", marginTop: 4, display: "block" }}>Required</span>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>LAST NAME *</label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                  <input className="input" placeholder="Doe" value={form.lastName} onChange={set("lastName")} onBlur={blur("lastName")} style={{ paddingLeft: 42 }} />
                </div>
                {touched.lastName && !form.lastName.trim() && <span style={{ fontSize: 11, color: "#e87e7e", marginTop: 4, display: "block" }}>Required</span>}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>COMPANY <span style={{ color: "#6a6a80", fontWeight: 400 }}>(optional)</span></label>
              <div style={{ position: "relative" }}>
                <Building2 size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                <input className="input" placeholder="Your company" value={form.company} onChange={set("company")} style={{ paddingLeft: 42 }} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>EMAIL *</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={set("email")} onBlur={blur("email")} style={{ paddingLeft: 42 }} />
              </div>
              {touched.email && form.email && !/\S+@\S+\.\S+/.test(form.email) && <span style={{ fontSize: 11, color: "#e87e7e", marginTop: 4, display: "block" }}>Enter a valid email</span>}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>PASSWORD *</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                <input className="input" type={showPass ? "text" : "password"} placeholder="Min 6 characters" value={form.password} onChange={set("password")} onBlur={blur("password")} style={{ paddingLeft: 42, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6a6a80", cursor: "pointer", padding: 4 }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0b8", marginBottom: 8, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>CONFIRM PASSWORD *</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6a6a80" }} />
                <input className="input" type={showPass ? "text" : "password"} placeholder="Repeat password" value={form.confirmPassword} onChange={set("confirmPassword")} onBlur={blur("confirmPassword")} style={{ paddingLeft: 42 }} />
              </div>
            </div>

            {(form.password || form.confirmPassword) && (
              <div style={{ marginBottom: 22, display: "flex", flexDirection: "column", gap: 6 }}>
                {passChecks.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.ok ? "#b8a9e8" : "#6a6a80", transition: "color 0.3s" }}>
                    <CheckCircle size={13} style={{ opacity: c.ok ? 1 : 0.3 }} /> {c.label}
                  </div>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="cta-primary" style={{
              width: "100%", justifyContent: "center", padding: "14px 24px",
              fontSize: 15, borderRadius: 12, border: "none",
            }}>
              {loading ? (
                <><div style={{ width: 18, height: 18, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Creating account...</>
              ) : (<>Create Account <ArrowRight size={16} /></>)}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <span style={{ fontSize: 14, color: "#6a6a80" }}>
              Already have an account?{" "}
              <Link to="/signin" style={{ color: "#b8a9e8", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Sign in</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
