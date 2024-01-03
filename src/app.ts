import cors from 'cors'
import express, { Application } from 'express'
import { createLazyRouter } from 'express-lazy-router'
import passport from 'passport'
import './loaders/sendgrid'

const app: Application = express()
app.use(cors())
app.use(express.json())

app.use(passport.initialize())
import './loaders/passport'

const lazyRouter = createLazyRouter()
// Version 1 of API
app.use(
    '/api/v1',
    lazyRouter(() => import('./routes/v1')),
)

app.get('/ultmt', async (req, res) => {
    res.json({ message: 'The official API of The Ultmt App' })
})

export default app
