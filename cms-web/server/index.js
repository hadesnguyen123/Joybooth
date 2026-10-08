import express from 'express'
import cors from 'cors'
import apiRoutes from './routes/apiRoutes.js'

const app = express()
const PORT = process.env.PORT || 5181

app.use(cors())
app.use(express.json())

// Gắn tiền tố /api
app.use('/api', apiRoutes)

// Trang gốc server
app.get('/', (req, res) => {
  res.json({
    name: 'JoyBooth Cloud CMS API Server',
    status: 'running',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: '/api/health',
      kpis: '/api/kpis',
      kiosks: '/api/kiosks',
      pricing: '/api/pricing',
      frames: '/api/frames',
      coupons: '/api/coupons',
      transactions: '/api/transactions',
      accounting: '/api/accounting/reconcile',
    },
  })
})

const server = app.listen(PORT, () => {
  console.log(`[JoyBooth CMS API] MVC Backend đang chạy tại http://localhost:${PORT}`)
})

export default server
