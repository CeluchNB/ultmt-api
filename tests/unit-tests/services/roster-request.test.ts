import RosterRequest from '../../../src/models/roster-request'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequestServices from '../../../src/services/roster-request'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../fixtures/setup-db'
import { getTeam, anonId, getRosterRequest } from '../../fixtures/utils'
import { ApiError, Initiator, IRosterRequest, Status } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { Types } from 'mongoose'
import { getEmbeddedTeam } from '../../../src/utils/utils'

const services = new RosterRequestServices(Team, User, RosterRequest)

beforeAll(async () => {
    await setUpDatabase()
})

beforeEach(async () => {
    await saveUsers()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('test request from team', () => {
    it('with valid data', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.openToRequests = true
        await user.save()

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
        user.openToRequests = true
        await user.save()

        await expect(services.requestFromTeam(anonId, team._id, user._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.openToRequests = true
        await user.save()

        await expect(services.requestFromTeam(manager._id, anonId, user._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent player', async () => {
        const [manager] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.requestFromTeam(manager._id, team._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with previous request', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.openToRequests = true
        await user.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        await RosterRequest.create(request)

        await expect(services.requestFromTeam(manager._id, team._id, user._id)).rejects.toThrowError(
            new ApiError(Constants.TEAM_ALREADY_REQUESTED, 400),
        )
    })

    it('with unauthorized manager', async () => {
        const [manager, user1, user2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user1.openToRequests = true
        await user1.save()

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
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.openToRequests = true
        await user.save()

        await expect(services.requestFromTeam(manager._id, team._id, user._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400),
        )
    })
})

describe('test request from player', () => {
    it('with valid data', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())
        team.rosterOpen = true
        await team.save()

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

    it('with previous request', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())
        team.rosterOpen = true
        await team.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        await RosterRequest.create(request)

        await expect(services.requestFromPlayer(user._id, team._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_REQUESTED, 400),
        )
    })

    it('with player already on team', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())
        team.rosterOpen = true
        await team.save()

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        await expect(services.requestFromPlayer(user._id, team._id)).rejects.toThrowError(
            new ApiError(Constants.PLAYER_ALREADY_ROSTERED, 400),
        )
    })
})

describe('test team respond to request', () => {
    it('accept with valid data', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        const result = await services.teamRespondToRequest(manager._id, requestRecord._id, true)
        expect(result._id.toString()).toBe(requestRecord._id.toString())
        expect(result.team.toString()).toBe(team._id.toString())
        expect(result.user.toString()).toBe(user._id.toString())
        expect(result.requestSource).toBe(Initiator.Player)
        expect(result.status).toBe(Status.Approved)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(1)
        expect(userRecord?.playerTeams[0]._id.toString()).toBe(team._id.toString())
        expect(userRecord?.requests.length).toBe(1)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(1)
        expect(teamRecord?.players[0].toString()).toBe(user._id.toString())
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('deny with valid data', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        const result = await services.teamRespondToRequest(manager._id, requestRecord._id, false)
        expect(result._id.toString()).toBe(requestRecord._id.toString())
        expect(result.team.toString()).toBe(team._id.toString())
        expect(result.user.toString()).toBe(user._id.toString())
        expect(result.requestSource).toBe(Initiator.Player)
        expect(result.status).toBe(Status.Denied)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
        expect(userRecord?.requests.length).toBe(1)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('with unauthorized manager', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.teamRespondToRequest(manager._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNAUTHORIZED_MANAGER, 401),
        )
    })

    it('with non-existent manager', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.teamRespondToRequest(anonId, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent request record', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.teamRespondToRequest(manager._id, anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404),
        )
    })

    it('with non-existent team', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: new Types.ObjectId(anonId),
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.teamRespondToRequest(manager._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent user', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: new Types.ObjectId(anonId),
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.teamRespondToRequest(manager._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with response to own request', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.teamRespondToRequest(manager._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400),
        )
    })

    it('with response to close requested', async () => {
        const [manager, user] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Approved,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.teamRespondToRequest(manager._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.REQUEST_ALREADY_RESOLVED, 400),
        )
    })
})

describe('test user respond to request', () => {
    it('accept with valid data', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        const result = await services.userRespondToRequest(user._id, requestRecord._id, true)
        expect(result._id.toString()).toBe(requestRecord._id.toString())
        expect(result.user.toString()).toBe(request.user.toString())
        expect(result.team.toString()).toBe(request.team.toString())
        expect(result.requestSource).toBe(request.requestSource)
        expect(result.status).toBe(Status.Approved)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(1)
        expect(userRecord?.playerTeams[0]._id.toString()).toBe(team._id.toString())
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(1)
        expect(teamRecord?.players[0].toString()).toBe(user._id.toString())
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(requestRecord._id.toString())
    })

    it('deny with valid data', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        const result = await services.userRespondToRequest(user._id, requestRecord._id, false)
        expect(result._id.toString()).toBe(requestRecord._id.toString())
        expect(result.user.toString()).toBe(request.user.toString())
        expect(result.team.toString()).toBe(request.team.toString())
        expect(result.requestSource).toBe(request.requestSource)
        expect(result.status).toBe(Status.Denied)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(requestRecord._id.toString())
    })

    it('with non-existent user', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.userRespondToRequest(anonId, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: new Types.ObjectId(anonId),
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.userRespondToRequest(user._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with non-existent request', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.userRespondToRequest(user._id, anonId, true)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404),
        )
    })

    it('responding to own request', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Player,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.userRespondToRequest(user._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400),
        )
    })

    it('responding to closed request', async () => {
        const [user] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Denied,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.userRespondToRequest(user._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.REQUEST_ALREADY_RESOLVED, 400),
        )
    })

    it('with user not matching request user', async () => {
        const [user, user2] = await User.find({})
        const team = await Team.create(getTeam())

        const request: IRosterRequest = {
            _id: new Types.ObjectId(),
            user: user._id,
            team: team._id,
            requestSource: Initiator.Team,
            status: Status.Pending,
        }

        const requestRecord = await RosterRequest.create(request)
        user.requests.push(requestRecord._id)
        await user.save()
        team.requests.push(requestRecord._id)
        await team.save()

        await expect(services.userRespondToRequest(user2._id, requestRecord._id, true)).rejects.toThrowError(
            new ApiError(Constants.NOT_ALLOWED_TO_RESPOND, 400),
        )
    })
})

