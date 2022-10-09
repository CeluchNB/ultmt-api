import * as Constants from '../../../src/utils/constants'
import AuthenticationServices from '../../../src/services/v1/authentication'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { setUpDatabase, resetDatabase, tearDownDatabase, redisClient } from '../../fixtures/setup-db'
import { getUser, getTeam, anonId } from '../../fixtures/utils'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { ApiError } from '../../../src/types/errors'
import { Types } from 'mongoose'
import MockDate from 'mockdate'

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

const services = new AuthenticationServices(User, Team, redisClient)
describe('test login', () => {
    it('with existing email', async () => {
        const user = await User.create(getUser())
        const tokens = await services.login(user._id.toString())

        const accessPayload = jwt.verify(tokens.access, process.env.JWT_SECRET as string) as JwtPayload
        const refreshPayload = jwt.verify(tokens.refresh, user.password as string) as JwtPayload

        expect(accessPayload.sub).toBe(user._id.toString())
        expect(accessPayload.exp).toBe(Math.floor(new Date().getTime() / 1000) + 60 * 60 * 12)

        expect(refreshPayload.sub).toBe(user._id.toString())
        expect(refreshPayload.exp).toBe(Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 90)
    })

    it('with non-existing user', async () => {
        const user = getUser()

        await User.create(user)
        await expect(services.login(new Types.ObjectId().toString())).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500),
        )
    })
})

describe('test logout', () => {
    it('with existing email and one token', async () => {
        const userRecord = await User.create(getUser())
        await services.logout(userRecord._id.toString(), 'token1', 'token2')
        const accessExp = await redisClient.ttl('token1')
        expect(accessExp).toBe(60 * 60 * 12)
        const refreshExp = await redisClient.ttl('token2')
        expect(refreshExp).toBe(60 * 60 * 24 * 90)
    })

    it('with non-existing user', async () => {
        await expect(services.logout(new Types.ObjectId().toString(), 'token1', 'token2')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

// describe('test logout all', () => {
//     it('with existing email and one token', async () => {
//         const user = getUser()
//         const userRecord = await User.create(user)
//         await userRecord.save()

//         await services.logoutAll(user.email)
//         const testUser = await User.findOne({ email: user.email })
//     })

//     it('with existing email and three tokens', async () => {
//         const user = getUser()
//         const userRecord = await User.create(user)
//         await userRecord.save()

//         await services.logoutAll(user.email)
//         const testUser = await User.findOne({ email: user.email })
//     })

//     it('with non-existing email', async () => {
//         const user = getUser()
//         await User.create(user)

//         await expect(services.logoutAll('absent@email.com')).rejects.toThrowError(
//             new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
//         )
//     })
// })

describe('test authenticate manager', () => {
    it('should correctly authenticate manager', async () => {
        const teamData = getTeam()
        const userData = getUser()
        const team = await Team.create(teamData)
        const user = await User.create(userData)

        team.managers.push(getEmbeddedUser(user))
        await team.save()
        user.managerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const result = await services.authenticateManager(user._id.toString(), team._id.toString())
        expect(result._id.toString()).toBe(user._id.toString())
        expect(result.username).toBe(user.username)
    })

    it('should throw error with unfound team', async () => {
        const teamData = getTeam()
        const userData = getUser()
        const team = await Team.create(teamData)
        const user = await User.create(userData)

        team.managers.push(getEmbeddedUser(user))
        await team.save()
        user.managerTeams.push(getEmbeddedTeam(team))
        await user.save()

        expect(services.authenticateManager(anonId, team._id.toString())).rejects.toThrowError(
            Constants.UNAUTHORIZED_MANAGER,
        )
    })

    it('should throw error with non-manager', async () => {
        const teamData = getTeam()
        const userData = getUser()
        const team = await Team.create(teamData)
        const user = await User.create(userData)

        expect(services.authenticateManager(user._id.toString(), team._id.toString())).rejects.toThrowError(
            Constants.UNAUTHORIZED_MANAGER,
        )
    })
})

describe('test refresh tokens', () => {
    it('valid data with new refresh token', async () => {
        const user = await User.create(getUser())
        const access = await user.generateAuthToken()
        const refresh = await user.generateRefreshToken()
        MockDate.set(new Date().getTime() + 2000)

        const tokens = await services.refreshTokens(refresh)
        expect(tokens.access).not.toEqual(access)
        expect(tokens.refresh).toEqual(refresh)

        const keys = await redisClient.keys('*')
        expect(keys.length).toBe(0)
        MockDate.reset()
    })

    it('with valid data with old token', async () => {
        const user = await User.create(getUser())
        const access = await user.generateAuthToken()
        const refresh = await user.generateRefreshToken()
        MockDate.set(new Date().getTime() + 1000 * 60 * 60 * 24 * 75)

        const tokens = await services.refreshTokens(refresh)
        expect(tokens.access).not.toEqual(access)
        expect(tokens.refresh).not.toEqual(refresh)

        const keys = await redisClient.keys('*')
        expect(keys.length).toBe(1)
        MockDate.reset()
    })

    it('with expired refresh token', async () => {
        const user = await User.create(getUser())
        const refresh = await user.generateRefreshToken()
        MockDate.set(new Date().getTime() + 1000 * 60 * 60 * 24 * 91)

        await expect(services.refreshTokens(refresh)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_VERIFY_TOKEN, 401),
        )
        MockDate.reset()
    })

    it('with unfound user', async () => {
        const user = await User.create(getUser())
        const refresh = jwt.sign({ sub: anonId }, user.password as string)

        await expect(services.refreshTokens(refresh)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_VERIFY_TOKEN, 401),
        )
    })

    it('with token in blacklist', async () => {
        const user = await User.create(getUser())
        const refresh = await user.generateRefreshToken()
        await redisClient.setEx(refresh, 30, '1')

        await expect(services.refreshTokens(refresh)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_VERIFY_TOKEN, 401),
        )
    })
})
