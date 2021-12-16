import express, { Application } from 'express'
import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'
dotenv.config({ path: './config/.env' })
import * as Routes from './routes'
import passport from 'passport'
require('./loaders/passport')

connectDatabase()

const app: Application = express()
app.use(express.json())
app.use(passport.initialize())
app.use(Routes.userRouter)
app.use(Routes.teamRouter)

export default app
