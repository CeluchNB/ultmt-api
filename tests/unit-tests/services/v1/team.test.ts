import TeamServices from '../../../../src/services/v1/team'
import User from '../../../../src/models/user'
import Team from '../../../../src/models/team'
import OneTimePasscode from '../../../../src/models/one-time-passcode'
import RosterRequest from '../../../../src/models/roster-request'
import ArchiveTeam from '../../../../src/models/archive-team'
import TeamDesignation from '../../../../src/models/team-designation'
import { ApiError, CreateTeam, ITeam, Status, Initiator } from '../../../../src/types'
import { getCreateTeam, getTeam, getUser, anonId } from '../../../fixtures/utils'
import { setUpDatabase, saveUsers, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'
import * as Constants from '../../../../src/utils/constants'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../../src/utils/utils'
import { Types } from 'mongoose'
import MockDate from 'mockdate'

const services = new TeamServices(Team, User, RosterRequest, ArchiveTeam)

beforeAll(async () => {
    await setUpDatabase()
})

beforeEach(() => {
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
        expect(teamResponse.rosterOpen).toBe(true)

        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.name).toBe(team.name)
        expect(teamRecord?.managers.length).toBe(1)
        expect(teamRecord?.managers[0]._id.toString()).toBe(userResponse._id.toString())
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.seasonStart.getFullYear()).toBe(new Date(team.seasonStart).getFullYear())
        expect(teamRecord?.seasonEnd.getFullYear()).toBe(new Date(team.seasonEnd).getFullYear())
        expect(teamRecord?.requests.length).toBe(0)
        expect(teamRecord?.rosterOpen).toBe(true)

        expect(userRecord?.managerTeams?.length).toBe(1)
        expect(userRecord?.managerTeams?.[0]._id.toString()).toBe(teamResponse._id.toString())
    })

    it('with invalid user', async () => {
        const user = getUser()
        await User.create(user)

        await expect(services.createTeam(getCreateTeam(), anonId)).rejects.toThrow(
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

        const teamResponse = await services.getTeam(teamRecord._id.toString(), false)
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

        const teamResponse = await services.getTeam(teamRecord._id.toString(), true)
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(0)
    })

    it('with invalid id', async () => {
        const team: ITeam = getTeam()

        await Team.create(team)

        await expect(services.getTeam(anonId, true)).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404))
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

        const teamResponse = await services.getManagedTeam(teamRecord._id.toString(), userResponse._id.toHexString())
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

        await expect(services.getManagedTeam(teamRecord._id.toString(), anonId)).rejects.toThrow(
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

        const result = await services.removePlayer(
            manager._id.toHexString(),
            team._id.toHexString(),
            user._id.toHexString(),
        )
        expect(result._id.toString()).toBe(team._id.toString())
        expect(result.name).toBe(team.name)
        expect(result.players.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
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

        await expect(services.removePlayer(manager._id.toHexString(), anonId, user._id.toHexString())).rejects.toThrow(
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

        await expect(services.removePlayer(anonId, team._id.toString(), user._id.toHexString())).rejects.toThrow(
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
        team.players.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        manager.playerTeams.push(getEmbeddedTeam(team))
        const prevManagerTeam = getTeam()
        manager.archiveTeams.push(prevManagerTeam)
        await manager.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const newTeam = await services.rollover(
            manager._id.toHexString(),
            team._id.toHexString(),
            true,
            new Date('2023'),
            new Date('2023'),
        )
        expect(newTeam._id.toString()).not.toBe(team._id.toString())
        expect(newTeam.place).toBe(team.place)
        expect(newTeam.name).toBe(team.name)
        expect(newTeam.players.length).toBe(team.players.length)
        expect(newTeam.managers.length).toBe(team.managers.length)
        expect(newTeam.managers[0]._id.toString()).toBe(manager._id.toString())
        expect(newTeam.continuationId.toString()).toBe(team.continuationId.toString())
        expect(newTeam.seasonNumber).toBe(team.seasonNumber + 1)
        expect(newTeam.seasonStart).not.toEqual(team.seasonStart)
        expect(newTeam.seasonEnd).not.toEqual(team.seasonEnd)

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
        expect(archiveTeamRecord?.seasonStart).toEqual(team.seasonStart)
        expect(archiveTeamRecord?.seasonEnd).toEqual(team.seasonEnd)

        const managerRecord = await User.findById(manager._id)
        expect(managerRecord?.managerTeams.length).toBe(1)
        expect(managerRecord?.managerTeams[0]._id.toString()).toBe(newTeam._id.toString())
        expect(managerRecord?.archiveTeams.length).toBe(2)
        expect(managerRecord?.archiveTeams[0]._id.toString()).toBe(prevManagerTeam._id.toString())
        expect(managerRecord?.archiveTeams[1]._id.toString()).toBe(team._id.toString())

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(1)
        expect(userRecord?.playerTeams[0]._id.toString()).toBe(newTeam._id.toString())
        expect(userRecord?.archiveTeams.length).toBe(1)
        expect(userRecord?.archiveTeams[0]._id.toString()).toBe(team._id.toString())
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

        const newTeam = await services.rollover(
            manager._id.toHexString(),
            team._id.toHexString(),
            false,
            new Date(),
            new Date(),
        )
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

        await expect(services.rollover(anonId, team._id.toString(), true, new Date(), new Date())).rejects.toThrow(
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

        await expect(
            services.rollover(manager._id.toHexString(), anonId, true, new Date(), new Date()),
        ).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404))
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
            services.rollover(manager._id.toHexString(), team._id.toString(), true, new Date('2019'), new Date('2019')),
        ).rejects.toThrow(new ApiError(Constants.SEASON_START_ERROR, 400))
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

        const newTeam = await services.rollover(
            manager._id.toHexString(),
            team._id.toHexString(),
            true,
            new Date(),
            new Date(),
        )
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

        const newTeam = await services.rollover(
            manager._id.toHexString(),
            team._id.toHexString(),
            true,
            new Date(),
            new Date(),
        )
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

        const response = await services.setRosterOpen(manager._id.toHexString(), team._id.toHexString(), true)
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

        const response = await services.setRosterOpen(manager._id.toHexString(), team._id.toHexString(), false)
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

        await expect(services.setRosterOpen(anonId, team._id.toString(), true)).rejects.toThrow(
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

        await expect(services.setRosterOpen(manager._id.toHexString(), anonId, true)).rejects.toThrow(
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
        const resultPit = await services.search('Pit', true)
        expect(resultPit.length).toBe(2)

        const resultBet = await services.search('bet', true)
        expect(resultBet.length).toBe(1)
    })

    it('search by partial name', async () => {
        const resultTem = await services.search('Tem', true)
        expect(resultTem.length).toBe(1)

        const resultWat = await services.search('Wat', true)
        expect(resultWat.length).toBe(1)
    })

    it('search by full place', async () => {
        const resultPittsburgh = await services.search('Pittsburgh', true)
        expect(resultPittsburgh.length).toBe(2)

        const resultBethesda = await services.search('Bethesda', true)
        expect(resultBethesda.length).toBe(1)
    })

    it('search by full name', async () => {
        const resultTemper = await services.search('Temper', true)
        expect(resultTemper.length).toBe(1)

        const resultWatchdogs = await services.search('Watchdogs', true)
        expect(resultWatchdogs.length).toBe(1)
    })

    it('search by full name and place', async () => {
        const resultTemper = await services.search('Pittsburgh Temper', true)
        expect(resultTemper.length).toBe(2)
        expect(resultTemper[0].name).toBe('Temper')
        expect(resultTemper[1].name).toBe('Crucible')

        const resultWatchdogs = await services.search('Bethesda Watchdogs', true)
        expect(resultWatchdogs.length).toBe(1)
    })

    it('search by partial teamname', async () => {
        const resultPgh = await services.search('pgh', true)
        expect(resultPgh.length).toBe(2)
        expect(resultPgh[0].teamname).toBe('pghtemper')
        expect(resultPgh[1].teamname).toBe('pghcrucible')
    })

    it('search by full teamname', async () => {
        const resultWatchdogs = await services.search('bethesdawatchdogs', true)
        expect(resultWatchdogs.length).toBe(1)
        expect(resultWatchdogs[0].teamname).toBe('bethesdawatchdogs')
    })

    it('search for very complex name', async () => {
        const team = getTeam()
        team.place = 'Los Angeles'
        team.name = 'Spider Monkeys'
        team.rosterOpen = true
        await Team.create(team)

        const result = await services.search('Los Angeles Spider Monkeys', true)
        expect(result.length).toBe(1)
        expect(result[0].place).toBe('Los Angeles')
        expect(result[0].name).toBe('Spider Monkeys')

        const weirdResult = await services.search('Los Pittsburgh Crucible', true)
        expect(weirdResult.length).toBe(3)
        expect(weirdResult[0].name).toBe('Crucible')
        expect(weirdResult[1].name).toBe('Temper')
        expect(weirdResult[2].name).toBe('Spider Monkeys')
    })

    it('search for open team with closed roster team in db', async () => {
        const team = getTeam()
        team.place = 'Los Angeles'
        team.name = 'Spider Monkeys'
        await Team.create(team)

        const result = await services.search('Los Angeles Spider Monkeys', true)
        expect(result.length).toBe(0)
    })

    it('search for closed roster team', async () => {
        const team = getTeam()
        team.place = 'Los Angeles'
        team.name = 'Spider Monkeys'
        await Team.create(team)

        const result = await services.search('Los Angeles Spider Monkeys', false)
        expect(result.length).toBe(1)
        expect(result[0].place).toBe(team.place)
        expect(result[0].name).toBe(team.name)
    })

    it('search for team without regard for roster status', async () => {
        const [team1] = await Team.find({})
        team1.rosterOpen = false
        await team1.save()

        const result = await services.search('Pittsburgh')
        expect(result.length).toBe(2)
        expect(result[0].place).toBe('Pittsburgh')
        expect(result[0].name).toBe('Temper')

        expect(result[1].place).toBe('Pittsburgh')
        expect(result[1].name).toBe('Crucible')
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

        const resultTeam = await services.addManager(
            manager._id.toHexString(),
            newManager._id.toHexString(),
            team._id.toHexString(),
        )

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
        newManager.openToRequests = false
        await newManager.save()

        await expect(
            services.addManager(manager._id.toHexString(), newManager._id.toHexString(), team._id.toHexString()),
        ).rejects.toThrow(Constants.NOT_ACCEPTING_REQUESTS)
    })

    it('should fail if team not found', async () => {
        const team = await Team.create(getTeam())
        const [manager, newManager] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(
            services.addManager(manager._id.toHexString(), newManager._id.toHexString(), anonId),
        ).rejects.toThrow(Constants.UNABLE_TO_FIND_TEAM)
    })

    it('should fail if new manager not found', async () => {
        const team = await Team.create(getTeam())
        const [manager] = await User.find({})
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.addManager(manager._id.toHexString(), anonId, team._id.toHexString())).rejects.toThrow(
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

        expect(services.getArchivedTeam(anonId)).rejects.toThrow(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test create otp for bulk join', () => {
    it('with valid data', async () => {
        MockDate.set(new Date('2022-12-31'))
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        const result = await services.createBulkJoinCode(managerRecord._id.toHexString(), teamRecord._id.toString())
        expect(result.length).toBe(6)
        expect(Number(result)).not.toBeNaN()

        const otp = await OneTimePasscode.findOne({ passcode: result })
        expect(otp?.team.toString()).toEqual(teamRecord._id.toString())
        const time = otp?.expiresAt.getTime() || 0
        expect(Math.abs(time - new Date().getTime() - 24 * 60 * 60 * 1000)).toBeLessThan(100)
    })

    it('with non-existent team', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        expect(services.createBulkJoinCode(managerRecord._id.toHexString(), anonId)).rejects.toThrow(
            Constants.UNABLE_TO_FIND_TEAM,
        )
    })

    it('with non-existent manager', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        expect(services.createBulkJoinCode(anonId, teamRecord._id.toHexString())).rejects.toThrow(
            Constants.UNABLE_TO_FIND_USER,
        )
    })
})

describe('test change designation', () => {
    it('with valid data', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        const designation = await TeamDesignation.create({
            description: 'Test Description',
            abbreviation: 'TD',
        })

        const result = await services.changeDesignation(
            managerRecord._id.toHexString(),
            teamRecord._id.toHexString(),
            designation._id.toHexString(),
        )

        expect(result.designation?.toHexString()).toBe(designation._id.toHexString())

        const teamResult = await Team.findById(teamRecord._id)
        expect(teamResult?.designation?.toHexString()).toBe(designation._id.toHexString())
    })

    it('with non-existent team', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        expect(
            services.changeDesignation(managerRecord._id.toHexString(), anonId, new Types.ObjectId().toHexString()),
        ).rejects.toThrow(Constants.UNABLE_TO_FIND_TEAM)
    })

    it('with non-existent manager', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        expect(
            services.changeDesignation(anonId, teamRecord._id.toString(), new Types.ObjectId().toHexString()),
        ).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })
})

