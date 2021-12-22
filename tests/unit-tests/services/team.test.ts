import TeamServices from '../../../src/services/team'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { ApiError, ITeam, IUser } from '../../../src/types'
import { getTeam, getUser } from '../../fixtures/utils'
import { setUpDatabase, saveUsers, tearDownDatabase, resetDatabase } from '../../fixtures/setup-db'
import * as Constants from '../../../src/utils/constants'

const anonId = '507f191e810c19729de860ea'
const services = new TeamServices(Team, User)

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('test create team', () => {
    it('with minimal, valid data', async () => {
        const user: IUser = getUser()
        const userResponse = await User.create(user)

        const team: ITeam = getTeam()
        const teamResponse = await services.createTeam(team, userResponse)
        const teamRecord = await Team.findById(teamResponse._id)
        const userRecord = await User.findById(userResponse._id)

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
        expect(teamResponse.managers[0].toString()).toBe(userResponse._id.toString())
        expect(teamResponse.players.length).toBe(0)
        expect(teamResponse.seasonStart).toBe(team.seasonStart)
        expect(teamResponse.seasonEnd).toBe(team.seasonEnd)
        expect(teamResponse.requestsFromPlayers.length).toBe(0)
        expect(teamResponse.requestsToPlayers.length).toBe(0)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.requestsToPlayerArray.length).toBe(0)
        expect(teamResponse.requestsFromPlayerArray).toBeUndefined()
        expect(teamResponse.playerArray).toBeUndefined()

        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.name).toBe(team.name)
        expect(teamRecord?.managers.length).toBe(1)
        expect(teamRecord?.managers[0].toString()).toBe(userResponse._id.toString())
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.seasonStart.toString()).toBe(team.seasonStart.toString())
        expect(teamRecord?.seasonEnd.toString()).toBe(team.seasonEnd.toString())
        expect(teamRecord?.requestsFromPlayers.length).toBe(0)
        expect(teamRecord?.requestsToPlayers.length).toBe(0)

        expect(userRecord?.managerTeams?.length).toBe(1)
        expect(userRecord?.managerTeams?.[0].toString()).toBe(teamResponse._id.toString())
    })

    it('with requested players', async () => {
        await saveUsers()

        const team: ITeam = getTeam()
        const users = await User.find({})
        for (const u of users) {
            team.requestsToPlayers.push(u._id)
        }

        const teamResponse = await services.createTeam(team, users[0])

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requestsToPlayers.length).toBe(3)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.managerArray[0].firstName).toBe(users[0].firstName)
        expect(teamResponse.requestsToPlayerArray.length).toBe(3)
        expect(teamResponse.requestsToPlayerArray[2].firstName).toBe(users[2].firstName)

        for (const u of users) {
            const user = await User.findById(u._id)
            expect(user?.requestsFromTeams?.length).toBe(1)
            expect(user?.requestsFromTeams?.[0].toString()).toBe(teamResponse._id.toString())
        }
    })

    it('with invalid user', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        userRecord._id = anonId
        await expect(services.createTeam(getTeam(), userRecord)).rejects.toThrow()
    })
})

describe('test getTeam', () => {
    it('with valid id and non-public request', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(userRecord._id)
        teamRecord.requestsToPlayers.push(userRecord._id)
        await teamRecord.save()

        const teamResponse = await services.getTeam(teamRecord._id, false)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requestsFromPlayers.length).toBe(1)
        expect(teamResponse.requestsToPlayers.length).toBe(1)
    })

    it('with valid id and public request', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(userRecord._id)
        teamRecord.requestsToPlayers.push(userRecord._id)
        await teamRecord.save()

        const teamResponse = await services.getTeam(teamRecord._id, true)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requestsFromPlayers.length).toBe(0)
        expect(teamResponse.requestsToPlayers.length).toBe(0)
    })

    it('with invalid id', async () => {
        const team: ITeam = getTeam()

        await Team.create(team)

        await expect(services.getTeam(anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })
})

describe('test getManagedTeam', () => {
    it('with valid manager', async () => {
        const user: IUser = getUser()
        const userResponse = await User.create(user)

        const team: ITeam = getTeam()
        team.managers.push(userResponse._id)
        const teamRecord = await Team.create(team)

        const teamResponse = await services.getManagedTeam(teamRecord._id, userResponse._id)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers?.length).toBe(1)
    })

    it('with invalid manager', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const user: IUser = getUser()
        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()

        await expect(services.getManagedTeam(teamRecord._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNAUTHORIZED_TO_GET_TEAM, 401),
        )
    })
})

