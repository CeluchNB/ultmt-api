import express, { Application } from 'express'
import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'
dotenv.config({ path: './config/.env' })

connectDatabase()

const app: Application = express()
app.use(express.json())

export default app