describe('test delete team', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('successfully deletes team', async () => {
        const team = await Team.create(getTeam())
        const [manager, playerOne, playerTwo] = await User.find({})

        team.players = [getEmbeddedUser(playerOne), getEmbeddedUser(playerTwo)]
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.playerTeams.push(getEmbeddedTeam(team))
        await playerTwo.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await services.deleteTeam(manager._id.toHexString(), team._id.toHexString())

        const [managerResult, playerOneResult, playerTwoResult] = await User.find({})
        expect(managerResult.managerTeams.length).toBe(0)
        expect(playerOneResult.playerTeams.length).toBe(0)
        expect(playerTwoResult.playerTeams.length).toBe(0)

        const teams = await Team.find()
        expect(teams.length).toBe(0)
    })

    it('handles unfound team error', async () => {
        await Team.create(getTeam())
        const [manager] = await User.find({})

        await expect(services.deleteTeam(manager._id.toHexString(), anonId)).rejects.toThrow(
            Constants.UNABLE_TO_FIND_TEAM,
        )
    })

    it('handles unfound manager error', async () => {
        const team = await Team.create(getTeam())

        await expect(services.deleteTeam(anonId, team._id.toHexString())).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })

    it('handles not last manager error', async () => {
        const team = await Team.create(getTeam())
        const [managerOne, managerTwo] = await User.find({})

        team.managers.push(getEmbeddedUser(managerOne), getEmbeddedUser(managerTwo))
        await team.save()

        managerOne.managerTeams.push(getEmbeddedTeam(team))
        await managerOne.save()

        managerTwo.managerTeams.push(getEmbeddedTeam(team))
        await managerTwo.save()

        await expect(services.deleteTeam(managerOne._id.toHexString(), team._id.toHexString())).rejects.toThrow(
            Constants.UNAUTHORIZED_MANAGER,
        )

        const teamResults = await Team.find()
        expect(teamResults.length).toBe(1)
    })
})

