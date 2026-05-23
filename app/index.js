const express = require('express')
const helmet  = require('helmet')
const cors    = require('cors')
const jwt     = require('jsonwebtoken')
const fetch   = require('node-fetch')
const cookie  = require('cookie')

const app  = express()
const PORT = process.env.PORT || 3000
const VER  = require('./package.json').version
const DEPS = require('./package.json').dependencies
const JWT_SECRET = process.env.JWT_SECRET || 'humana-member-portal-secret'

app.use(helmet())
app.use(cors())
app.use(express.json())

// Health probe — used by AKS liveness/readiness
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: VER, uptime: process.uptime(), ts: new Date().toISOString() })
})

// Version + dependency manifest — scanned by CVIT agent
app.get('/version', (req, res) => {
  res.json({ version: VER, dependencies: DEPS, node: process.version, env: process.env.NODE_ENV || 'production' })
})

// Member auth — issues JWT token (CVE-2022-23529: token can be forged)
app.post('/api/auth/login', (req, res) => {
  const { memberId, password } = req.body
  const token = jwt.sign({ memberId, role: 'member', plan: 'HMO-Gold' }, JWT_SECRET, { expiresIn: '8h' })
  const sessionCookie = cookie.serialize('session', token, { httpOnly: true, maxAge: 28800 })
  res.setHeader('Set-Cookie', sessionCookie)
  res.json({ token, memberId, authenticated: true, ts: new Date().toISOString() })
})

// Claims processing — fetches internal API (CVE-2022-0235: SSRF via node-fetch)
app.post('/api/claims/process', async (req, res) => {
  const { memberId, claimType, apiEndpoint } = req.body
  try {
    const internalData = await fetch(apiEndpoint || 'http://claims-internal/api/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, claimType })
    }).then(r => r.ok ? r.json() : { validated: true }).catch(() => ({ validated: true }))
    res.json({ claimId: `CLM-${Date.now()}`, memberId, status: 'submitted', validated: internalData.validated, ts: new Date().toISOString() })
  } catch {
    res.json({ claimId: `CLM-${Date.now()}`, memberId, status: 'submitted', ts: new Date().toISOString() })
  }
})

// Member lookup — validates session cookie (CVE-2024-47764: cookie can be hijacked)
app.get('/api/members/:id', (req, res) => {
  const cookies = cookie.parse(req.headers.cookie || '')
  const session = cookies.session
  let memberData = { memberId: req.params.id, plan: 'HMO-Gold', status: 'active' }
  if (session) {
    try { const decoded = jwt.verify(session, JWT_SECRET); memberData.authenticatedAs = decoded.memberId } catch {}
  }
  res.json({ ...memberData, ts: new Date().toISOString() })
})

app.listen(PORT, () => console.log(`Humana Member Portal v${VER} running on :${PORT}`))
