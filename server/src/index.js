import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import authRoutes from './routes/auth.js'
import basesRoutes from './routes/bases.js'
import credentialsRoutes from './routes/credentials.js'
import fieldsRoutes from './routes/fields.js'
import recordsRoutes from './routes/records.js'
import tablesRoutes from './routes/tables.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/credentials', credentialsRoutes)
app.use('/api/bases', basesRoutes)
app.use('/api/tables', tablesRoutes)
app.use('/api/fields', fieldsRoutes)
app.use('/api/records', recordsRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})