describe('test request roster player', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('test with valid data', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})

        teamRecord.managers.push(user1._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        const teamResult = await services.rosterPlayer(user1._id, teamRecord._id, user2._id)
        expect(teamResult).toBeDefined()
        expect(teamResult.requestsToPlayers.length).toBe(1)
        expect(teamResult.requestsToPlayers[0].toString()).toBe(user2._id.toString())

        const userData = await User.findById(user2._id)
        const teamData = await Team.findById(teamRecord._id)

        expect(userData?.requestsFromTeams).toBeDefined()
        expect(userData?.requestsFromTeams?.length).toBe(1)
        expect(userData?.requestsFromTeams?.[0].toString()).toBe(teamData?._id.toString())

        expect(teamData?.requestsToPlayers).toBeDefined()
        expect(teamData?.requestsToPlayers?.length).toBe(1)
        expect(teamData?.requestsToPlayers?.[0].toString()).toBe(userData?._id.toString())
    })

    it('with non-existent team', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})

        teamRecord.managers.push(user1._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        await expect(services.rosterPlayer(user1._id, anonId, user2._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent manager', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})

        teamRecord.managers.push(user1._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        await expect(services.rosterPlayer(anonId, teamRecord._id, user2._id)).rejects.toThrowError(
            new ApiError(Constants.UNAUTHORIZED_TO_GET_TEAM, 401),
        )
    })

    it('with non-existent player', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1] = await User.find({})

        teamRecord.managers.push(user1._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        await expect(services.rosterPlayer(user1._id, teamRecord._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with request to player already sent', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})

        teamRecord.managers.push(user1._id)
        teamRecord.requestsToPlayers.push(user2._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        await expect(services.rosterPlayer(user1._id, teamRecord._id, user2._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400),
        )
    })

    it('with player already having request', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})

        teamRecord.managers.push(user1._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()
        user2.requestsFromTeams?.push(teamRecord._id)
        await user2.save()

        await expect(services.rosterPlayer(user1._id, teamRecord._id, user2._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400),
        )
    })

    it('with team already having request from player', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})

        teamRecord.managers.push(user1._id)
        teamRecord.requestsFromPlayers.push(user2._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        await expect(services.rosterPlayer(user1._id, teamRecord._id, user2._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400),
        )
    })

    it('with player having previously sent request', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})

        teamRecord.managers.push(user1._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        user2.requestsToTeams?.push(teamRecord._id)
        await user2.save()

        await expect(services.rosterPlayer(user1._id, teamRecord._id, user2._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400),
        )
    })

    it('with player already on team', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})
        teamRecord.managers.push(user1._id)
        teamRecord.players.push(user2._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        await expect(services.rosterPlayer(user1._id, teamRecord._id, user2._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400),
        )
    })

    it('with team already in player', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const [user1, user2] = await User.find({})
        teamRecord.managers.push(user1._id)
        await teamRecord.save()
        user1.managerTeams?.push(teamRecord._id)
        await user1.save()

        user2.playerTeams?.push(teamRecord._id)
        await user2.save()

        await expect(services.rosterPlayer(user1._id, teamRecord._id, user2._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400),
        )
    })
})

