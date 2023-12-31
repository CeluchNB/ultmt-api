console.log('Importing cors', Date.now())
import cors from 'cors'
console.log('Importing express', Date.now())
import express, { Application } from 'express'
import { createLazyRouter } from 'express-lazy-router'
console.log('Importing router', Date.now())
// import { router as v1Router } from './routes/v1'
console.log('Importing passport', Date.now())
import passport from 'passport'
console.log('Importing sendgrid', Date.now())
import './loaders/sendgrid'

const app: Application = express()
console.log('Setting middleware', Date.now())
app.use(cors())
app.use(express.json())

app.use(passport.initialize())
console.log('Importing passport', Date.now())
import './loaders/passport'

console.log('Adding router', Date.now())
const lazyRouter = createLazyRouter()
// Version 1 of API
app.use(
    '/api/v1',
    lazyRouter(() => import('./routes/v1')),
)

console.log('Adding info endpoint', Date.now())
app.get('/ultmt', async (req, res) => {
    res.json({ message: 'The official API of The Ultmt App' })
})

export default app
