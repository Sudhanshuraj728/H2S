import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import {
  Shield, Fingerprint, Scan, Zap, Globe, Lock, ArrowRight, Star, Activity,
  AlertTriangle, ShieldOff, Eye, EyeOff as EyeOffIcon, TrendingDown, Radio,
  ShieldCheck, Radar, BellRing, Bot, Upload, SearchCheck,
  ExternalLink, GitFork, Mail, FileText, Users, BookOpen, Code2
} from "lucide-react"

function useTypewriter(text, speed = 40, delay = 600) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)
  useEffect(() => {
    let i = 0
    const timeout = setTimeout(() => {
      const iv = setInterval(() => {
        if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++ }
        else { clearInterval(iv); setDone(true) }
      }, speed)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(timeout)
  }, [text, speed, delay])
  return { displayed, done }
}

/* ═══ Scroll Reveal Hook ═══ */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ═══ Purple Spotlight Component (only for landing page) ═══ */
function PurpleSpotlight() {
  const spotRef = useRef(null)

  useEffect(() => {
    const spot = spotRef.current
    if (!spot) return

    const onMove = (e) => {
      spot.style.left = e.clientX + "px"
      spot.style.top = e.clientY + "px"
      spot.style.opacity = "1"
    }

    const onLeave = () => { spot.style.opacity = "0" }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", onLeave)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  return (
    <div ref={spotRef} style={{
      position: "fixed",
      width: 350,
      height: 350,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(184,169,232,0.12) 0%, rgba(184,169,232,0.06) 30%, rgba(184,169,232,0.02) 50%, transparent 70%)",
      pointerEvents: "none",
      zIndex: 10,
      transform: "translate(-50%, -50%)",
      transition: "opacity 0.3s ease",
      opacity: 0,
      mixBlendMode: "screen",
    }} />
  )
}

