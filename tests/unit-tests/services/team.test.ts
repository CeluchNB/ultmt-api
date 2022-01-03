import TeamServices from '../../../src/services/team'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import ArchiveTeam from '../../../src/models/archive-team'
import { ApiError, ITeam, IUser } from '../../../src/types'
import { getTeam, getUser, anonId } from '../../fixtures/utils'
import { setUpDatabase, saveUsers, tearDownDatabase, resetDatabase } from '../../fixtures/setup-db'
import * as Constants from '../../../src/utils/constants'

const services = new TeamServices(Team, User, ArchiveTeam)

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
        expect(teamResponse.requests.length).toBe(0)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.playerArray).toBeUndefined()

        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.name).toBe(team.name)
        expect(teamRecord?.managers.length).toBe(1)
        expect(teamRecord?.managers[0].toString()).toBe(userResponse._id.toString())
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.seasonStart.toString()).toBe(team.seasonStart.toString())
        expect(teamRecord?.seasonEnd.toString()).toBe(team.seasonEnd.toString())
        expect(teamRecord?.requests.length).toBe(0)

        expect(userRecord?.managerTeams?.length).toBe(1)
        expect(userRecord?.managerTeams?.[0].toString()).toBe(teamResponse._id.toString())
    })

    it('with requested players', async () => {
        await saveUsers()

        const team: ITeam = getTeam()
        const users = await User.find({})
        // TODO: Make these use real request objects
        for (const u of users) {
            team.requests.push(u._id)
        }

        const teamResponse = await services.createTeam(team, users[0])

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(3)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.managerArray[0].firstName).toBe(users[0].firstName)

        for (const u of users) {
            const user = await User.findById(u._id)
            expect(user?.requests.length).toBe(1)
            expect(user?.requests[0].toString()).toBe(teamResponse._id.toString())
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
        // TODO: Fix to be real roster request ID
        teamRecord.requests.push(userRecord._id)
        await teamRecord.save()

        const teamResponse = await services.getTeam(teamRecord._id, false)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(1)
    })

    it('with valid id and public request', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const teamRecord = await Team.create(team)
        // TODO: fix to be real roster request ID
        teamRecord.requests.push(userRecord._id)
        await teamRecord.save()

        const teamResponse = await services.getTeam(teamRecord._id, true)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(0)
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

        userResponse.managerTeams.push(teamRecord._id)
        await userResponse.save()

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
            new ApiError(Constants.UNAUTHORIZED_MANAGER, 401),
        )
    })
})

