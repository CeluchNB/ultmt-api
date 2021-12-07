import express, { Application } from 'express'
import dotenv from 'dotenv'
import { connectDatabase } from './db/mongoose'
dotenv.config({ path: './src/config/.env' })

connectDatabase()

const app: Application = express()
app.use(express.json())

export default app
