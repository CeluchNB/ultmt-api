import UserServices from '../../../src/services/user'
import User from '../../../src/models/user'
import { IUser } from '../../../src/types/user'
import { setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import * as Constants from '../../../src/utils/constants'

let services: UserServices

beforeAll(async () => {
    await setUpDatabase()
    services = new UserServices(User)
})

afterEach(async () => {
    await User.deleteMany({})
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('test sign up', () => {
    it('with valid user data', async () => {
        const user: IUser = {
            firstName: 'FirstName',
            lastName: 'LastName',
            email: 'last@email.com',
            password: 'Pass123!',
        }

        const { user: userRecord, token } = await services.signUp(user)
        expect(userRecord.firstName).toBe(user.firstName)
        expect(userRecord.lastName).toBe(user.lastName)
        expect(userRecord.email).toBe(user.email)
        expect(userRecord.password).not.toBe(user.password)
        expect(userRecord.tokens?.length).toBe(1)
        expect(userRecord.playerTeams?.length).toBe(0)
        expect(userRecord.managerTeams?.length).toBe(0)
        expect(userRecord.stats?.length).toBe(0)
        expect(token).toBeDefined()
    })

    it('with invalid email', async () => {
        const user: IUser = {
            firstName: 'FirstName',
            lastName: 'LastName',
            email: 'bad@email',
            password: 'Pass123!',
        }

        expect(async () => {
            const { user: userRecord, token } = await services.signUp(user)
            console.log('return value', userRecord, token)
        }).rejects.toThrowError(Constants.UNABLE_TO_CREATE_USER)
    })

    it('with invalid password', async () => {
        const user: IUser = {
            firstName: 'FirstName',
            lastName: 'LastName',
            email: 'last@email.com',
            password: 'Pass',
        }

        expect(async () => {
            await services.signUp(user)
        }).rejects.toThrowError(Constants.UNABLE_TO_CREATE_USER)
    })
})