describe('test remove player', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})

        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        user.playerTeams.push(team._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const result = await services.removePlayer(manager._id, team._id, user._id)
        expect(result._id.toString()).toBe(team._id.toString())
        expect(result.name).toBe(team.name)
        expect(result.players.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
    })

    it('with non-existent user', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})

        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        user.playerTeams.push(team._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        await expect(services.removePlayer(manager._id, team._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})

        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        user.playerTeams.push(team._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        await expect(services.removePlayer(manager._id, anonId, user._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent manager', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})

        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        user.playerTeams.push(team._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        await expect(services.removePlayer(anonId, team._id, user._id)).rejects.toThrowError(
            new ApiError(Constants.UNAUTHORIZED_MANAGER, 400),
        )
    })
})

describe('test team rollover', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data and copy players', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()
        user.playerTeams.push(team._id)
        await user.save()

        const newTeam = await services.rollover(manager._id, team._id, true, new Date(), new Date())
        expect(newTeam._id.toString()).not.toBe(team._id.toString())
        expect(newTeam.place).toBe(team.place)
        expect(newTeam.name).toBe(team.name)
        expect(newTeam.players.length).toBe(team.players.length)
        expect(newTeam.managers.length).toBe(team.managers.length)
        expect(newTeam.managers[0].toString()).toBe(manager._id.toString())
        expect(newTeam.continuationId.toString()).toBe(team.continuationId.toString())
        expect(newTeam.seasonNumber).toBe(team.seasonNumber + 1)

        const oldTeamRecord = await Team.findById(team._id)
        expect(oldTeamRecord).toBeNull()

        const archiveTeamRecord = await ArchiveTeam.findById(team._id)
        expect(archiveTeamRecord?._id.toString()).toBe(team._id.toString())
        expect(archiveTeamRecord?._id.toString()).not.toBe(newTeam._id.toString())
        expect(archiveTeamRecord?.place).toBe(team.place)
        expect(archiveTeamRecord?.name).toBe(team.name)
        expect(archiveTeamRecord?.players.length).toBe(team.players.length)
        expect(archiveTeamRecord?.managers.length).toBe(team.managers.length)
        expect(archiveTeamRecord?.managers[0].toString()).toBe(manager._id.toString())
        expect(archiveTeamRecord?.continuationId.toString()).toBe(team.continuationId.toString())
        expect(archiveTeamRecord?.seasonNumber).toBe(team.seasonNumber)

        const managerRecord = await User.findById(manager._id)
        expect(managerRecord?.managerTeams.length).toBe(1)
        expect(managerRecord?.managerTeams[0].toString()).toBe(newTeam._id.toString())

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(1)
        expect(userRecord?.playerTeams[0].toString()).toBe(newTeam._id.toString())
    })

    it('with valid data and not copy players', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()
        user.playerTeams.push(team._id)
        await user.save()

        const newTeam = await services.rollover(manager._id, team._id, false, new Date(), new Date())
        expect(newTeam._id.toString()).not.toBe(team._id.toString())
        expect(newTeam.place).toBe(team.place)
        expect(newTeam.name).toBe(team.name)
        expect(newTeam.players.length).toBe(0)
        expect(newTeam.managers.length).toBe(team.managers.length)
        expect(newTeam.managers[0].toString()).toBe(manager._id.toString())
        expect(newTeam.continuationId.toString()).toBe(team.continuationId.toString())
        expect(newTeam.seasonNumber).toBe(team.seasonNumber + 1)

        const oldTeamRecord = await Team.findById(team._id)
        expect(oldTeamRecord).toBeNull()

        const archiveTeamRecord = await ArchiveTeam.findById(team._id)
        expect(archiveTeamRecord?._id.toString()).toBe(team._id.toString())
        expect(archiveTeamRecord?._id.toString()).not.toBe(newTeam._id.toString())
        expect(archiveTeamRecord?.place).toBe(team.place)
        expect(archiveTeamRecord?.name).toBe(team.name)
        expect(archiveTeamRecord?.players.length).toBe(team.players.length)
        expect(archiveTeamRecord?.managers.length).toBe(team.managers.length)
        expect(archiveTeamRecord?.managers[0].toString()).toBe(manager._id.toString())
        expect(archiveTeamRecord?.continuationId.toString()).toBe(team.continuationId.toString())
        expect(archiveTeamRecord?.seasonNumber).toBe(team.seasonNumber)

        const managerRecord = await User.findById(manager._id)
        expect(managerRecord?.managerTeams.length).toBe(1)
        expect(managerRecord?.managerTeams[0].toString()).toBe(newTeam._id.toString())

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
    })

    it('with invalid manager', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()
        user.playerTeams.push(team._id)
        await user.save()

        await expect(services.rollover(anonId, team._id, true, new Date(), new Date())).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with invalid team', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()
        user.playerTeams.push(team._id)
        await user.save()

        await expect(services.rollover(manager._id, anonId, true, new Date(), new Date())).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with invalid date', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()
        user.playerTeams.push(team._id)
        await user.save()

        await expect(
            services.rollover(manager._id, team._id, true, new Date('2019'), new Date('2019')),
        ).rejects.toThrowError(new ApiError(Constants.SEASON_START_ERROR, 400))
    })
})

describe('test set to open', () => {
    it('with valid open data', async () => {
        const manager = await User.create(getUser())
        const team = await Team.create(getTeam())
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        await team.save()

        const response = await services.setRosterOpen(manager._id, team._id, true)
        expect(response._id.toString()).toBe(team._id.toString())
        expect(response.place).toBe(team.place)
        expect(response.rosterOpen).toBe(true)

        const teamRecord = await Team.findById(team._id.toString())
        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.rosterOpen).toBe(true)
    })

    it('with valid close data', async () => {
        const manager = await User.create(getUser())
        const team = await Team.create(getTeam())
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        team.rosterOpen = true
        await team.save()

        const response = await services.setRosterOpen(manager._id, team._id, false)
        expect(response._id.toString()).toBe(team._id.toString())
        expect(response.place).toBe(team.place)
        expect(response.rosterOpen).toBe(false)

        const teamRecord = await Team.findById(team._id.toString())
        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.rosterOpen).toBe(false)
    })

    it('with non-existent manager', async () => {
        const manager = await User.create(getUser())
        const team = await Team.create(getTeam())
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        await team.save()

        await expect(services.setRosterOpen(anonId, team._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const manager = await User.create(getUser())
        const team = await Team.create(getTeam())
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        await team.save()

        await expect(services.setRosterOpen(manager._id, anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })
})
