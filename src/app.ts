import express, { Application } from 'express'
import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'
dotenv.config({ path: './config/.env' })
import * as Routes from './routes'

connectDatabase()

const app: Application = express()
app.use(express.json())
app.use(Routes.userRouter)

export default app