describe('test team delete', () => {
    it('with valid data', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        const response = await services.teamDelete(manager._id, request._id)
        expect(response._id.toString()).toBe(request._id.toString())
        expect(response.team.toString()).toBe(team._id.toString())
        expect(response.user.toString()).toBe(user._id.toString())
        expect(response.requestSource).toBe(Initiator.Team)
        expect(response.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(request._id)
        expect(requestRecord).toBeNull()

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('with non-existent request', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        await expect(services.teamDelete(manager._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404),
        )
    })

    it('with request not on team', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        await expect(services.teamDelete(manager._id, request._id)).rejects.toThrowError(
            new ApiError(Constants.REQUEST_NOT_IN_LIST, 400),
        )
    })

    it('with non-existent user', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(
            getRosterRequest(team._id, new Types.ObjectId(anonId), Initiator.Team),
        )
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        await expect(services.teamDelete(manager._id, request._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(
            getRosterRequest(new Types.ObjectId(anonId), user._id, Initiator.Team),
        )
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        await expect(services.teamDelete(manager._id, request._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })
})

describe('test user delete', () => {
    it('with valid data', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        const response = await services.userDelete(user._id, request._id)
        expect(response._id.toString()).toBe(request._id.toString())
        expect(response.team.toString()).toBe(team._id.toString())
        expect(response.user.toString()).toBe(user._id.toString())
        expect(response.requestSource).toBe(Initiator.Team)
        expect(response.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(request._id)
        expect(requestRecord).toBeNull()

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('with non-existent request', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        await expect(services.userDelete(user._id, anonId)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_REQUEST, 404),
        )
    })

    it('with request not on user', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await expect(services.userDelete(user._id, request._id)).rejects.toThrowError(
            new ApiError(Constants.REQUEST_NOT_IN_LIST, 400),
        )
    })

    it('with non-existent user', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        await expect(services.userDelete(anonId, request._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const team = await Team.create(getTeam())
        const [manager, user] = await User.find({})
        const request = await RosterRequest.create(
            getRosterRequest(new Types.ObjectId(anonId), user._id, Initiator.Team),
        )
        team.managers.push(manager._id)
        team.requests.push(request._id)
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.requests.push(request._id)
        await user.save()

        await expect(services.userDelete(user._id, request._id)).rejects.toThrowError(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })
})
