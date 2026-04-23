import { Link } from "react-router-dom"
import { Shield } from "lucide-react"

export default function Navbar() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      padding: "0 40px", height: 72,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(184,169,232,0.06)",
    }}>
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", cursor: "pointer" }}>
        <div style={{
          width: 40, height: 40, background: "#b8a9e8",
          borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(184,169,232,0.2)",
        }}>
          <Shield size={20} color="#000" strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20, color: "#fff" }}>OptiPrimes</span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link to="/signin" style={{
          padding: "10px 24px", borderRadius: 10,
          color: "#a0a0b8", fontSize: 14, fontWeight: 500,
          fontFamily: "'Poppins', sans-serif",
          textDecoration: "none", transition: "all 0.25s ease", cursor: "pointer",
        }}
          onMouseEnter={e => e.target.style.color = "#b8a9e8"}
          onMouseLeave={e => e.target.style.color = "#a0a0b8"}
        >Sign In</Link>
        <Link to="/signup" style={{
          padding: "10px 24px", borderRadius: 10,
          background: "#b8a9e8", color: "#000",
          fontSize: 14, fontWeight: 700,
          fontFamily: "'Poppins', sans-serif",
          textDecoration: "none", transition: "all 0.3s ease", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(184,169,232,0.2)",
        }}
          onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 24px rgba(184,169,232,0.35)"; e.target.style.background = "#c9bdf0" }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 16px rgba(184,169,232,0.2)"; e.target.style.background = "#b8a9e8" }}
        >Create Account</Link>
      </div>
    </nav>
  )
}