describe('test respond to roster request', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('accept open request', async () => {
        const team: ITeam = getTeam()
        const [user1, user2, user3] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(user2._id)
        teamRecord.requestsFromPlayers.push(user3._id)
        teamRecord.managers.push(user1._id)
        user2.requestsToTeams?.push(teamRecord._id)
        await teamRecord.save()
        await user2.save()

        const teamResponse = await services.respondToRequest(user1._id, teamRecord._id, user2._id, true)
        expect(teamResponse.players.length).toBe(1)
        expect(teamResponse.players[0].toString()).toBe(user2._id.toString())
        expect(teamResponse.requestsFromPlayers.length).toBe(1)
        expect(teamResponse.requestsFromPlayers[0].toString()).toBe(user3._id.toString())
        expect(teamResponse.requestsToPlayers.length).toBe(0)

        const teamData = await Team.findById(teamRecord._id)
        expect(teamData?.players.length).toBe(1)
        expect(teamData?.players[0].toString()).toBe(user2._id.toString())
        expect(teamData?.requestsFromPlayers.length).toBe(1)
        expect(teamData?.requestsFromPlayers[0].toString()).toBe(user3._id.toString())
        expect(teamData?.requestsToPlayers.length).toBe(0)

        const userData = await User.findById(user2._id)
        expect(userData?.playerTeams?.length).toBe(1)
        expect(userData?.playerTeams?.[0].toString()).toBe(teamRecord._id.toString())
        expect(userData?.requestsToTeams?.length).toBe(0)
        expect(userData?.requestsFromTeams?.length).toBe(0)
    })

    it('deny open request', async () => {
        const team: ITeam = getTeam()
        const [user1, user2, user3] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(user2._id)
        teamRecord.requestsFromPlayers.push(user3._id)
        teamRecord.managers.push(user1._id)
        user2.requestsToTeams?.push(teamRecord._id)
        await teamRecord.save()
        await user2.save()

        const teamResponse = await services.respondToRequest(user1._id, teamRecord._id, user2._id, false)
        expect(teamResponse.players.length).toBe(0)
        expect(teamResponse.requestsFromPlayers.length).toBe(1)
        expect(teamResponse.requestsToPlayers.length).toBe(0)

        const teamData = await Team.findById(teamRecord._id)
        expect(teamData?.players.length).toBe(0)
        expect(teamData?.requestsFromPlayers.length).toBe(1)
        expect(teamData?.requestsFromPlayers[0].toString()).toBe(user3._id.toString())
        expect(teamData?.requestsToPlayers.length).toBe(0)

        const userData = await User.findById(user2._id)
        expect(userData?.playerTeams?.length).toBe(0)
        expect(userData?.requestsToTeams?.length).toBe(0)
        expect(userData?.requestsFromTeams?.length).toBe(0)
    })

    it('without open request', async () => {
        const team: ITeam = getTeam()
        const [user1, user2] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.managers.push(user1._id)
        await teamRecord.save()

        await expect(services.respondToRequest(user1._id, teamRecord._id, user2._id, true)).rejects.toThrowError(
            new ApiError(Constants.NO_REQUEST, 400),
        )
    })

    it('with request only on team side', async () => {
        const team: ITeam = getTeam()
        const [user1, user2] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(user2._id)
        teamRecord.managers.push(user1._id)
        await teamRecord.save()

        await expect(services.respondToRequest(user1._id, teamRecord._id, user2._id, true)).rejects.toThrowError(
            new ApiError(Constants.NO_REQUEST, 400),
        )
    })

    it('with request only on player side', async () => {
        const team: ITeam = getTeam()
        const [user1, user2] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.managers.push(user1._id)
        user2.requestsToTeams?.push(teamRecord._id)
        await teamRecord.save()
        await user2.save()

        await expect(services.respondToRequest(user1._id, teamRecord._id, user2._id, true)).rejects.toThrowError(
            new ApiError(Constants.NO_REQUEST, 400),
        )
    })

    it('when previously rostered', async () => {
        const team: ITeam = getTeam()
        const [user1, user2] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.players.push(user2._id)
        teamRecord.requestsFromPlayers.push(user2._id)
        teamRecord.managers.push(user1._id)
        user2.playerTeams?.push(teamRecord._id)
        user2.requestsToTeams?.push(teamRecord._id)
        await teamRecord.save()
        await user2.save()

        await expect(services.respondToRequest(user1._id, teamRecord._id, user2._id, true)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400),
        )
    })

    it('with invalid manager', async () => {
        const team: ITeam = getTeam()
        const [user1, user2] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(user2._id)
        user2.requestsToTeams?.push(teamRecord._id)
        await teamRecord.save()
        await user2.save()

        await expect(services.respondToRequest(user1._id, teamRecord._id, user2._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNAUTHORIZED_TO_GET_TEAM, 401),
        )
    })

    it('with non-existent team', async () => {
        const team: ITeam = getTeam()
        const [user1, user2] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(user2._id)
        teamRecord.managers.push(user1._id)
        user2.requestsToTeams?.push(teamRecord._id)
        await teamRecord.save()
        await user2.save()

        await expect(services.respondToRequest(user1._id, anonId, user2._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent user', async () => {
        const team: ITeam = getTeam()
        const [user1, user2] = await User.find({})
        const teamRecord = await Team.create(team)
        teamRecord.requestsFromPlayers.push(user2._id)
        teamRecord.managers.push(user1._id)
        user2.requestsToTeams?.push(teamRecord._id)
        await teamRecord.save()
        await user2.save()

        await expect(services.respondToRequest(user1._id, teamRecord._id, anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})
