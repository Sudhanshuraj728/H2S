/* ─── API Service Layer with Local Fallback ─────────────────────────────── */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "")

// ─── Token Management ───
export const getToken = () => localStorage.getItem("accessToken")
export const getRefreshToken = () => localStorage.getItem("refreshToken")
export const setTokens = (access, refresh) => {
  localStorage.setItem("accessToken", access)
  if (refresh) localStorage.setItem("refreshToken", refresh)
}
export const clearTokens = () => {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")
}
export const saveUser = (user) => localStorage.setItem("user", JSON.stringify(user))
export const getSavedUser = () => {
  try { return JSON.parse(localStorage.getItem("user")) } catch { return null }
}

// ─── Local Storage DB ───
const LOCAL_DB = {
  getAssets: () => { try { return JSON.parse(localStorage.getItem("local_assets")||"[]") } catch { return [] } },
  saveAssets: (a) => localStorage.setItem("local_assets", JSON.stringify(a)),
  getAlerts: () => { try { return JSON.parse(localStorage.getItem("local_alerts")||"[]") } catch { return [] } },
  saveAlerts: (a) => localStorage.setItem("local_alerts", JSON.stringify(a)),
  getDetections: () => { try { return JSON.parse(localStorage.getItem("local_detections")||"[]") } catch { return [] } },
  saveDetections: (d) => localStorage.setItem("local_detections", JSON.stringify(d)),
}

// Generate a simple ID
const genId = () => Math.random().toString(36).substr(2, 24)

// ─── Check if backend is reachable ───
let _backendAvailable = null
let _lastBackendCheck = 0
async function isBackendAvailable() {
  const now = Date.now()
  // Check cache every 10 seconds instead of 30
  if (_backendAvailable !== null && (now - _lastBackendCheck) < 10000) {
    return _backendAvailable
  }
  try {
    const res = await fetch(BASE_URL.replace("/api",""), { method:"GET", signal: AbortSignal.timeout(2000) })
    _backendAvailable = res.ok
    _lastBackendCheck = now
    console.log("Backend available:", _backendAvailable)
  } catch (err) {
    _backendAvailable = false
    _lastBackendCheck = now
    console.log("Backend unavailable:", err.message)
  }
  return _backendAvailable
}

