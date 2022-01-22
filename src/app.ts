import cors from 'cors'
import express, { Application } from 'express'
import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'
import * as Routes from './routes'
import passport from 'passport'

const pathToEnv = process.cwd() + '/src/config/.env'
dotenv.config({ path: pathToEnv })

connectDatabase()

const app: Application = express()
app.use(cors())
app.use(express.json())
app.use(passport.initialize())
require('./loaders/passport')
app.use(Routes.userRouter)
app.use(Routes.teamRouter)
app.use(Routes.rosterRequestRouter)

export default app
