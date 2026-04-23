import { Outlet } from "react-router-dom"
import Navbar from "./Navbar"

export default function Layout() {
  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <Navbar />
      <main style={{ paddingTop: 72 }}>
        <Outlet />
      </main>
    </div>
  )
}
