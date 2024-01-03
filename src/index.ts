import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'
import { connectRedis } from './loaders/redis'

const pathToEnv = process.cwd() + '/src/config/.env'
dotenv.config({ path: pathToEnv })

const start = async () => {
    await connectDatabase()
    await connectRedis()

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const app = require('./app').default

    const PORT = process.env.PORT || 3000

    app.listen(PORT, (): void => {
        return console.log(`Server started on port: ${PORT}`)
    })
}

start()
