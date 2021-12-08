import UserServices from '../../../src/services/user'
import User from '../../../src/models/user'
import { IUser } from '../../../src/types/user'
import dotenv from 'dotenv'
import { connect, connection } from 'mongoose'
dotenv.config({ path: './path/config' })

describe('test user services', () => {
    let services: UserServices
    let user: IUser

    beforeAll(async () => {
        await connect('mongodb://127.0.0.1:27017/ultmt-test')
        services = new UserServices(User)

        user = {
            firstName: 'Connor',
            lastName: 'Tipping',
            email: 'connor@tbirds.com',
            password: 'Pass1',
            tokens: [],
            playerTeams: [],
            managerTeams: [],
            stats: [],
        }
    })

    afterAll((done) => {
        connection.close()
        done()
    })

    it('test sign up with valid user', async () => {
        const userRecord = await services.signUp(user)
        expect(userRecord.firstName).toBe(user.firstName)
    })
})
