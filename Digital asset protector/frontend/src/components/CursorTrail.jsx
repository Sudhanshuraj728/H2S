import { useEffect, useRef } from "react"

export default function CursorTrail() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const trailsRef = useRef([])
  const posRef = useRef({ x: 0, y: 0 })
  const ringPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // Create trail particles
    const trailCount = 6
    const container = document.body
    for (let i = 0; i < trailCount; i++) {
      const el = document.createElement("div")
      el.className = "cursor-trail"
      el.style.width = `${4 - i * 0.5}px`
      el.style.height = `${4 - i * 0.5}px`
      el.style.opacity = `${0.4 - i * 0.06}`
      container.appendChild(el)
      trailsRef.current.push({ el, x: 0, y: 0 })
    }

    const onMouseMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY }
      dot.style.left = e.clientX + "px"
      dot.style.top = e.clientY + "px"

      // Spawn a sparkle at rapid mouse movement
      const speed = Math.abs(e.movementX) + Math.abs(e.movementY)
      if (speed > 15 && Math.random() > 0.6) {
        spawnSparkle(e.clientX, e.clientY)
      }
    }

    const onMouseDown = () => {
      dot.style.width = "14px"
      dot.style.height = "14px"
      ring.style.width = "28px"
      ring.style.height = "28px"
      ring.style.borderColor = "rgba(184,169,232,0.7)"
    }

    const onMouseUp = () => {
      dot.style.width = "8px"
      dot.style.height = "8px"
      ring.style.width = "36px"
      ring.style.height = "36px"
      ring.style.borderColor = "rgba(184,169,232,0.4)"
    }

    // Smooth ring + trail follow
    let raf
    const animate = () => {
      const { x, y } = posRef.current
      // Ring with lag
      ringPosRef.current.x += (x - ringPosRef.current.x) * 0.15
      ringPosRef.current.y += (y - ringPosRef.current.y) * 0.15
      ring.style.left = ringPosRef.current.x + "px"
      ring.style.top = ringPosRef.current.y + "px"

      // Trail particles with increasing lag
      let prevX = x, prevY = y
      trailsRef.current.forEach((t, i) => {
        t.x += (prevX - t.x) * (0.2 - i * 0.025)
        t.y += (prevY - t.y) * (0.2 - i * 0.025)
        t.el.style.left = t.x + "px"
        t.el.style.top = t.y + "px"
        prevX = t.x
        prevY = t.y
      })

      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    // Hover effect on interactive elements
    const onOverInteractive = () => {
      dot.style.width = "40px"
      dot.style.height = "40px"
      dot.style.background = "rgba(184,169,232,0.15)"
      ring.style.opacity = "0"
    }
    const onLeaveInteractive = () => {
      dot.style.width = "8px"
      dot.style.height = "8px"
      dot.style.background = "#b8a9e8"
      ring.style.opacity = "1"
    }

    const addInteractiveListeners = () => {
      document.querySelectorAll("a, button, input, .nav-item, .card, .feature-card, .cta-primary, .cta-secondary").forEach(el => {
        el.addEventListener("mouseenter", onOverInteractive)
        el.addEventListener("mouseleave", onLeaveInteractive)
      })
    }
    // Run on mount and on DOM changes
    addInteractiveListeners()
    const observer = new MutationObserver(addInteractiveListeners)
    observer.observe(document.body, { childList: true, subtree: true })

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("mouseup", onMouseUp)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("mouseup", onMouseUp)
      trailsRef.current.forEach(t => t.el.remove())
      trailsRef.current = []
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}

function spawnSparkle(x, y) {
  const sparkle = document.createElement("div")
  const size = Math.random() * 4 + 2
  const offsetX = (Math.random() - 0.5) * 30
  const offsetY = (Math.random() - 0.5) * 30
  Object.assign(sparkle.style, {
    position: "fixed",
    left: (x + offsetX) + "px",
    top: (y + offsetY) + "px",
    width: size + "px",
    height: size + "px",
    background: "#b8a9e8",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: "99996",
    opacity: "0.8",
    boxShadow: "0 0 6px rgba(184,169,232,0.5)",
    animation: "sparkle 0.6s ease-out forwards",
    transform: "translate(-50%,-50%)",
  })
  document.body.appendChild(sparkle)
  setTimeout(() => sparkle.remove(), 600)
}
