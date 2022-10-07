import * as Constants from '../../../src/utils/constants'
import AuthenticationServices from '../../../src/services/v1/authentication'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam, anonId } from '../../fixtures/utils'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { ApiError } from '../../../src/types/errors'
import { Types } from 'mongoose'

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

const services = new AuthenticationServices(User, Team)
describe('test login', () => {
    it('with existing email', async () => {
        const user = await User.create(getUser())
        const token = await services.login(user._id.toString())

        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload

        expect(payload.sub).toBe(user._id.toString())
        expect(payload.exp).toBe(Math.floor(new Date().getTime() / 1000) + 60 * 60 * 12)
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
    //     it('with existing email and one token', async () => {
    //         const user = getUser()

    //         const userRecord = await User.create(user)

    //         await services.logout(user.email, 'token1')
    //     })

    //     it('with existing email and three tokens', async () => {
    //         const user = getUser()
    //         const userRecord = await User.create(user)
    //         await userRecord.save()

    //         await services.logout(user.email, 'token2')

    //         const testUser = await User.findOne({ email: user.email })
    //     })

    it('with non-existing user', async () => {
        const user = await User.create(getUser())
        await expect(services.logout(new Types.ObjectId().toString(), 'token1')).rejects.toThrowError(
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