export default function LandingPage() {
  const subtitle = "Enterprise-grade digital fingerprinting, real-time piracy detection, and automated DMCA takedowns — all in one platform."
  const { displayed, done } = useTypewriter(subtitle, 30, 800)

  /* Scroll reveal refs */
  const sectionReveal = useScrollReveal(0.1)
  const leftCardReveal = useScrollReveal(0.15)
  const rightCardReveal = useScrollReveal(0.15)

  /* How It Works step reveals */
  const stepReveals = [
    useScrollReveal(0.2),
    useScrollReveal(0.2),
    useScrollReveal(0.2),
    useScrollReveal(0.2),
    useScrollReveal(0.2),
  ]
  const howHeadingReveal = useScrollReveal(0.1)

  const steps = [
    { icon: <Upload size={24} />, title: "Upload Asset", desc: "Users upload their original sports media content into the platform." },
    { icon: <Fingerprint size={24} />, title: "Generate Fingerprint", desc: "AI generates a unique digital fingerprint for accurate identification." },
    { icon: <Radar size={24} />, title: "Monitor Platforms", desc: "Continuously scans platforms like YouTube, Instagram, TikTok, and more." },
    { icon: <SearchCheck size={24} />, title: "Detect Piracy", desc: "Identifies unauthorized uploads using advanced matching algorithms." },
    { icon: <Zap size={24} />, title: "Take Action", desc: "Triggers automated DMCA takedowns and sends instant alerts." },
  ]

  const problems = [
    { icon: <AlertTriangle size={18} />, text: "High-value sports content is pirated within minutes of upload" },
    { icon: <TrendingDown size={18} />, text: "Massive revenue loss due to unauthorized redistribution" },
    { icon: <Eye size={18} />, text: "Content spreads across multiple platforms without visibility" },
    { icon: <Radio size={18} />, text: "No real-time system to track or control digital misuse" },
  ]

  const solutions = [
    { icon: <Fingerprint size={18} />, text: "AI-powered digital fingerprinting for every asset" },
    { icon: <Radar size={18} />, text: "Real-time monitoring across YouTube, Instagram, TikTok" },
    { icon: <BellRing size={18} />, text: "Instant detection of unauthorized content usage" },
    { icon: <Bot size={18} />, text: "Automated DMCA takedowns and alert system" },
  ]

  return (
    <div style={{ overflow: "hidden", background: "#000", position: "relative" }}>
      {/* Purple glassy spotlight that follows the cursor */}
      <PurpleSpotlight />

      {/* ═══ HERO ═══ */}
      <section style={{
        minHeight: "calc(100vh - 72px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", padding: "60px 40px",
      }}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div style={{ maxWidth: 900, textAlign: "center", position: "relative", zIndex: 2 }}>
          <div className="fu" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 18px", borderRadius: 30,
            background: "rgba(184,169,232,0.08)",
            border: "1px solid rgba(184,169,232,0.18)",
            marginBottom: 36, fontSize: 12, fontWeight: 700,
            color: "#b8a9e8", letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            AI-Powered Protection
          </div>

          <h1 className="fu1" style={{
            fontFamily: "'Poppins', sans-serif", fontWeight: 900,
            fontSize: "clamp(42px, 7vw, 76px)", lineHeight: 1.08,
            letterSpacing: "-0.03em", color: "#ffffff", marginBottom: 28,
          }}>
            Protect What Belongs<br />to You.
          </h1>

          <div className="fu2" style={{ maxWidth: 650, margin: "0 auto 44px", minHeight: 50 }}>
            <p style={{
              color: "#a0a0b8", fontSize: "clamp(15px, 1.8vw, 18px)",
              lineHeight: 1.7, fontWeight: 400,
              borderRight: done ? "none" : "2px solid #b8a9e8",
              display: "inline", paddingRight: 4,
            }}>{displayed}</p>
          </div>

          <div className="fu3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup" className="cta-primary">Create Account <ArrowRight size={16} /></Link>
            <Link to="/signin" className="cta-secondary">Sign In <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* ═══ PROBLEM → SOLUTION ═══ */}
      <section style={{ padding: "100px 40px", position: "relative" }}>
        {/* Subtle divider glow at top */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 300, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(184,169,232,0.25), transparent)",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Section heading */}
          <div ref={sectionReveal.ref} style={{
            textAlign: "center", marginBottom: 64,
            opacity: sectionReveal.visible ? 1 : 0,
            transform: sectionReveal.visible ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 16px", borderRadius: 20,
              background: "rgba(184,169,232,0.08)", border: "1px solid rgba(184,169,232,0.15)",
              color: "#b8a9e8", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", marginBottom: 20, textTransform: "uppercase",
            }}>
              <AlertTriangle size={11} /> Why This Matters
            </div>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif", fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em",
              marginBottom: 16, color: "#fff",
            }}>
              Stopping Digital Piracy <span style={{ color: "#b8a9e8" }}>at Scale</span>
            </h2>
            <p style={{ color: "#a0a0b8", fontSize: 16, maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
              Sports media is rapidly distributed across global platforms, making protection and control increasingly difficult.
            </p>
          </div>

          {/* Two-column grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 24,
            alignItems: "stretch",
          }}>
            {/* ─── LEFT: THE PROBLEM ─── */}
            <div ref={leftCardReveal.ref} style={{
              background: "rgba(15,15,15,0.6)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(184,169,232,0.08)",
              borderRadius: 20,
              padding: "40px 36px",
              position: "relative",
              overflow: "hidden",
              willChange: "transform, opacity",
              opacity: leftCardReveal.visible ? 1 : 0,
              transform: leftCardReveal.visible ? "translate3d(0,0,0) scale(1)" : "translate3d(-40px,12px,0) scale(1)",
              transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, box-shadow 0.3s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translate3d(0,-2px,0) scale(1.02)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(184,169,232,0.08)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translate3d(0,0,0) scale(1)"; e.currentTarget.style.boxShadow = "none" }}
            >
              {/* Top accent line */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(232,126,126,0.3), transparent)" }} />

              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: "rgba(232,126,126,0.08)", border: "1px solid rgba(232,126,126,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#e87e7e", marginBottom: 24,
              }}>
                <ShieldOff size={26} />
              </div>

              <h3 style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 700,
                fontSize: 22, color: "#fff", marginBottom: 24,
              }}>
                The Problem We Solve
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {problems.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    opacity: leftCardReveal.visible ? 1 : 0,
                    transform: leftCardReveal.visible ? "translateY(0)" : "translateY(10px)",
                    transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.1}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.1}s`,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: "rgba(232,126,126,0.06)", border: "1px solid rgba(232,126,126,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#e87e7e", marginTop: 1,
                    }}>
                      {p.icon}
                    </div>
                    <p style={{ color: "#a0a0b8", fontSize: 14, lineHeight: 1.65, paddingTop: 7 }}>
                      {p.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── RIGHT: OUR SOLUTION ─── */}
            <div ref={rightCardReveal.ref} style={{
              background: "rgba(15,15,15,0.6)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(184,169,232,0.15)",
              borderRadius: 20,
              padding: "40px 36px",
              position: "relative",
              overflow: "hidden",
              willChange: "transform, opacity",
              opacity: rightCardReveal.visible ? 1 : 0,
              transform: rightCardReveal.visible ? "translate3d(0,0,0) scale(1)" : "translate3d(40px,12px,0) scale(1)",
              transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.25s, opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.25s, box-shadow 0.3s ease",
              boxShadow: "0 0 50px rgba(184,169,232,0.04)",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translate3d(0,-2px,0) scale(1.02)"; e.currentTarget.style.boxShadow = "0 8px 50px rgba(184,169,232,0.12)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translate3d(0,0,0) scale(1)"; e.currentTarget.style.boxShadow = "0 0 50px rgba(184,169,232,0.04)" }}
            >
              {/* Top accent line — purple glow */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(184,169,232,0.4), transparent)" }} />
              {/* Subtle corner glow */}
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,169,232,0.08) 0%, transparent 70%)", filter: "blur(30px)" }} />

              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: "rgba(184,169,232,0.1)", border: "1px solid rgba(184,169,232,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#b8a9e8", marginBottom: 24,
              }}>
                <ShieldCheck size={26} />
              </div>

              <h3 style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 700,
                fontSize: 22, color: "#fff", marginBottom: 24,
              }}>
                Our Solution
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {solutions.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    opacity: rightCardReveal.visible ? 1 : 0,
                    transform: rightCardReveal.visible ? "translateY(0)" : "translateY(10px)",
                    transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${0.45 + i * 0.1}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${0.45 + i * 0.1}s`,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: "rgba(184,169,232,0.06)", border: "1px solid rgba(184,169,232,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#b8a9e8", marginTop: 1,
                    }}>
                      {s.icon}
                    </div>
                    <p style={{ color: "#a0a0b8", fontSize: 14, lineHeight: 1.65, paddingTop: 7 }}>
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ padding: "100px 40px", position: "relative" }}>
        {/* Subtle divider glow */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 300, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(184,169,232,0.25), transparent)",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Section heading */}
          <div ref={howHeadingReveal.ref} style={{
            textAlign: "center", marginBottom: 72,
            opacity: howHeadingReveal.visible ? 1 : 0,
            transform: howHeadingReveal.visible ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 16px", borderRadius: 20,
              background: "rgba(184,169,232,0.08)", border: "1px solid rgba(184,169,232,0.15)",
              color: "#b8a9e8", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", marginBottom: 20, textTransform: "uppercase",
            }}>
              <Activity size={11} /> Process Flow
            </div>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif", fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em",
              marginBottom: 16, color: "#fff",
            }}>
              How <span style={{ color: "#b8a9e8" }}>OptiPrimes</span> Works
            </h2>
            <p style={{ color: "#a0a0b8", fontSize: 16, maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
              From asset upload to automated takedown — our system tracks and protects your content in real-time.
            </p>
          </div>

          {/* Desktop: horizontal timeline */}
          <div style={{ position: "relative" }}>
            {/* Connector line (desktop only) */}
            <div className="how-connector" style={{
              position: "absolute", top: 52, left: "10%", right: "10%", height: 2,
              background: "linear-gradient(90deg, transparent, rgba(184,169,232,0.15), rgba(184,169,232,0.2), rgba(184,169,232,0.15), transparent)",
              zIndex: 0,
            }}>
              {/* Animated glow dot traveling along the line */}
              <div style={{
                position: "absolute", top: -3, left: 0, width: 8, height: 8,
                borderRadius: "50%", background: "#b8a9e8",
                boxShadow: "0 0 12px rgba(184,169,232,0.6), 0 0 24px rgba(184,169,232,0.3)",
                animation: "travelDot 4s ease-in-out infinite",
              }} />
            </div>

            {/* Steps grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
              position: "relative",
              zIndex: 1,
            }} className="how-grid">
              {steps.map((step, i) => {
                const reveal = stepReveals[i]
                return (
                  <div key={i} ref={reveal.ref} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    textAlign: "center",
                    willChange: "transform, opacity",
                    opacity: reveal.visible ? 1 : 0,
                    transform: reveal.visible ? "translate3d(0,0,0)" : "translate3d(0,20px,0)",
                    transition: `transform 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s, opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s`,
                  }}>
                    {/* Step number + icon */}
                    <div style={{
                      width: 80, height: 80, borderRadius: 22,
                      background: "rgba(15,15,15,0.7)",
                      backdropFilter: "blur(12px)",
                      border: i === 4 ? "1px solid rgba(184,169,232,0.3)" : "1px solid rgba(184,169,232,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#b8a9e8", marginBottom: 20,
                      position: "relative",
                      boxShadow: i === 4 ? "0 0 30px rgba(184,169,232,0.08)" : "none",
                      transition: "all 0.3s ease",
                      cursor: "default",
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "scale(1.08) translateY(-4px)"
                        e.currentTarget.style.boxShadow = "0 8px 32px rgba(184,169,232,0.15)"
                        e.currentTarget.style.borderColor = "rgba(184,169,232,0.35)"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "scale(1) translateY(0)"
                        e.currentTarget.style.boxShadow = i === 4 ? "0 0 30px rgba(184,169,232,0.08)" : "none"
                        e.currentTarget.style.borderColor = i === 4 ? "rgba(184,169,232,0.3)" : "rgba(184,169,232,0.1)"
                      }}
                    >
                      {/* Step number badge */}
                      <div style={{
                        position: "absolute", top: -8, right: -8,
                        width: 22, height: 22, borderRadius: "50%",
                        background: "#b8a9e8", color: "#000",
                        fontSize: 11, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Space Mono', monospace",
                      }}>{i + 1}</div>
                      {step.icon}
                    </div>

                    {/* Title */}
                    <h4 style={{
                      fontFamily: "'Poppins', sans-serif", fontWeight: 700,
                      fontSize: 15, color: "#fff", marginBottom: 8,
                    }}>{step.title}</h4>

                    {/* Description */}
                    <p style={{ color: "#a0a0b8", fontSize: 13, lineHeight: 1.6, maxWidth: 180 }}>
                      {step.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: "100px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 16px", borderRadius: 20,
              background: "rgba(184,169,232,0.08)", border: "1px solid rgba(184,169,232,0.15)",
              color: "#b8a9e8", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", marginBottom: 20, textTransform: "uppercase",
            }}><Star size={11} /> Core Features</div>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif", fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em",
              marginBottom: 16, color: "#fff",
            }}>
              Everything You Need to <span style={{ color: "#b8a9e8" }}>Fight Piracy</span>
            </h2>
            <p style={{ color: "#a0a0b8", fontSize: 16, maxWidth: 550, margin: "0 auto" }}>
              From upload to takedown, OptiPrimes covers every step of digital asset protection.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { icon: <Fingerprint size={24} />, title: "Digital Fingerprinting", desc: "Every asset gets a unique cryptographic fingerprint for accurate identification across the web." },
              { icon: <Scan size={24} />, title: "Piracy Detection", desc: "Continuous monitoring across YouTube, Instagram, TikTok, Facebook, and more platforms." },
              { icon: <Zap size={24} />, title: "Automated Takedowns", desc: "One-click DMCA filing and automated copyright reports to get infringing content removed fast." },
              { icon: <Globe size={24} />, title: "Multi-Platform Tracking", desc: "Track violations across all major social media and content platforms in real-time." },
              { icon: <Lock size={24} />, title: "Secure Asset Vault", desc: "Your digital assets are stored securely with encrypted fingerprinting and protected access." },
              { icon: <Activity size={24} />, title: "Analytics & Reports", desc: "Comprehensive dashboards showing protection status, detection trends, and platform insights." },
            ].map((f, i) => (
              <div key={i} className="feature-card" style={{
                background: "rgba(18,16,28,0.5)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(184,169,232,0.06)",
                borderRadius: 16, padding: "32px 28px", position: "relative", overflow: "hidden",
                transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(184,169,232,0.2), transparent)" }} />
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "rgba(184,169,232,0.08)", border: "1px solid rgba(184,169,232,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#b8a9e8", marginBottom: 20,
                }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 10, color: "#fff" }}>{f.title}</h3>
                <p style={{ color: "#a0a0b8", fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "100px 40px" }}>
        <div className="glass" style={{
          maxWidth: 700, margin: "0 auto", textAlign: "center",
          borderRadius: 24, padding: "64px 48px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ width: 200, height: 200, top: "-60px", right: "-60px", background: "radial-gradient(circle, rgba(184,169,232,.1) 0%, transparent 70%)", position: "absolute", borderRadius: "50%", filter: "blur(40px)" }} />
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 4vw, 38px)", marginBottom: 16, color: "#fff", position: "relative" }}>
            Ready to Protect Your Assets?
          </h2>
          <p style={{ color: "#a0a0b8", fontSize: 16, marginBottom: 32, position: "relative" }}>
            Join thousands of creators and brands who trust OptiPrimes to safeguard their digital content.
          </p>
          <Link to="/signup" className="cta-primary" style={{ display: "inline-flex" }}>
            <Shield size={18} /> Get Started Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", paddingTop: 80 }}>
        {/* Gradient divider */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "60%", maxWidth: 600, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(184,169,232,0.2), transparent)",
        }} />
        {/* Subtle ambient glow */}
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 400, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184,169,232,0.04) 0%, transparent 70%)",
          filter: "blur(50px)", pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
          {/* 4-column grid */}
          <div className="footer-grid" style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
            gap: 48,
            paddingBottom: 56,
          }}>

            {/* ── Col 1: Brand ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 42, height: 42, background: "#b8a9e8",
                  borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 24px rgba(184,169,232,0.15)",
                }}>
                  <Shield size={20} color="#000" strokeWidth={2.5} />
                </div>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20, color: "#fff" }}>OptiPrimes</span>
              </div>
              <p style={{
                color: "#6a6a80", fontSize: 13, lineHeight: 1.75, maxWidth: 260,
              }}>
                AI-powered digital asset protection platform designed to detect, track, and eliminate piracy in real-time.
              </p>
              {/* Social icons */}
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                {[
                  { icon: <GitFork size={16} />, href: "#" },
                  { icon: <Globe size={16} />, href: "#" },
                  { icon: <Mail size={16} />, href: "mailto:support@optiprimes.com" },
                ].map((s, i) => (
                  <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "rgba(184,169,232,0.06)", border: "1px solid rgba(184,169,232,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#6a6a80", transition: "all 0.25s ease", textDecoration: "none",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#b8a9e8"; e.currentTarget.style.borderColor = "rgba(184,169,232,0.3)"; e.currentTarget.style.transform = "scale(1.1)" }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#6a6a80"; e.currentTarget.style.borderColor = "rgba(184,169,232,0.1)"; e.currentTarget.style.transform = "scale(1)" }}
                  >{s.icon}</a>
                ))}
              </div>
            </div>

            {/* ── Col 2: Product ── */}
            <div>
              <h4 style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 700,
                fontSize: 13, color: "#fff", marginBottom: 20,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>Product</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {["Features", "How It Works", "Security", "Pricing"].map((l, i) => (
                  <li key={i}>
                    <a href="#" style={{
                      color: "#6a6a80", fontSize: 14, textDecoration: "none",
                      transition: "color 0.25s ease", display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = "#b8a9e8"}
                      onMouseLeave={e => e.currentTarget.style.color = "#6a6a80"}
                    >{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Col 3: Resources ── */}
            <div>
              <h4 style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 700,
                fontSize: 13, color: "#fff", marginBottom: 20,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>Resources</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "GitHub Repository", icon: <ExternalLink size={12} />, ext: true },
                  { label: "Documentation", icon: null },
                  { label: "API Access", icon: null },
                  { label: "Hackathon Project Info", icon: null },
                ].map((l, i) => (
                  <li key={i}>
                    <a href="#" target={l.ext ? "_blank" : undefined} rel={l.ext ? "noopener noreferrer" : undefined} style={{
                      color: "#6a6a80", fontSize: 14, textDecoration: "none",
                      transition: "color 0.25s ease", display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = "#b8a9e8"}
                      onMouseLeave={e => e.currentTarget.style.color = "#6a6a80"}
                    >{l.label} {l.icon}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Col 4: Contact ── */}
            <div>
              <h4 style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 700,
                fontSize: 13, color: "#fff", marginBottom: 20,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>Contact</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                <li>
                  <a href="mailto:support@optiprimes.com" style={{
                    color: "#6a6a80", fontSize: 14, textDecoration: "none",
                    transition: "color 0.25s ease", display: "inline-flex", alignItems: "center", gap: 8,
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = "#b8a9e8"}
                    onMouseLeave={e => e.currentTarget.style.color = "#6a6a80"}
                  >
                    <Mail size={14} /> support@optiprimes.com
                  </a>
                </li>
                <li>
                  <a href="#" style={{
                    color: "#6a6a80", fontSize: 14, textDecoration: "none",
                    transition: "color 0.25s ease", display: "inline-flex", alignItems: "center", gap: 8,
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = "#b8a9e8"}
                    onMouseLeave={e => e.currentTarget.style.color = "#6a6a80"}
                  >
                    <Users size={14} /> Meet the Team
                  </a>
                </li>
                <li>
                  <a href="#" style={{
                    color: "#6a6a80", fontSize: 14, textDecoration: "none",
                    transition: "color 0.25s ease", display: "inline-flex", alignItems: "center", gap: 8,
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = "#b8a9e8"}
                    onMouseLeave={e => e.currentTarget.style.color = "#6a6a80"}
                  >
                    <BookOpen size={14} /> Documentation
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div style={{
            borderTop: "1px solid rgba(184,169,232,0.06)",
            padding: "24px 0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 12,
          }}>
            <p style={{ color: "#4a4a60", fontSize: 13 }}>
              © {new Date().getFullYear()} OptiPrimes. All rights reserved.
            </p>
            <p style={{ color: "#4a4a60", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <Code2 size={13} /> Built for Hackathon 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
