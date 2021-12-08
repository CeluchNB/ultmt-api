import { connect, connection } from 'mongoose'

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
}

export const tearDownDatabase = () => {
    connection.close()
}
