import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import pengajuanRoutes from './routes/pengajuan.js'
import authRoutes from './routes/auth.js'
import ppkRoutes from './routes/ppk.js'
import ppRoutes from './routes/pp.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api', pengajuanRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/ppk', ppkRoutes)
app.use('/api/pp', ppRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  const status = err.statusCode || 500
  const message = err.message || 'Terjadi kesalahan server'
  res.status(status).json({ error: message })
})

const server = app.listen(PORT, () => {
  console.log(`LPSE API server running on http://localhost:${PORT}`)
})

export default server