import UserServices from '../../../src/services/v1/user'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../fixtures/setup-db'
import { getUser, getTeam, anonId } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'
import { ApiError } from '../../../src/types'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'

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
        const user = getUser()

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
        const user = getUser()
        user.email = 'bad@email'

        await expect(services.signUp(user)).rejects.toThrowError(Constants.UNABLE_TO_CREATE_USER)
    })
})

describe('test login', () => {
    it('with existing email', async () => {
        const user = getUser()

        await User.create(user)
        const token = await services.login(user.email)
        const userRecord = await User.findOne({ email: user.email })

        expect(userRecord?.tokens?.length).toBe(1)
        expect(userRecord?.tokens?.[0]).toBe(token)
    })

    it('with non-existing email', async () => {
        const user = getUser()

        await User.create(user)
        await expect(services.login('absent@email.com')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500),
        )
    })
})

describe('test logout', () => {
    it('with existing email and one token', async () => {
        const user = getUser()

        const userRecord = await User.create(user)
        userRecord.tokens?.push('token1')
        await userRecord.save()

        await services.logout(user.email, 'token1')

        const testUser = await User.findOne({ email: user.email })
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with existing email and three tokens', async () => {
        const user = getUser()
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
        const user = getUser()

        await User.create(user)
        await expect(services.logout('absent@email.com', 'token1')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test logout all', () => {
    it('with existing email and one token', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        userRecord.tokens?.push('token1')
        await userRecord.save()

        await services.logoutAll(user.email)
        const testUser = await User.findOne({ email: user.email })
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with existing email and three tokens', async () => {
        const user = getUser()
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
        const user = getUser()
        await User.create(user)

        await expect(services.logoutAll('absent@email.com')).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test get user', () => {
    it('with existing, public user', async () => {
        const user = getUser()
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
        const user = getUser()
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
        const user1 = getUser()
        const user2 = getUser()
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
        const user = getUser()
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
        user.openToRequests = true
        await user.save()

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

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
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

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
        await team.save()

        await expect(services.leaveTeam(anonId, team._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
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

describe('test search user', () => {
    beforeEach(async () => {
        const user1 = getUser()
        user1.firstName = 'Noah'
        user1.lastName = 'Celuch'
        user1.username = 'noahceluch'
        user1.email = 'noahceluch@gmail.com'

        const user2 = getUser()
        user2.firstName = 'Connor'
        user2.lastName = 'Tipping'
        user2.username = 'connortipping'
        user2.email = 'connortipping@gmail.com'

        const user3 = getUser()
        user3.firstName = 'Zach'
        user3.lastName = 'Risinger'
        user3.username = 'zachris'
        user3.email = 'zachris@gmail.com'

        const user4 = getUser()
        user4.firstName = 'Zach'
        user4.lastName = 'Dahm'
        user4.username = 'zachdahm'
        user4.email = 'zachdahm@gmail.com'

        const noah = await User.create(user1)
        noah.openToRequests = true
        await noah.save()
        const connor = await User.create(user2)
        connor.openToRequests = true
        await connor.save()
        const zachr = await User.create(user3)
        zachr.openToRequests = true
        await zachr.save()
        const zachd = await User.create(user4)
        zachd.openToRequests = true
        await zachd.save()
    })

    it('test search first name', async () => {
        const result = await services.searchUsers('Noah')

        expect(result.length).toBe(1)
        expect(result[0].username).toBe('noahceluch')
    })

    it('test search last name', async () => {
        const result = await services.searchUsers('Tipping')

        expect(result.length).toBe(1)
        expect(result[0].username).toBe('connortipping')
    })

    it('test by full name', async () => {
        const result = await services.searchUsers('Zach Risinger')

        expect(result.length).toBe(2)
        expect(result[0].username).toBe('zachris')
        expect(result[1].username).toBe('zachdahm')
    })

    it('test search username', async () => {
        const result = await services.searchUsers('zachris')

        expect(result.length).toBe(1)
        expect(result[0].username).toBe('zachris')
    })

    it('test partial name', async () => {
        const result = await services.searchUsers('Con Tip')
        expect(result.length).toBe(1)
        expect(result[0].username).toBe('connortipping')
    })

    it('test search zachs', async () => {
        const result = await services.searchUsers('zach')
        expect(result.length).toBe(2)
    })

    it('test not enough characters', async () => {
        await expect(services.searchUsers('no')).rejects.toThrowError(
            new ApiError(Constants.NOT_ENOUGH_CHARACTERS, 400),
        )
    })
})

describe('test manager leave functionality', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager, manager2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        const result = await services.leaveManagerRole(team._id, manager._id)
        expect(result._id.toString()).toBe(manager._id.toString())
        expect(result.managerTeams.length).toBe(0)

        const resultTeam = await Team.findById(team._id)
        expect(resultTeam?.managers.length).toBe(1)
        expect(resultTeam?.managers[0]._id.toString()).toBe(manager2._id.toString())
    })

    it('with non-existent team', async () => {
        const [manager, manager2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        await expect(services.leaveManagerRole(anonId, manager._id)).rejects.toThrowError(Constants.UNABLE_TO_FIND_TEAM)
    })

    it('with non-existent manager', async () => {
        const [manager, manager2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        await expect(services.leaveManagerRole(team._id, anonId)).rejects.toThrowError(Constants.UNABLE_TO_FIND_USER)
    })

    it('with last manager error', async () => {
        const [manager] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.leaveManagerRole(team._id, manager._id)).rejects.toThrowError(
            Constants.USER_IS_ONLY_MANAGER,
        )
    })
})
