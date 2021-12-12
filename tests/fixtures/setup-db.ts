import { connect, connection } from 'mongoose'
import User from '../../src/models/user'

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
    await User.deleteMany({})
}

export const tearDownDatabase = () => {
    connection.close()
}
