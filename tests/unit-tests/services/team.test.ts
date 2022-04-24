import TeamServices from '../../../src/services/v1/team'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequest from '../../../src/models/roster-request'
import ArchiveTeam from '../../../src/models/archive-team'
import { ApiError, CreateTeam, ITeam, Status, Initiator } from '../../../src/types'
import { getCreateTeam, getTeam, getUser, anonId } from '../../fixtures/utils'
import { setUpDatabase, saveUsers, tearDownDatabase, resetDatabase } from '../../fixtures/setup-db'
import * as Constants from '../../../src/utils/constants'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'
import { Types } from 'mongoose'
import MockDate from 'mockdate'

const services = new TeamServices(Team, User, RosterRequest, ArchiveTeam)

beforeAll(async () => {
    await setUpDatabase()
    MockDate.set(new Date('2022'))
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    MockDate.reset()
    tearDownDatabase()
    done()
})

describe('test create team', () => {
    it('with minimal, valid data', async () => {
        const user = getUser()
        const userResponse = await User.create(user)

        const team: CreateTeam = getCreateTeam()
        const teamResponse = await services.createTeam(team, userResponse._id.toString())
        const teamRecord = await Team.findById(teamResponse._id)
        const userRecord = await User.findById(userResponse._id)

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
        expect(teamResponse.managers[0]._id.toString()).toBe(userResponse._id.toString())
        expect(teamResponse.players.length).toBe(0)
        expect(teamResponse.seasonStart.getFullYear()).toBe(new Date(team.seasonStart).getFullYear())
        expect(teamResponse.seasonEnd.getFullYear()).toBe(new Date(team.seasonEnd).getFullYear())
        expect(teamResponse.requests.length).toBe(0)

        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.name).toBe(team.name)
        expect(teamRecord?.managers.length).toBe(1)
        expect(teamRecord?.managers[0]._id.toString()).toBe(userResponse._id.toString())
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.seasonStart.getFullYear()).toBe(new Date(team.seasonStart).getFullYear())
        expect(teamRecord?.seasonEnd.getFullYear()).toBe(new Date(team.seasonEnd).getFullYear())
        expect(teamRecord?.requests.length).toBe(0)

        expect(userRecord?.managerTeams?.length).toBe(1)
        expect(userRecord?.managerTeams?.[0]._id.toString()).toBe(teamResponse._id.toString())
    })

    it('with invalid user', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        userRecord._id = anonId
        await expect(services.createTeam(getCreateTeam(), userRecord._id.toString())).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test getTeam', () => {
    it('with valid id and non-public request', async () => {
        const user = getUser()
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
        const user = getUser()
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
        const user = getUser()
        const userResponse = await User.create(user)

        const team: ITeam = getTeam()
        team.managers.push(getEmbeddedUser(userResponse))
        const teamRecord = await Team.create(team)

        userResponse.managerTeams.push(getEmbeddedTeam(teamRecord))
        await userResponse.save()

        const teamResponse = await services.getManagedTeam(teamRecord._id, userResponse._id)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers?.length).toBe(1)
    })

    it('with invalid manager', async () => {
        const team: ITeam = getTeam()
        const teamRecord = await Team.create(team)

        const user = getUser()
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

        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
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

        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.removePlayer(manager._id, team._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})

        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.removePlayer(manager._id, anonId, user._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent manager', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})

        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
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
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const newTeam = await services.rollover(manager._id, team._id, true, new Date(), new Date())
        expect(newTeam._id.toString()).not.toBe(team._id.toString())
        expect(newTeam.place).toBe(team.place)
        expect(newTeam.name).toBe(team.name)
        expect(newTeam.players.length).toBe(team.players.length)
        expect(newTeam.managers.length).toBe(team.managers.length)
        expect(newTeam.managers[0]._id.toString()).toBe(manager._id.toString())
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
        expect(archiveTeamRecord?.managers[0]._id.toString()).toBe(manager._id.toString())
        expect(archiveTeamRecord?.continuationId.toString()).toBe(team.continuationId.toString())
        expect(archiveTeamRecord?.seasonNumber).toBe(team.seasonNumber)

        const managerRecord = await User.findById(manager._id)
        expect(managerRecord?.managerTeams.length).toBe(1)
        expect(managerRecord?.managerTeams[0]._id.toString()).toBe(newTeam._id.toString())

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(1)
        expect(userRecord?.playerTeams[0]._id.toString()).toBe(newTeam._id.toString())
    })

    it('with valid data and not copy players', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const newTeam = await services.rollover(manager._id, team._id, false, new Date(), new Date())
        expect(newTeam._id.toString()).not.toBe(team._id.toString())
        expect(newTeam.place).toBe(team.place)
        expect(newTeam.name).toBe(team.name)
        expect(newTeam.players.length).toBe(0)
        expect(newTeam.managers.length).toBe(team.managers.length)
        expect(newTeam.managers[0]._id.toString()).toBe(manager._id.toString())
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
        expect(archiveTeamRecord?.managers[0]._id.toString()).toBe(manager._id.toString())
        expect(archiveTeamRecord?.continuationId.toString()).toBe(team.continuationId.toString())
        expect(archiveTeamRecord?.seasonNumber).toBe(team.seasonNumber)

        const managerRecord = await User.findById(manager._id)
        expect(managerRecord?.managerTeams.length).toBe(1)
        expect(managerRecord?.managerTeams[0]._id.toString()).toBe(newTeam._id.toString())

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
    })

    it('with invalid manager', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        await expect(services.rollover(anonId, team._id, true, new Date(), new Date())).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with invalid team', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        await expect(services.rollover(manager._id, anonId, true, new Date(), new Date())).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with invalid date', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        await expect(
            services.rollover(manager._id, team._id, true, new Date('2019'), new Date('2019')),
        ).rejects.toThrowError(new ApiError(Constants.SEASON_START_ERROR, 400))
    })

    it('with pending requests', async () => {
        const team = await Team.create(getTeam())
        const [manager, reqUser1, reqUser2] = await User.find({})
        const req1 = await RosterRequest.create({
            team: team._id,
            user: reqUser1._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        })
        const req2 = await RosterRequest.create({
            team: team._id,
            user: reqUser2._id,
            requestSource: Initiator.Team,
            status: Status.Approved,
        })
        team.managers.push(getEmbeddedUser(manager))
        team.requests.push(req1._id)
        team.requests.push(req2._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        reqUser1.requests.push(req1._id)
        await reqUser1.save()
        reqUser2.requests.push(req2._id)
        await reqUser2.save()

        const newTeam = await services.rollover(manager._id, team._id, true, new Date(), new Date())
        expect(newTeam.requests.length).toBe(0)
        const updatedUser1 = await User.findById(reqUser1._id)
        expect(updatedUser1?.requests.length).toBe(0)
        const updatedUser2 = await User.findById(reqUser2._id)
        expect(updatedUser2?.requests.length).toBe(0)
    })

    it('with open requests that have old data', async () => {
        const team = await Team.create(getTeam())
        const [manager, reqUser1, reqUser2] = await User.find({})
        const req1 = await RosterRequest.create({
            team: team._id,
            user: reqUser1._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        })
        const req2 = await RosterRequest.create({
            team: team._id,
            user: anonId,
            requestSource: Initiator.Team,
            status: Status.Approved,
        })
        team.managers.push(getEmbeddedUser(manager))
        team.requests.push(req1._id)
        team.requests.push(req2._id)
        team.requests.push(new Types.ObjectId())
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        reqUser1.requests.push(req1._id)
        await reqUser1.save()
        reqUser2.requests.push(req2._id)
        await reqUser2.save()

        const newTeam = await services.rollover(manager._id, team._id, true, new Date(), new Date())
        expect(newTeam.requests.length).toBe(0)
        const updatedUser1 = await User.findById(reqUser1._id)
        expect(updatedUser1?.requests.length).toBe(0)
        const updatedUser2 = await User.findById(reqUser2._id)
        expect(updatedUser2?.requests.length).toBe(1)

        const resultRequest = await RosterRequest.find({})
        expect(resultRequest?.length).toBe(1)
    })
})