describe('test archive team', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('handles success', async () => {
        const team = await Team.create(getTeam())
        const [manager, playerOne, playerTwo] = await User.find({})

        const req1 = await RosterRequest.create({
            team: team._id,
            user: playerTwo._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        })

        const req2 = await RosterRequest.create({
            team: team._id,
            user: anonId,
            requestSource: Initiator.Player,
            status: Status.Pending,
        })

        team.players = [getEmbeddedUser(playerOne)]
        team.managers.push(getEmbeddedUser(manager))
        team.requests.push(req1._id, new Types.ObjectId(), req2._id)
        await team.save()

        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.requests.push(req1._id)
        await playerTwo.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const result = await services.archiveTeam(manager._id.toHexString(), team._id.toHexString())

        const archiveTeamResult = getEmbeddedTeam(result)

        const [managerRecord, playerOneRecord, playerTwoRecord] = await User.find({})
        expect(managerRecord.managerTeams.length).toBe(0)
        expect(managerRecord.archiveTeams[0]).toMatchObject(archiveTeamResult)

        expect(playerOneRecord.playerTeams.length).toBe(0)
        expect(playerOneRecord.archiveTeams[0]).toMatchObject(archiveTeamResult)

        expect(playerTwoRecord.playerTeams.length).toBe(0)
        expect(playerTwoRecord.archiveTeams.length).toBe(0)
        expect(playerTwoRecord.requests.length).toBe(0)

        const archiveTeamRecord = await ArchiveTeam.findOne({})
        expect(archiveTeamRecord).toMatchObject(archiveTeamResult)
        expect(archiveTeamRecord?.requests.length).toBe(0)

        const teamRecords = await Team.find()
        expect(teamRecords.length).toBe(0)

        const requestRecords = await RosterRequest.find()
        expect(requestRecords.length).toBe(1)
    })

    it('handles unfound team', async () => {
        const team = await Team.create(getTeam())
        const [manager, playerOne, playerTwo] = await User.find({})

        team.players = [getEmbeddedUser(playerOne), getEmbeddedUser(playerTwo)]
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.playerTeams.push(getEmbeddedTeam(team))
        await playerTwo.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.archiveTeam(manager._id.toHexString(), anonId)).rejects.toThrow(
            Constants.UNABLE_TO_FIND_TEAM,
        )
    })

    it('handles unfound manager', async () => {
        const team = await Team.create(getTeam())
        const [manager, playerOne, playerTwo] = await User.find({})

        team.players = [getEmbeddedUser(playerOne), getEmbeddedUser(playerTwo)]
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.playerTeams.push(getEmbeddedTeam(team))
        await playerTwo.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.archiveTeam(anonId, team._id.toHexString())).rejects.toThrow(
            Constants.UNABLE_TO_FIND_USER,
        )
    })

    describe('test teamname taken', () => {
        it('with taken teamname', async () => {
            const team = await Team.create(getTeam())

            const result = await services.teamnameTaken(team.teamname)
            expect(result).toBe(true)
        })

        it('with free teamname', async () => {
            const team = await Team.create(getTeam())

            const result = await services.teamnameTaken(`${team.teamname}7582574`)
            expect(result).toBe(false)
        })

        it('with missing teamname', async () => {
            await expect(services.teamnameTaken()).rejects.toThrow(Constants.DUPLICATE_TEAM_NAME)
        })

        it('with invalid teamname', async () => {
            await expect(services.teamnameTaken('a')).rejects.toThrow(Constants.DUPLICATE_TEAM_NAME)
        })
    })
})

