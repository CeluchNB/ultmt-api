import cors from 'cors'
import express, { Application, ErrorRequestHandler } from 'express'
import { createLazyRouter } from 'express-lazy-router'
import passport from 'passport'
import './loaders/sendgrid'
import { Logger } from './logging'

const app: Application = express()
app.use(cors())
app.use(express.json())

app.use(passport.initialize())
import './loaders/passport'
import { errorMiddleware } from './middleware/errors'

const lazyRouter = createLazyRouter()
// Version 1 of API
app.use(
    '/api/v1',
    lazyRouter(() => import('./routes/v1')),
)

const logger = Logger()
app.use(logger.errorMiddleware as ErrorRequestHandler)
app.use(errorMiddleware)

app.get('/ultmt', async (req, res) => {
    res.json({ message: 'The official API of The Ultmt App' })
})

export default app
