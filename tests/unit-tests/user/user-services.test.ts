import UserServices from '../../../src/services/user'
import User from '../../../src/models/user'
import { IUser } from '../../../src/types/user'
import { setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'

describe('test user services', () => {
    let services: UserServices
    let user: IUser

    beforeAll(async () => {
        await setUpDatabase()
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
        tearDownDatabase()
        done()
    })

    it('test sign up with valid user', async () => {
        const userRecord = await services.signUp(user)
        expect(userRecord.firstName).toBe(user.firstName)
    })
})
