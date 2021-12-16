import { connect, connection } from 'mongoose'
import User from '../../src/models/user'
import Team from '../../src/models/team'

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
}

export const resetDatabase = async () => {
    await User.deleteMany({})
    await Team.deleteMany({})
}

export const tearDownDatabase = () => {
    connection.close()
}
