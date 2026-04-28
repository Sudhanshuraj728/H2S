import { useMemo, useState } from 'react'

const stats = [
  { label: 'Total Users', value: '6', trend: 'Active', icon: '👥' },
  { label: 'Companies', value: '59', trend: 'Growing', icon: '🏢' },
  { label: 'Google OAuth', value: '0', trend: 'Secure', icon: '🔐' },
  { label: 'LinkedIn OAuth', value: '0', trend: 'Professional', icon: '💼' },
]

const analyticsActions = [
  { label: 'Generate Report', icon: '📄' },
  { label: 'Export Data', icon: '💾' },
  { label: 'System Logs', icon: '📋' },
  { label: 'System Health', icon: '💚' },
]

const users = [
  { name: 'Sudh Raj', email: 'sraj@traq.com', role: 'Owner', company: 'TRAQ', status: 'Active', assets: 12 },
  { name: 'Aarav Mehta', email: 'aarav@starlens.io', role: 'Admin', company: 'StarLens', status: 'Active', assets: 8 },
  { name: 'Meera Joshi', email: 'meera@focusflow.in', role: 'Analyst', company: 'FocusFlow', status: 'Invited', assets: 3 },
  { name: 'Kabir Khan', email: 'kabir@pixelvault.co', role: 'Manager', company: 'PixelVault', status: 'Active', assets: 17 },
  { name: 'Nina Sharma', email: 'nina@brandguard.ai', role: 'Editor', company: 'BrandGuard', status: 'Suspended', assets: 1 },
]

const assets = [
  { title: 'Match Day Poster', owner: 'Sudh Raj', type: 'Image', detected: '5m ago', risk: 'Low' },
  { title: 'Promo Reel 01', owner: 'Aarav Mehta', type: 'Video', detected: '12m ago', risk: 'Medium' },
  { title: 'Event Banner Pack', owner: 'Kabir Khan', type: 'Design', detected: '1h ago', risk: 'Low' },
  { title: 'Launch Teaser', owner: 'Meera Joshi', type: 'Video', detected: '2h ago', risk: 'High' },
  { title: 'Sponsor Sheet', owner: 'Nina Sharma', type: 'PDF', detected: '4h ago', risk: 'Medium' },
]

const activity = [
  'User invited to TRAQ workspace',
  'New asset fingerprint generated',
  'Duplicate match detected in social crawl',
  'OAuth configuration reviewed',
  'Analytics report exported',
]

const securityFeed = [
  { label: 'Database Status', value: 'Connected' },
  { label: 'Server Uptime', value: '2h 4m' },
  { label: 'API Response', value: '~45ms' },
]

function SectionTitle({ title, subtitle }) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const totalUsers = users.length
  const totalAssets = useMemo(() => assets.length, [])

  const refresh = () => {
    setLastRefresh(new Date())
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">🚀</div>
          <div>
            <div className="brand-name">H2S Admin</div>
            <div className="brand-sub">Asset Protection</div>
          </div>
        </div>

        <nav className="nav">
          {['Dashboard', 'Analytics', 'Users', 'Companies', 'Assets', 'Messages'].map((item) => (
            <button
              key={item}
              className={`nav-item ${activeNav === item ? 'active' : ''}`}
              onClick={() => setActiveNav(item)}
            >
              <span className="nav-icon">{item === 'Dashboard' ? '📊' : item === 'Analytics' ? '📈' : item === 'Users' ? '👥' : item === 'Companies' ? '🏢' : item === 'Assets' ? '🗂️' : '✉️'}</span>
              <span>{item}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="hero card">
          <div className="hero-title">
            <div className="hero-icon">🫧</div>
            <div>
              <h1>Admin Dashboard</h1>
              <p>Owner view for users, assets, analytics, and platform security.</p>
            </div>
          </div>
          <div className="hero-actions">
            <span className="status-pill"><span className="dot" /> System Online</span>
            <button className="primary-btn" onClick={refresh}>↻ Refresh Data</button>
          </div>
        </header>

        <section className="stats-grid">
          {stats.map((stat) => (
            <article className="stat-card card" key={stat.label}>
              <div className="stat-top" />
              <div className="stat-head">
                <span className="stat-label">{stat.label.toUpperCase()}</span>
                <span className="stat-icon">{stat.icon}</span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-trend">↗ {stat.trend}</div>
            </article>
          ))}
        </section>

        <section className="panel card">
          <SectionTitle title="Quick Analytics" subtitle={`Last refresh: ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />

          <div className="quick-actions">
            {analyticsActions.map((action) => (
              <button className="mini-card" key={action.label}>
                <span className="mini-icon">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <div className="metrics-row">
            {securityFeed.map((item) => (
              <div className="metric card" key={item.label}>
                <div className="metric-label">{item.label}</div>
                <div className="metric-value">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="card panel">
            <SectionTitle title="Users" subtitle={`All registered users (${totalUsers})`} />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Assets</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.email}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.company}</td>
                      <td><span className={`badge badge-${user.status.toLowerCase()}`}>{user.status}</span></td>
                      <td>{user.assets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card panel">
            <SectionTitle title="Uploaded Assets" subtitle={`Assets uploaded by users (${totalAssets})`} />
            <div className="asset-list">
              {assets.map((asset) => (
                <div className="asset-row" key={asset.title}>
                  <div className="asset-main">
                    <div className="asset-title">{asset.title}</div>
                    <div className="asset-meta">Owner: {asset.owner} • {asset.type}</div>
                  </div>
                  <div className="asset-side">
                    <span className={`badge badge-${asset.risk.toLowerCase()}`}>{asset.risk}</span>
                    <span className="asset-time">{asset.detected}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card panel">
            <SectionTitle title="Recent Activity" subtitle="Latest admin events and system actions" />
            <div className="activity-list">
              {activity.map((item, index) => (
                <div className="activity-item" key={item}>
                  <span className="activity-dot">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card panel">
            <SectionTitle title="Security & OAuth" subtitle="Platform access and compliance overview" />
            <div className="security-grid">
              <div className="security-card">
                <div className="security-title">Google OAuth</div>
                <div className="security-value">0</div>
                <div className="security-sub">Secure</div>
              </div>
              <div className="security-card">
                <div className="security-title">LinkedIn OAuth</div>
                <div className="security-value">0</div>
                <div className="security-sub">Professional</div>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
