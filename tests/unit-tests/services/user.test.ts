import UserServices from '../../../src/services/user'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { IUser } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam, anonId } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'
import { ApiError } from '../../../src/types'

const services: UserServices = new UserServices(User, Team)

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

describe('test sign up', () => {
    it('with valid user data', async () => {
        const user: IUser = getUser()

        const { user: userRecord, token } = await services.signUp(user)
        expect(userRecord._id).toBeDefined()
        expect(userRecord.firstName).toBe(user.firstName)
        expect(userRecord.lastName).toBe(user.lastName)
        expect(userRecord.email).toBe(user.email)
        expect(userRecord.password).not.toBe(user.password)
        expect(userRecord.tokens?.length).toBe(1)
        expect(userRecord.playerTeams.length).toBe(0)
        expect(userRecord.managerTeams.length).toBe(0)
        expect(userRecord.requests.length).toBe(0)
        expect(userRecord.stats?.length).toBe(0)

        expect(token).toBeDefined()
        expect(token.length).toBeGreaterThan(10)
    })

    it('with invalid user data', async () => {
        const user: IUser = getUser()
        user.email = 'bad@email'

        await expect(services.signUp(user)).rejects.toThrowError(Constants.UNABLE_TO_CREATE_USER)
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
        await expect(services.login('absent@email.com')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500),
        )
    })
})

describe('test logout', () => {
    it('with existing email and one token', async () => {
        const user: IUser = getUser()

        const userRecord = await User.create(user)
        userRecord.tokens?.push('token1')
        await userRecord.save()

        await services.logout(user.email, 'token1')

        const testUser = await User.findOne({ email: user.email })
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with existing email and three tokens', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        userRecord.tokens?.push('token1')
        userRecord.tokens?.push('token2')
        userRecord.tokens?.push('token3')
        await userRecord.save()

        await services.logout(user.email, 'token2')

        const testUser = await User.findOne({ email: user.email })
        expect(testUser?.tokens?.length).toBe(2)
        expect(testUser?.tokens).not.toContain('token2')
    })

    it('with non-existing email', async () => {
        const user: IUser = getUser()

        await User.create(user)
        await expect(services.logout('absent@email.com', 'token1')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test logout all', () => {
    it('with existing email and one token', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        userRecord.tokens?.push('token1')
        await userRecord.save()

        await services.logoutAll(user.email)
        const testUser = await User.findOne({ email: user.email })
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with existing email and three tokens', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        userRecord.tokens?.push('token1')
        userRecord.tokens?.push('token2')
        userRecord.tokens?.push('token3')
        await userRecord.save()

        await services.logoutAll(user.email)
        const testUser = await User.findOne({ email: user.email })
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with non-existing email', async () => {
        const user: IUser = getUser()
        await User.create(user)

        await expect(services.logoutAll('absent@email.com')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test get user', () => {
    it('with existing, public user', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)

        const userResponse = await services.getUser(userRecord._id)

        expect(userResponse._id.toString()).toBe(userRecord._id.toString())
        expect(userResponse.firstName).toBe(userRecord.firstName)
        expect(userResponse.lastName).toBe(userRecord.lastName)
        expect(userResponse.email).toBe(userRecord.email)
        expect(userResponse.tokens?.toString()).toBe(userRecord.tokens?.toString())
        expect(userResponse.playerTeams.toString()).toBe(userRecord.playerTeams?.toString())
        expect(userResponse.managerTeams.toString()).toBe(userRecord.managerTeams?.toString())
        expect(userResponse.requests.length).toBe(0)
        expect(userResponse.stats?.toString()).toBe(userRecord.stats?.toString())
    })

    it('with existing, private user', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        userRecord.private = true
        await userRecord.save()

        const userResponse = await services.getUser(userRecord._id)
        expect(userResponse._id.toString()).toBe(userRecord._id.toString())
        expect(userResponse.firstName).toBe(userRecord.firstName)
        expect(userResponse.lastName).toBe(userRecord.lastName)
        expect(userResponse.email).toBe(userRecord.email)
        expect(userResponse.tokens?.toString()).toBe(userRecord.tokens?.toString())
        expect(userResponse.playerTeams.length).toBe(0)
        expect(userResponse.managerTeams.length).toBe(0)
        expect(userResponse.requests.length).toBe(0)
        expect(userResponse.stats.length).toBe(0)
    })

    it('with non-existent user', async () => {
        await expect(services.getUser(anonId)).rejects.toThrowError(new ApiError(Constants.UNABLE_TO_FIND_USER, 404))
    })

    it('with bad id', async () => {
        await expect(services.getUser('badid')).rejects.toThrow()
    })
})

describe('test delete account', () => {
    it('with existing user', async () => {
        const user1: IUser = getUser()
        const user2: IUser = getUser()
        user2.email = 'first.last2@email.com'
        user2.username = 'lastfirst'
        const userRecord1 = await User.create(user1)
        const userRecord2 = await User.create(user2)

        await services.deleteUser(userRecord1._id)

        const userResult1 = await User.findById(userRecord1._id)
        const userResult2 = await User.findById(userRecord2._id)

        expect(userResult1).toBeNull()
        expect(userResult2).not.toBeNull()
    })

    it('with non-existing user', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)

        services.deleteUser(anonId)
        const userResult = await User.findById(userRecord._id)
        expect(userResult).not.toBeNull()
    })
})

describe('test set open to requests', () => {
    it('with valid open data', async () => {
        const user = await User.create(getUser())

        const userResponse = await services.setOpenToRequests(user._id, true)
        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.openToRequests).toBe(true)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.openToRequests).toBe(true)
    })

    it('with valid close data', async () => {
        const user = await User.create(getUser())

        const userResponse = await services.setOpenToRequests(user._id, false)
        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.openToRequests).toBe(false)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.openToRequests).toBe(false)
    })

    it('with non-existent user', async () => {
        await User.create(getUser())
        await expect(services.setOpenToRequests(anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test leave team', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        user.playerTeams.push(team._id)
        await user.save()
        team.players.push(user._id)
        await team.save()

        const result = await services.leaveTeam(user._id, team._id)
        expect(result._id.toString()).toBe(user._id.toString())
        expect(result.playerTeams.length).toBe(0)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)
    })

    it('with non-existent user', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        user.playerTeams.push(team._id)
        await user.save()
        team.players.push(user._id)
        await team.save()

        await expect(services.leaveTeam(anonId, team._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        user.playerTeams.push(team._id)
        await user.save()
        team.players.push(user._id)
        await team.save()

        await expect(services.leaveTeam(user._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with user not on team', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        await expect(services.leaveTeam(user._id, team._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_NOT_ON_TEAM, 404),
        )
    })
})
