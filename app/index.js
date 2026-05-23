const express = require('express')
const helmet  = require('helmet')
const cors    = require('cors')
const _       = require('lodash')
const axios   = require('axios')

const app  = express()
const PORT = process.env.PORT || 3000
const VER  = require('./package.json').version
const DEPS = require('./package.json').dependencies

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

// Claims processing stub
app.post('/api/claims/process', (req, res) => {
  const claim = req.body
  const memberId = _.get(claim, 'memberId', 'unknown')
  res.json({ claimId: `CLM-${Date.now()}`, memberId, status: 'submitted', ts: new Date().toISOString() })
})

// Member lookup stub
app.get('/api/members/:id', (req, res) => {
  res.json({ memberId: req.params.id, plan: 'HMO-Gold', status: 'active', ts: new Date().toISOString() })
})

app.listen(PORT, () => console.log(`Humana Member Portal v${VER} running on :${PORT}`))