describe('test set to open', () => {
    it('with valid open data', async () => {
        const manager = await User.create(getUser())
        const team = await Team.create(getTeam())
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
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
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
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
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        await expect(services.setRosterOpen(anonId, team._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const manager = await User.create(getUser())
        const team = await Team.create(getTeam())
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        await expect(services.setRosterOpen(manager._id, anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })
})

describe('text search functionality', () => {
    beforeEach(async () => {
        const team1: ITeam = getTeam()
        team1.place = 'Pittsburgh'
        team1.name = 'Temper'
        team1.teamname = 'pghtemper'
        team1.rosterOpen = true

        const team2: ITeam = getTeam()
        team2.place = 'Pittsburgh'
        team2.name = 'Crucible'
        team2.teamname = 'pghcrucible'
        team2.rosterOpen = true

        const team3: ITeam = getTeam()
        team3.place = 'Bethesda'
        team3.name = 'Watchdogs'
        team3.teamname = 'bethesdawatchdogs'
        team3.rosterOpen = true

        await Team.create(team1)
        await Team.create(team2)
        await Team.create(team3)
    })

    it('search by partial place', async () => {
        const resultPit = await services.search('Pit')
        expect(resultPit.length).toBe(2)

        const resultBet = await services.search('bet')
        expect(resultBet.length).toBe(1)
    })

    it('search by partial name', async () => {
        const resultTem = await services.search('Tem')
        expect(resultTem.length).toBe(1)

        const resultWat = await services.search('Wat')
        expect(resultWat.length).toBe(1)
    })

    it('search by full place', async () => {
        const resultPittsburgh = await services.search('Pittsburgh')
        expect(resultPittsburgh.length).toBe(2)

        const resultBethesda = await services.search('Bethesda')
        expect(resultBethesda.length).toBe(1)
    })

    it('search by full name', async () => {
        const resultTemper = await services.search('Temper')
        expect(resultTemper.length).toBe(1)

        const resultWatchdogs = await services.search('Watchdogs')
        expect(resultWatchdogs.length).toBe(1)
    })

    it('search by full name and place', async () => {
        const resultTemper = await services.search('Pittsburgh Temper')
        expect(resultTemper.length).toBe(2)
        expect(resultTemper[0].name).toBe('Temper')
        expect(resultTemper[1].name).toBe('Crucible')

        const resultWatchdogs = await services.search('Bethesda Watchdogs')
        expect(resultWatchdogs.length).toBe(1)
    })

    it('search by partial teamname', async () => {
        const resultPgh = await services.search('pgh')
        expect(resultPgh.length).toBe(2)
        expect(resultPgh[0].teamname).toBe('pghtemper')
        expect(resultPgh[1].teamname).toBe('pghcrucible')
    })

    it('search by full teamname', async () => {
        const resultWatchdogs = await services.search('bethesdawatchdogs')
        expect(resultWatchdogs.length).toBe(1)
        expect(resultWatchdogs[0].teamname).toBe('bethesdawatchdogs')
    })

    it('search for very complex name', async () => {
        const team = getTeam()
        team.place = 'Los Angeles'
        team.name = 'Spider Monkeys'
        team.rosterOpen = true
        await Team.create(team)

        const result = await services.search('Los Angeles Spider Monkeys')
        expect(result.length).toBe(1)
        expect(result[0].place).toBe('Los Angeles')
        expect(result[0].name).toBe('Spider Monkeys')

        const weirdResult = await services.search('Los Pittsburgh Crucible')
        expect(weirdResult.length).toBe(3)
        expect(weirdResult[0].name).toBe('Crucible')
        expect(weirdResult[1].name).toBe('Temper')
        expect(weirdResult[2].name).toBe('Spider Monkeys')
    })

    it('search for closed roster team', async () => {
        const team = getTeam()
        team.place = 'Los Angeles'
        team.name = 'Spider Monkeys'
        await Team.create(team)

        const result = await services.search('Los Angeles Spider Monkeys')
        expect(result.length).toBe(0)
    })
})

describe('test add manager functionality', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('should add manager with expected data', async () => {
        const team = await Team.create(getTeam())
        const [manager, newManager] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        newManager.openToRequests = true
        await newManager.save()

        const resultTeam = await services.addManager(manager._id, newManager._id, team._id)

        expect(resultTeam.managers.length).toBe(2)
        expect(resultTeam.managers[1].username).toBe(newManager.username)

        const resultManager = await User.findById(newManager._id)

        expect(resultManager?.managerTeams.length).toBe(1)
        expect(resultManager?.managerTeams[0].teamname).toBe(team.teamname)
    })

    it('should fail if new manager not accepting requests', async () => {
        const team = await Team.create(getTeam())
        const [manager, newManager] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.addManager(manager._id, newManager._id, team._id)).rejects.toThrowError(
            Constants.NOT_ACCEPTING_REQUESTS,
        )
    })

    it('should fail if team not found', async () => {
        const team = await Team.create(getTeam())
        const [manager, newManager] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.addManager(manager._id, newManager._id, anonId)).rejects.toThrowError(
            Constants.UNABLE_TO_FIND_TEAM,
        )
    })

    it('should fail if new manager not found', async () => {
        const team = await Team.create(getTeam())
        const [manager] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.addManager(manager._id, anonId, team._id)).rejects.toThrowError(
            Constants.UNABLE_TO_FIND_USER,
        )
    })
})

describe('test get archived team', () => {
    it('with existing team', async () => {
        const team = getTeam()
        const teamRecord = await ArchiveTeam.create(team)

        const result = await services.getArchivedTeam(teamRecord._id.toString())
        expect(result._id.toString()).toBe(teamRecord._id.toString())
        expect(result.place).toBe(team.place)
        expect(result.name).toBe(team.name)
        expect(result.teamname).toBe(team.teamname)
    })

    it('with non-existing team', async () => {
        const team = getTeam()
        await ArchiveTeam.create(team)

        expect(services.getArchivedTeam(anonId)).rejects.toThrowError(Constants.UNABLE_TO_FIND_TEAM)
    })
})
