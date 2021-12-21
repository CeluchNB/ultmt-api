import UserServices from '../../../src/services/user'
import User from '../../../src/models/user'
import { IUser, ITeam } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'
import { ApiError } from '../../../src/types'
import Team from '../../../src/models/team'

const services: UserServices = new UserServices(User)
const anonId = '507f191e810c19729de860ea'

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
        expect(userRecord.playerTeams?.length).toBe(0)
        expect(userRecord.managerTeams?.length).toBe(0)
        expect(userRecord.requestsToTeams?.length).toBe(0)
        expect(userRecord.requestsFromTeams?.length).toBe(0)
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
        expect(userResponse.playerTeams?.toString()).toBe(userRecord.playerTeams?.toString())
        expect(userResponse.managerTeams?.toString()).toBe(userRecord.managerTeams?.toString())
        expect(userResponse.requestsToTeams?.toString()).toBeUndefined()
        expect(userResponse.requestsFromTeams?.toString()).toBeUndefined()
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
        expect(userResponse.playerTeams).toBeUndefined()
        expect(userResponse.managerTeams).toBeUndefined()
        expect(userResponse.requestsToTeams).toBeUndefined()
        expect(userResponse.requestsFromTeams).toBeUndefined()
        expect(userResponse.stats).toBeUndefined()
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

describe('test request to join team', () => {
    it('with valid data', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)

        const userResponse = await services.requestRoster(teamRecord._id, userRecord._id)

        expect(userResponse).toBeDefined()
        expect(userResponse?.requestsToTeams?.length).toBe(1)
        expect(userResponse?.requestsToTeams?.[0].toString()).toBe(teamRecord._id.toString())

        const userData = await User.findById(userRecord._id)
        expect(userData?.requestsToTeams?.length).toBe(1)
        expect(userData?.requestsToTeams?.[0].toString()).toBe(teamRecord._id.toString())

        const teamData = await Team.findById(teamRecord._id)
        expect(teamData?.requestsFromPlayers?.length).toBe(1)
        expect(teamData?.requestsFromPlayers?.[0].toString()).toBe(userRecord._id.toString())
    })

    it('with non-existent team', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        await Team.create(team)

        await expect(services.requestRoster(anonId, userRecord._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent user', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        await User.create(user)
        const teamRecord = await Team.create(team)

        await expect(services.requestRoster(teamRecord._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with player already requesting to join team', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)

        userRecord.requestsToTeams?.push(teamRecord._id)
        await userRecord.save()

        await expect(services.requestRoster(teamRecord._id, userRecord._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400),
        )
    })

    it('with team already having request from player', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)

        teamRecord.requestsFromPlayers?.push(userRecord._id)
        await teamRecord.save()

        await expect(services.requestRoster(teamRecord._id, userRecord._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400),
        )
    })

    it('with player already having request from team', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)

        userRecord.requestsFromTeams?.push(teamRecord._id)
        await userRecord.save()

        await expect(services.requestRoster(teamRecord._id, userRecord._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400),
        )
    })

    it('with team already requesting player', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)

        teamRecord.requestsToPlayers?.push(userRecord._id)
        await teamRecord.save()

        await expect(services.requestRoster(teamRecord._id, userRecord._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400),
        )
    })

    it('with player already on team roster', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)

        teamRecord.players?.push(userRecord._id)
        await teamRecord.save()

        await expect(services.requestRoster(teamRecord._id, userRecord._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_JOINED, 400),
        )
    })

    it('with team already on player list', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)

        userRecord.playerTeams?.push(teamRecord._id)
        await userRecord.save()

        await expect(services.requestRoster(teamRecord._id, userRecord._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_JOINED, 400),
        )
    })
})
