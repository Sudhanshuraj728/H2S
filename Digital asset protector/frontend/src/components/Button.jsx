import { useNavigate } from "react-router-dom"

export function Button({ children, variant = "primary", to, onClick, disabled, style, className = "", fullWidth, type = "button" }) {
  const navigate = useNavigate()

  const baseStyles = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "13px 28px",
    borderRadius: "12px",
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 600,
    fontSize: "15px",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "none",
    textDecoration: "none",
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? "100%" : "auto",
    ...style,
  }

  const variants = {
    primary: {
      background: "linear-gradient(135deg, #00D7D2 0%, #8E72EE 100%)",
      color: "#000000",
      boxShadow: "0 4px 20px rgba(0, 212, 255, 0.25)",
    },
    secondary: {
      background: "transparent",
      color: "#e2edf8",
      border: "1px solid rgba(255,255,255,0.12)",
      backdropFilter: "blur(8px)",
    },
    ghost: {
      background: "transparent",
      color: "#7a95b0",
      padding: "10px 16px",
    },
    danger: {
      background: "rgba(255,51,102,0.12)",
      color: "#ff3366",
      border: "1px solid rgba(255,51,102,0.2)",
    },
  }

  const mergedStyle = { ...baseStyles, ...variants[variant] }

  const handleClick = (e) => {
    if (to) {
      e.preventDefault()
      navigate(to)
    }
    if (onClick) onClick(e)
  }

  return (
    <button
      type={type}
      className={`btn-hover-${variant} ${className}`}
      style={mergedStyle}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button
