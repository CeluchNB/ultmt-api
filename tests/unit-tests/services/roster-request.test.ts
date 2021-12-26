import RosterRequest from '../../../src/models/roster-request'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequestServices from '../../../src/services/roster-request'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../fixtures/setup-db'
import { getTeam, anonId } from '../../fixtures/utils'
import { ApiError, Initiator, Status } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'

const services = new RosterRequestServices(Team, User, RosterRequest)

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('test request from team', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        const request = await services.requestFromTeam(manager._id, team._id, user._id)
        expect(request.team.toString()).toBe(team._id.toString())
        expect(request.user.toString()).toBe(user._id.toString())
        expect(request.requestSource).toBe(Initiator.Team)
        expect(request.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(request._id)
        expect(requestRecord?.team.toString()).toBe(team._id.toString())
        expect(requestRecord?.user.toString()).toBe(user._id.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Team)
        expect(requestRecord?.status).toBe(Status.Pending)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(1)
        expect(userRecord?.requests[0].toString()).toBe(request._id.toString())

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(request._id.toString())
    })

    it('with non-existent manager', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        await expect(services.requestFromTeam(anonId, team._id, user._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        await expect(services.requestFromTeam(manager._id, anonId, user._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent player', async () => {
        const [manager] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        await expect(services.requestFromTeam(manager._id, team._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with unauthorized manager', async () => {
        const [manager, user1, user2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        await expect(services.requestFromTeam(user2._id, team._id, user1._id)).rejects.toThrowError(
            new ApiError(Constants.UNAUTHORIZED_MANAGER, 401),
        )
    })

    it('with player already rostered', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()

        await expect(services.requestFromTeam(manager._id, team._id, user._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400),
        )
    })
})

describe('test request from player', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request = await services.requestFromPlayer(user._id, team._id)
        expect(request.team.toString()).toBe(team._id.toString())
        expect(request.user.toString()).toBe(user._id.toString())
        expect(request.requestSource).toBe(Initiator.Player)
        expect(request.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(request._id)
        expect(requestRecord?.team.toString()).toBe(team._id.toString())
        expect(requestRecord?.user.toString()).toBe(user._id.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Player)
        expect(requestRecord?.status).toBe(Status.Pending)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(1)
        expect(userRecord?.requests[0].toString()).toBe(request._id.toString())

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(request._id.toString())
    })

    it('with non-existent user', async () => {
        const team = await Team.create(getTeam())

        await expect(services.requestFromPlayer(anonId, team._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const [user] = await User.find({})

        await expect(services.requestFromPlayer(user._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with player already on team', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        user.playerTeams.push(team._id)
        await user.save()

        await expect(services.requestFromPlayer(user._id, team._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_JOINED, 400),
        )
    })
})
