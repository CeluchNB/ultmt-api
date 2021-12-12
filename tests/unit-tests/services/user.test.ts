import UserServices from '../../../src/services/user'
import User from '../../../src/models/user'
import { IUser } from '../../../src/types/user'
import { setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'
import { ApiError } from '../../../src/types'

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
        const user: IUser = getUser()

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
        expect(token.length).toBeGreaterThan(10)
    })

    it('with invalid user data', async () => {
        const user: IUser = getUser()
        user.email = 'bad@email'

        expect(async () => {
            await services.signUp(user)
        }).rejects.toThrowError(Constants.UNABLE_TO_CREATE_USER)
    })
})

describe('test login', () => {
    it('with existing email', async () => {
        const user: IUser = getUser()

        await User.create(user)
        const token = await services.login(user.email)
        const userRecord = await User.findOne({ email: user.email })

        expect(userRecord?.tokens?.length).toBe(1)
        expect(userRecord?.tokens?.[0]).toBe(token)
    })

    it('with non-existing email', async () => {
        const user: IUser = getUser()

        await User.create(user)
        expect(async () => {
            await services.login('absent@email.com')
        }).rejects.toThrowError(new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500))
    })
})

describe('test logout', () => {
    it('with existing email', async () => {
        const user: IUser = getUser()

        const userRecord = await User.create(user)
        userRecord.tokens?.push('token1')
        await userRecord.save()

        await services.logout(user.email, 'token1')

        const testUser = await User.findOne({ email: user.email })
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with non-existing email', async () => {
        const user: IUser = getUser()

        await User.create(user)
        expect(async () => {
            await services.logout('absent@email.com', 'token1')
        }).rejects.toThrowError(new ApiError(Constants.UNABLE_TO_FIND_USER, 400))
    })
})