describe('test add guest', () => {
    const createGuest = {
        firstName: 'guest',
        lastName: 'guest',
    }

    it('creates a guest user', async () => {
        const team = await Team.create(getTeam())
        const manager = await User.create(getUser())
        await team.updateOne({ $push: { managers: [getEmbeddedUser(manager)] } })
        await manager.updateOne({ $push: { managerTeams: [getEmbeddedTeam(team)] } })

        const result = await services.addGuest(team._id.toHexString(), manager._id.toHexString(), createGuest)
        expect(result._id.toHexString()).toBe(team._id.toHexString())
        expect(result.players.length).toBe(1)
        expect(result.players[0]).toMatchObject({ firstName: 'guest', lastName: 'guest' })

        const teamResult = await Team.findOne()
        expect(teamResult?.players[0].firstName).toBe('guest')
        expect(teamResult?.players[0].lastName).toBe('guest')

        const userResult = await User.findById(result.players[0]._id)
        expect(userResult).toMatchObject({
            firstName: 'guest',
            lastName: 'guest',
            playerTeams: [getEmbeddedTeam(team)],
            guest: true,
        })
        expect(userResult?.username).toContain('guest')
    })

    it('fails with unfound team', async () => {
        await expect(services.addGuest(new Types.ObjectId().toHexString(), '', createGuest)).rejects.toThrow(
            Constants.UNABLE_TO_FIND_TEAM,
        )
    })

    it('fails with unfound manager', async () => {
        const team = await Team.create(getTeam())
        await expect(
            services.addGuest(team._id.toHexString(), new Types.ObjectId().toHexString(), createGuest),
        ).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })

    it('with non-manager', async () => {
        const team = await Team.create(getTeam())
        const user = await User.create(getUser())
        await expect(services.addGuest(team._id.toHexString(), user._id.toHexString(), createGuest)).rejects.toThrow(
            Constants.UNAUTHORIZED_MANAGER,
        )
    })
})