// ─── Core Fetch Wrapper ───
async function request(method, path, body = null) {
  const token = getToken()
  const headers = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const config = { method, headers, credentials: "include" }
  if (body) config.body = JSON.stringify(body)

  try {
    const res = await fetch(`${BASE_URL}${path}`, config)
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`)
    }
    return data
  } catch (err) {
    console.error(`API Error on ${method} ${path}:`, err)
    throw err
  }
}

// ─── HTTP Methods (with backend check) ───
const api = {
  get:    (path) => request("GET", path),
  post:   (path, body) => request("POST", path, body),
  put:    (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH API — with local fallback
// ═══════════════════════════════════════════════════════════════════════════
export const authAPI = {
  register: async (data) => {
    // Always try backend first - NO local fallback for registration
    try {
      return await api.post("/users/register", data)
    } catch (err) {
      console.error("Registration failed:", err.message)
      throw err
    }
  },

  login: async (data) => {
    // Always try backend first - NO local fallback for login
    try {
      return await api.post("/users/login", data)
    } catch (err) {
      // Provide better error message
      if (err.message.includes("User does not exist")) {
        throw new Error("No account found with this email. Please create one first.")
      }
      if (err.message.includes("Invalid user credentials")) {
        throw new Error("Incorrect password. Please try again.")
      }
      console.error("Login failed:", err.message)
      throw err
    }
  },

  logout: async () => {
    try {
      return await api.post("/users/logout")
    } catch (err) {
      console.error("Logout failed:", err.message)
      clearTokens()
      return { data: {} }
    }
  },

  me: async () => {
    try {
      return await api.get("/users/me")
    } catch (err) {
      console.error("Failed to get current user:", err.message)
      throw err
    }
  },

  updateProfile: async (data) => {
    try {
      return await api.put("/users/profile", data)
    } catch (err) {
      console.error("Profile update failed:", err.message)
      throw err
    }
  },

  googleAuthUrl: (redirectPath = "/dashboard") => {
    const params = new URLSearchParams()
    if (redirectPath) params.set("redirect", redirectPath)
    const query = params.toString()
    return `${BASE_URL}/users/auth/google${query ? `?${query}` : ""}`
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSETS API — with local fallback
// ═══════════════════════════════════════════════════════════════════════════
export const assetsAPI = {
  create: async (data) => {
    if (await isBackendAvailable()) {
      return api.post("/assets", data)
    }
    const asset = {
      _id: genId(),
      ...data,
      owner: getSavedUser()?._id || genId(),
      status: "active",
      isProtected: true,
      detectionCount: 0,
      detections: [],
      alerts: [],
      platforms: data.platforms || ["youtube","instagram","twitter","facebook","tiktok"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const assets = LOCAL_DB.getAssets()
    assets.unshift(asset)
    LOCAL_DB.saveAssets(assets)
    return { data: { asset } }
  },

  getAll: async (params = "") => {
    if (await isBackendAvailable()) {
      return api.get(`/assets${params ? "?" + params : ""}`)
    }
    const all = LOCAL_DB.getAssets()
    const urlParams = new URLSearchParams(params)
    const status = urlParams.get("status")
    const page = parseInt(urlParams.get("page")||"1")
    const limit = parseInt(urlParams.get("limit")||"20")
    let filtered = status ? all.filter(a => a.status === status) : all
    const total = filtered.length
    const start = (page-1)*limit
    filtered = filtered.slice(start, start+limit)
    return { data: { assets: filtered, pagination: { total, page, limit, pages: Math.ceil(total/limit)||1 } } }
  },

  getById: async (id) => {
    if (await isBackendAvailable()) return api.get(`/assets/${id}`)
    const asset = LOCAL_DB.getAssets().find(a => a._id === id)
    return { data: { asset } }
  },

  update: async (id, data) => {
    if (await isBackendAvailable()) return api.put(`/assets/${id}`, data)
    const assets = LOCAL_DB.getAssets()
    const idx = assets.findIndex(a => a._id === id)
    if (idx > -1) { assets[idx] = { ...assets[idx], ...data, updatedAt: new Date().toISOString() }; LOCAL_DB.saveAssets(assets) }
    return { data: { asset: assets[idx] } }
  },

  delete: async (id) => {
    if (await isBackendAvailable()) return api.delete(`/assets/${id}`)
    const assets = LOCAL_DB.getAssets().filter(a => a._id !== id)
    LOCAL_DB.saveAssets(assets)
    return { data: { message: "Asset deleted" } }
  },

  getByHash: async (hash) => {
    if (await isBackendAvailable()) return api.get(`/assets/by-hash/${hash}`)
    const asset = LOCAL_DB.getAssets().find(a => a.fileHash === hash)
    return { data: { asset } }
  },

  flag: async (id, data) => {
    if (await isBackendAvailable()) return api.post(`/assets/${id}/flag`, data)
    const assets = LOCAL_DB.getAssets()
    const idx = assets.findIndex(a => a._id === id)
    if (idx > -1) { assets[idx].status = "flagged"; assets[idx].detectionCount++; LOCAL_DB.saveAssets(assets) }
    return { data: { asset: assets[idx] } }
  },

  getStats: async () => {
    if (await isBackendAvailable()) return api.get("/assets/stats")
    const assets = LOCAL_DB.getAssets()
    return {
      data: {
        totalAssets: assets.length,
        protectedAssets: assets.filter(a => a.status === "active").length,
        flaggedAssets: assets.filter(a => a.status === "flagged").length,
        totalDetections: assets.reduce((s, a) => s + (a.detectionCount||0), 0),
      }
    }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECTIONS API — with local fallback
// ═══════════════════════════════════════════════════════════════════════════
export const detectionsAPI = {
  create: async (data) => {
    if (await isBackendAvailable()) return api.post("/detections", data)
    const det = { _id: genId(), ...data, status: "pending", detectionDate: new Date().toISOString(), createdAt: new Date().toISOString() }
    const dets = LOCAL_DB.getDetections(); dets.unshift(det); LOCAL_DB.saveDetections(dets)
    return { data: det }
  },

  getAll: async (params = "") => {
    if (await isBackendAvailable()) return api.get(`/detections${params ? "?" + params : ""}`)
    return { data: { detections: LOCAL_DB.getDetections(), pagination: { total: LOCAL_DB.getDetections().length, page:1, limit:20, pages:1 } } }
  },

  getById: async (id) => {
    if (await isBackendAvailable()) return api.get(`/detections/${id}`)
    return { data: LOCAL_DB.getDetections().find(d => d._id === id) }
  },

  updateStatus: async (id, data) => {
    if (await isBackendAvailable()) return api.put(`/detections/${id}/status`, data)
    const dets = LOCAL_DB.getDetections(); const idx = dets.findIndex(d => d._id === id)
    if (idx > -1) { dets[idx] = { ...dets[idx], ...data }; LOCAL_DB.saveDetections(dets) }
    return { data: dets[idx] }
  },

  getByAsset: async (assetId, params = "") => {
    if (await isBackendAvailable()) return api.get(`/detections/asset/${assetId}${params ? "?" + params : ""}`)
    return { data: { detections: LOCAL_DB.getDetections().filter(d => d.assetId === assetId) } }
  },

  getByPlatform: async (platform) => {
    if (await isBackendAvailable()) return api.get(`/detections/platform/${platform}`)
    const dets = LOCAL_DB.getDetections().filter(d => d.platform === platform)
    return { data: { stats: { platform, totalDetections: dets.length }, detections: dets } }
  },

  markFalsePositive: async (id, data) => {
    if (await isBackendAvailable()) return api.post(`/detections/${id}/false-positive`, data)
    const dets = LOCAL_DB.getDetections(); const idx = dets.findIndex(d => d._id === id)
    if (idx > -1) { dets[idx].status = "false_positive"; LOCAL_DB.saveDetections(dets) }
    return { data: dets[idx] }
  },

  getStats: async () => {
    if (await isBackendAvailable()) return api.get("/detections/stats")
    const dets = LOCAL_DB.getDetections()
    return {
      data: {
        summary: { totalDetections: dets.length, pending: dets.filter(d=>d.status==="pending").length, resolved: dets.filter(d=>d.status==="resolved").length, reported: dets.filter(d=>d.status==="reported").length, falsePositives: dets.filter(d=>d.status==="false_positive").length },
        byPlatform: [],
        byStatus: [],
      }
    }
  },

  getRecent: async (limit = 10) => {
    if (await isBackendAvailable()) return api.get(`/detections/recent?limit=${limit}`)
    return { data: LOCAL_DB.getDetections().slice(0, limit) }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// ALERTS API — with local fallback
// ═══════════════════════════════════════════════════════════════════════════
export const alertsAPI = {
  create: async (data) => {
    if (await isBackendAvailable()) return api.post("/alerts", data)
    const alert = { _id: genId(), ...data, status: "open", severity: data.severity||"medium", priority: 1, createdAt: new Date().toISOString() }
    const alerts = LOCAL_DB.getAlerts(); alerts.unshift(alert); LOCAL_DB.saveAlerts(alerts)
    return { data: alert }
  },

  getAll: async (params = "") => {
    if (await isBackendAvailable()) return api.get(`/alerts${params ? "?" + params : ""}`)
    let alerts = LOCAL_DB.getAlerts()
    const urlParams = new URLSearchParams(params)
    const status = urlParams.get("status")
    const severity = urlParams.get("severity")
    if (status) alerts = alerts.filter(a => a.status === status)
    if (severity) alerts = alerts.filter(a => a.severity === severity)
    return { data: { alerts, pagination: { total: alerts.length, page:1, limit:20, pages:1 } } }
  },

  getById: async (id) => {
    if (await isBackendAvailable()) return api.get(`/alerts/${id}`)
    return { data: LOCAL_DB.getAlerts().find(a => a._id === id) }
  },

  updateStatus: async (id, data) => {
    if (await isBackendAvailable()) return api.put(`/alerts/${id}/status`, data)
    const alerts = LOCAL_DB.getAlerts(); const idx = alerts.findIndex(a => a._id === id)
    if (idx > -1) { alerts[idx] = { ...alerts[idx], ...data }; LOCAL_DB.saveAlerts(alerts) }
    return { data: alerts[idx] }
  },

  assign: async (id, data) => {
    if (await isBackendAvailable()) return api.post(`/alerts/${id}/assign`, data)
    return { data: {} }
  },

  recordDMCA: async (id, data) => {
    if (await isBackendAvailable()) return api.post(`/alerts/${id}/dmca`, data)
    const alerts = LOCAL_DB.getAlerts(); const idx = alerts.findIndex(a => a._id === id)
    if (idx > -1) { alerts[idx].status = "in_progress"; alerts[idx].actionTaken = data; LOCAL_DB.saveAlerts(alerts) }
    return { data: alerts[idx] }
  },

  escalate: async (id, data) => {
    if (await isBackendAvailable()) return api.post(`/alerts/${id}/escalate`, data)
    return { data: {} }
  },

  getOpen: async (limit = 10) => {
    if (await isBackendAvailable()) {
      const res = await api.get(`/alerts/open?limit=${limit}`)
      const payload = res?.data ?? res
      if (Array.isArray(payload)) return { data: { alerts: payload } }
      return res
    }
    const alerts = LOCAL_DB.getAlerts().filter(a => a.status === "open" || a.status === "acknowledged" || a.status === "in_progress")
    return { data: { alerts: alerts.slice(0, limit) } }
  },

  getStats: async () => {
    if (await isBackendAvailable()) return api.get("/alerts/stats")
    const alerts = LOCAL_DB.getAlerts()
    return {
      data: {
        summary: {
          totalAlerts: alerts.length,
          open: alerts.filter(a=>a.status==="open").length,
          acknowledged: alerts.filter(a=>a.status==="acknowledged").length,
          inProgress: alerts.filter(a=>a.status==="in_progress").length,
          resolved: alerts.filter(a=>a.status==="resolved").length,
          closed: alerts.filter(a=>a.status==="closed").length,
        },
        bySeverity: [],
        byViolationType: [],
        byStatus: [],
      }
    }
  },

  close: async (id, data) => {
    if (await isBackendAvailable()) return api.post(`/alerts/${id}/close`, data)
    const alerts = LOCAL_DB.getAlerts(); const idx = alerts.findIndex(a => a._id === id)
    if (idx > -1) { alerts[idx].status = "closed"; alerts[idx].closedAt = new Date().toISOString(); LOCAL_DB.saveAlerts(alerts) }
    return { data: alerts[idx] }
  },
}

export default api
