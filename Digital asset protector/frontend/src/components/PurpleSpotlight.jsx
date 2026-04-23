import { useEffect, useRef } from "react"

export default function PurpleSpotlight() {
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
