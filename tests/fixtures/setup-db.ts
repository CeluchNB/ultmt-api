import { connect, connection } from 'mongoose'
import User from '../../src/models/user'
import Team from '../../src/models/team'
import { IUser } from '../../src/types'

export const setUpDatabase = async () => {
    await connect(process.env.MONGOOSE_URL as string)
}

export const saveUsers = async () => {
    const user1: IUser = {
        firstName: 'First1',
        lastName: 'Last1',
        email: 'first.last1@email.com',
        username: 'firstlast1',
        password: 'Pass123!',
    }
    const user2: IUser = {
        firstName: 'First2',
        lastName: 'Last2',
        email: 'first.last2@email.com',
        username: 'firstlast2',
        password: 'Pass123!',
    }

    const user3: IUser = {
        firstName: 'First3',
        lastName: 'Last3',
        email: 'first.last3@email.com',
        username: 'firstlast3',
        password: 'Pass123!',
    }

    await User.create(user1)
    await User.create(user2)
    await User.create(user3)
}

export const resetDatabase = async () => {
    await User.deleteMany({})
    await Team.deleteMany({})
}

export const tearDownDatabase = () => {
    connection.close()
}
