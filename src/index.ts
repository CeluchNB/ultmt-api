console.log('Very first thing', Date.now())
import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'
import { connectRedis } from './loaders/redis'

const pathToEnv = process.cwd() + '/src/config/.env'
dotenv.config({ path: pathToEnv })

const start = async () => {
    console.log('Connecting Mongo', Date.now())
    await connectDatabase()
    console.log('After connect Mongo', Date.now())
    console.log('Before connect Redis', Date.now())
    await connectRedis()
    console.log('After connect Redis', Date.now())

    console.log('Before import app', Date.now())
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const app = require('./app').default
    console.log('After import app', Date.now())

    const PORT = process.env.PORT || 3000

    app.listen(PORT, (): void => {
        console.log('Listening', Date.now())
        return console.log(`Server started on port: ${PORT}`)
    })
}

start()
