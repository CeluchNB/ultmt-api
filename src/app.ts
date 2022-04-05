import cors from 'cors'
import express, { Application } from 'express'
import * as Routes from './routes'
import passport from 'passport'

const app: Application = express()
app.use(cors())
app.use(express.json())
app.use(passport.initialize())
require('./loaders/passport')
app.use(Routes.userRouter)
app.use(Routes.teamRouter)
app.use(Routes.rosterRequestRouter)

app.get('/', async (req, res) => {
    res.json({ message: 'The official API of The Ultmt App' })
})

export default app
