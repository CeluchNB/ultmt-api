import User from '../../../src/models/user'
import * as Constants from '../../../src/utils/constants'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser } from '../../fixtures/utils'
import jwt, { JwtPayload } from 'jsonwebtoken'

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
        const userData = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        expect(userRecord._id).toBeDefined()
        expect(userRecord._id.toString().length).toBeGreaterThan(5)
        expect(userRecord.firstName).toBe(userData.firstName)
        expect(userRecord.lastName).toBe(userData.lastName)
        expect(userRecord.email).toBe(userData.email)
        expect(userRecord.password).not.toBe(userData.password)
        expect(userRecord.private).toBe(false)
        expect(userRecord.playerTeams?.length).toBe(0)
        expect(userRecord.managerTeams?.length).toBe(0)
        expect(userRecord.requests.length).toBe(0)
        expect(userRecord.openToRequests).toBe(true)
    })

    it('save with invalid email', async () => {
        const userData = getUser()
        userData.email = 'first@email'

        const user = new User(userData)

        await expect(user.save()).rejects.toThrowError(Constants.INVALID_EMAIL)
    })

    it('save with invalid username', async () => {
        const userData = getUser()
        userData.username = 'bad username'

        const user = new User(userData)
        await expect(user.save()).rejects.toThrowError(Constants.INVALID_USERNAME)
    })

    it('save with invalid password', async () => {
        const userData = getUser()
        userData.password = 'Pass1234'

        const user = new User(userData)

        await expect(user.save()).rejects.toThrowError(Constants.INVALID_PASSWORD)
    })

    it('to json', async () => {
        const userData = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        const userJson = userRecord.toJSON()
        expect(userJson.firstName).toBe(userData.firstName)
        expect(userJson.lastName).toBe(userData.lastName)
        expect(userJson.email).toBe(userData.email)
        expect(userJson.password).toBeUndefined()
        expect(userJson.private).toBe(false)
        expect(userJson.playerTeams.length).toBe(0)
        expect(userJson.managerTeams.length).toBe(0)
        expect(userRecord.requests.length).toBe(0)
    })

    it('generate access token', async () => {
        const userData = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        const token = await userRecord.generateAuthToken()

        const userPostToken = await User.findById(userRecord._id)

        expect(token).toBeDefined()

        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
        expect(payload.sub).toBe(user._id.toString())
        const expectedTime = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 12
        expect(Math.abs(expectedTime - (payload.exp || 0))).toBeLessThanOrEqual(10)

        expect(userPostToken?.firstName).toBe(userData.firstName)
        expect(userPostToken?.lastName).toBe(userData.lastName)
        expect(userPostToken?.email).toBe(userData.email)
    })

    it('generate access token with jwt error', async () => {
        const userData = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        jest.spyOn(jwt, 'sign').mockImplementationOnce(() => {
            throw new Error('Error')
        })

        await expect(userRecord.generateAuthToken()).rejects.toThrowError(Constants.UNABLE_TO_GENERATE_TOKEN)
    })

    it('generate refresh token', async () => {
        const userData = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        const token = await userRecord.generateRefreshToken()

        const userPostToken = await User.findById(userRecord._id)

        expect(token).toBeDefined()

        const payload = jwt.verify(token, user.password as string) as JwtPayload
        expect(payload.sub).toBe(user._id.toString())
        const expectedTime = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 90
        expect(Math.abs(expectedTime - (payload.exp || 0))).toBeLessThanOrEqual(10)

        expect(userPostToken?.firstName).toBe(userData.firstName)
        expect(userPostToken?.lastName).toBe(userData.lastName)
        expect(userPostToken?.email).toBe(userData.email)
    })

    it('generate refresh token with jwt error', async () => {
        const userData = getUser()

        const user = new User(userData)
        const userRecord = await user.save()

        jest.spyOn(jwt, 'sign').mockImplementationOnce(() => {
            throw new Error('Error')
        })

        await expect(userRecord.generateRefreshToken()).rejects.toThrowError(Constants.UNABLE_TO_GENERATE_TOKEN)
    })

    it('test with duplicate email', async () => {
        const user1 = getUser()
        // setting different username so it's not a duplicate
        user1.username = 'randomusername'
        const user2 = getUser()
        await User.create(user1)
        await expect(User.create(user2)).rejects.toThrowError(Constants.DUPLICATE_EMAIL)
    })

    it('test with duplicate username', async () => {
        const user1 = getUser()
        // setting different email so it's not a duplicate
        user1.email = 'randomemail@email.com'
        const user2 = getUser()
        await User.create(user1)
        await expect(User.create(user2)).rejects.toThrowError(Constants.DUPLICATE_USERNAME)
    })
})
