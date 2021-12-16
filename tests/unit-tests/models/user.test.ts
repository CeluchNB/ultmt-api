import User from '../../../src/models/user'
import { IUser } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser } from '../../fixtures/utils'
import jwt from 'jsonwebtoken'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('test user model', () => {
    it('save with valid data', async () => {
        const userData: IUser = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        expect(userRecord._id).toBeDefined()
        expect(userRecord._id.toString().length).toBeGreaterThan(5)
        expect(userRecord.firstName).toBe(userData.firstName)
        expect(userRecord.lastName).toBe(userData.lastName)
        expect(userRecord.email).toBe(userData.email)
        expect(userRecord.password).not.toBe(userData.password)
        expect(userRecord.private).toBe(false)
        expect(userRecord.tokens?.length).toBe(0)
        expect(userRecord.playerTeams?.length).toBe(0)
        expect(userRecord.managerTeams?.length).toBe(0)
        expect(userRecord.requestsToTeams?.length).toBe(0)
        expect(userRecord.requestsFromTeams?.length).toBe(0)
        expect(userRecord.stats?.length).toBe(0)
    })

    it('save with invalid email', async () => {
        const userData: IUser = getUser()
        userData.email = 'first@email'

        const user = new User(userData)

        expect(async () => {
            await user.save()
        }).rejects.toThrowError(Constants.INVALID_EMAIL)
    })

    it('save with invalid username', async () => {
        const userData: IUser = getUser()
        userData.username = 'bad username'

        const user = new User(userData)
        expect(async () => {
            await user.save()
        }).rejects.toThrowError(Constants.INVALID_USERNAME)
    })

    it('save with invalid password', async () => {
        const userData: IUser = getUser()
        userData.password = 'Pass1234'

        const user = new User(userData)

        expect(async () => {
            await user.save()
        }).rejects.toThrowError(Constants.INVALID_PASSWORD)
    })

    it('to json', async () => {
        const userData: IUser = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        const userJson = userRecord.toJSON()
        expect(userJson.firstName).toBe(userData.firstName)
        expect(userJson.lastName).toBe(userData.lastName)
        expect(userJson.email).toBe(userData.email)
        expect(userJson.password).toBeUndefined()
        expect(userJson.tokens).toBeUndefined()
        expect(userJson.private).toBe(false)
        expect(userJson.playerTeams?.length).toBe(0)
        expect(userJson.managerTeams?.length).toBe(0)
        expect(userRecord.requestsToTeams?.length).toBe(0)
        expect(userRecord.requestsFromTeams?.length).toBe(0)
        expect(userJson.stats?.length).toBe(0)
    })

    it('generate auth token', async () => {
        const userData: IUser = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        const token = await userRecord.generateAuthToken()

        const userPostToken = await User.findById(userRecord._id)

        expect(token).toBeDefined()
        expect(token.length).toBeGreaterThan(10)

        expect(userPostToken?.firstName).toBe(userData.firstName)
        expect(userPostToken?.lastName).toBe(userData.lastName)
        expect(userPostToken?.email).toBe(userData.email)
        expect(userPostToken?.tokens?.length).toBe(1)
        expect(userPostToken?.tokens?.[0]).toBe(token)
    })

    it('generate auth token with jwt error', async () => {
        const userData: IUser = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        jest.spyOn(jwt, 'sign').mockImplementationOnce(() => {
            throw new Error('Error')
        })

        expect(async () => {
            await userRecord.generateAuthToken()
        }).rejects.toThrowError(Constants.UNABLE_TO_GENERATE_TOKEN)
    })

    it('generate auth token with save error', async () => {
        const userData: IUser = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new Error('Error')
        })

        expect(async () => {
            await userRecord.generateAuthToken()
        }).rejects.toThrowError(Constants.UNABLE_TO_GENERATE_TOKEN)
    })
})
