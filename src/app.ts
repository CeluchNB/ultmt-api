import cors from 'cors'
import express, { Application } from 'express'
import { router as v1Router } from './routes/v1'
import passport from 'passport'
import { connectRedis } from './loaders/redis'
import './loaders/sendgrid'
connectRedis()
// import logger from './loaders/winston'
// Disable cron jobs while using cloud run
// import './loaders/cron'

const app: Application = express()
app.use(cors())
app.use(express.json())
// Disable this while using cloud run
// app.use(logger)
app.use(passport.initialize())
require('./loaders/passport')
// Version 1 of API
app.use('/api/v1', v1Router)

app.get('/ultmt', async (req, res) => {
    res.json({ message: 'The official API of The Ultmt App' })
})

export default app
