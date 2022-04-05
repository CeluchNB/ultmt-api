import dotenv from 'dotenv'
import { connectDatabase } from './loaders/mongoose'

const pathToEnv = process.cwd() + '/src/config/.env'
dotenv.config({ path: pathToEnv })

connectDatabase()

import app from './app'

const PORT = process.env.PORT || 3000

app.listen(PORT, (): void => {
    return console.log(`Server started on port: ${PORT}`)
})
